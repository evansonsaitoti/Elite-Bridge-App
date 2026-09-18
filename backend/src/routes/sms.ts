import { Router } from "express";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { validateRequest } from "twilio";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { config } from "../config/env";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ensureSms, sendSms, smsReady } from "../services/sms";
const router = Router();
const codeHash = (userId: number, phone: string, code: string) =>
  createHmac("sha256", config.JWT_SECRET)
    .update(`${userId}:${phone}:${code}`)
    .digest("hex");
router.post(["/inbound", "/status"], async (req, res, next) => {
  try {
    const base = process.env.SMS_WEBHOOK_BASE_URL?.replace(/\/$/, "");
    if (
      !base ||
      !config.TWILIO_AUTH_TOKEN ||
      !validateRequest(
        config.TWILIO_AUTH_TOKEN,
        String(req.headers["x-twilio-signature"] || ""),
        `${base}/api/sms${req.path}`,
        req.body,
      )
    )
      throw new AppError(403, "Invalid provider signature");
    await ensureCoreTables();
    await ensureSms();
    if (req.path === "/inbound") {
      const command = String(req.body.Body || "")
        .trim()
        .toUpperCase();
      if (
        [
          "STOP",
          "STOPALL",
          "UNSUBSCRIBE",
          "CANCEL",
          "END",
          "QUIT",
          "REVOKE",
          "OPTOUT",
        ].includes(command) ||
        req.body.OptOutType === "STOP"
      ) {
        await db.execute(
          sql`UPDATE sms_preferences SET opted_in=false WHERE phone=${String(req.body.From || "")}`,
        );
      }
      res.type("text/xml").send("<Response></Response>");
    } else {
      const data = z
        .object({
          MessageSid: z.string().max(100),
          MessageStatus: z.enum([
            "queued",
            "sending",
            "sent",
            "delivered",
            "undelivered",
            "failed",
            "read",
          ]),
          ErrorCode: z.string().max(30).optional(),
        })
        .parse(req.body);
      await db.execute(
        sql`UPDATE sms_deliveries SET status=${data.MessageStatus},error_code=${data.ErrorCode || null},updated_at=CURRENT_TIMESTAMP WHERE provider_id=${data.MessageSid} AND status NOT IN ('delivered','read','failed','undelivered')`,
      );
      res.sendStatus(204);
    }
  } catch (e) {
    next(e);
  }
});
router.use(authMiddleware);
router.use(async (_req, _res, next) => {
  try {
    await ensureCoreTables();
    await ensureSms();
    next();
  } catch (e) {
    next(e);
  }
});
router.get("/preferences", async (req: AuthRequest, res, next) => {
  try {
    const preference =
      (
        (await db.execute(
          sql`SELECT phone,verified,opted_in,consent_at FROM sms_preferences WHERE user_id=${req.user!.id}`,
        )) as any
      ).rows[0] || null;
    const deliveries = (
      (await db.execute(
        sql`SELECT id,status,error_code,created_at FROM sms_deliveries WHERE user_id=${req.user!.id} ORDER BY id DESC LIMIT 20`,
      )) as any
    ).rows;
    res.json({ configured: smsReady(), preference, deliveries });
  } catch (e) {
    next(e);
  }
});
router.post("/verify/start", async (req: AuthRequest, res, next) => {
  try {
    if (!smsReady())
      throw new AppError(
        503,
        "SMS activation is pending. Email and in-app notifications remain available.",
      );
    const { phone } = z
      .object({ phone: z.string().regex(/^\+[1-9]\d{7,14}$/) })
      .parse(req.body);
    const code = String(randomInt(100000, 1000000));
    await db.transaction(async (tx) => {
      // Serialize account and destination attempts, including initial requests.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${phone}))`);
      await tx.execute(
        sql`SELECT id FROM users WHERE id=${req.user!.id} FOR UPDATE`,
      );
      const recent = (
        (await tx.execute(
          sql`SELECT user_id FROM sms_preferences WHERE (user_id=${req.user!.id} OR phone=${phone}) AND requested_at>CURRENT_TIMESTAMP-INTERVAL '10 minutes'`,
        )) as any
      ).rows;
      if (recent.length)
        throw new AppError(
          429,
          "Wait ten minutes before requesting another verification code",
        );
      const taken = (
        (await tx.execute(
          sql`SELECT user_id FROM sms_preferences WHERE phone=${phone} AND verified=true AND user_id<>${req.user!.id}`,
        )) as any
      ).rows;
      if (taken.length)
        throw new AppError(
          409,
          "This phone number is already linked to another account",
        );
      await tx.execute(
        sql`INSERT INTO sms_preferences(user_id,phone,code_hash,code_expires) VALUES (${req.user!.id},${phone},${codeHash(req.user!.id, phone, code)},CURRENT_TIMESTAMP+INTERVAL '10 minutes') ON CONFLICT(user_id) DO UPDATE SET phone=EXCLUDED.phone,verified=false,opted_in=false,code_hash=EXCLUDED.code_hash,code_expires=EXCLUDED.code_expires,attempts=0,requested_at=CURRENT_TIMESTAMP`,
      );
    });
    try {
      await sendSms(
        phone,
        `Elite Bridge verification code: ${code}. Expires in 10 minutes. Reply STOP to opt out.`,
      );
    } catch {
      throw new AppError(
        502,
        "Verification text could not be confirmed. Wait ten minutes before trying again.",
      );
    }
    res.json({
      message: "Verification code submitted. Delivery may take a moment.",
    });
  } catch (e) {
    next(e);
  }
});
router.post("/verify/complete", async (req: AuthRequest, res, next) => {
  try {
    const { code, consent } = z
      .object({ code: z.string().regex(/^\d{6}$/), consent: z.literal(true) })
      .parse(req.body);
    const valid = await db.transaction(async (tx) => {
      const pref = (
        (await tx.execute(
          sql`SELECT * FROM sms_preferences WHERE user_id=${req.user!.id} FOR UPDATE`,
        )) as any
      ).rows[0];
      if (
        !pref?.code_hash ||
        pref.attempts >= 5 ||
        new Date(pref.code_expires).getTime() < Date.now()
      )
        return false;
      await tx.execute(
        sql`UPDATE sms_preferences SET attempts=attempts+1 WHERE user_id=${req.user!.id}`,
      );
      if (
        !timingSafeEqual(
          Buffer.from(pref.code_hash),
          Buffer.from(codeHash(req.user!.id, pref.phone, code)),
        )
      )
        return false;
      await tx.execute(
        sql`UPDATE sms_preferences SET verified=true,opted_in=${consent},consent_at=CURRENT_TIMESTAMP,consent_version='shift-alerts-v1',code_hash=NULL WHERE user_id=${req.user!.id}`,
      );
      return true;
    });
    if (!valid) throw new AppError(400, "Invalid or expired code");
    res.json({ message: "Phone verified. Shift SMS alerts are enabled." });
  } catch (e) {
    next(e);
  }
});
router.delete("/preferences", async (req: AuthRequest, res, next) => {
  try {
    await db.execute(
      sql`UPDATE sms_preferences SET opted_in=false,code_hash=NULL WHERE user_id=${req.user!.id}`,
    );
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
});
export default router;
