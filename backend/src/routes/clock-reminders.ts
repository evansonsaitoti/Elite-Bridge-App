import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ensureClockReminderTables, defaultClockReminderSettings, processClockReminders } from "../services/clock-reminders";

const router = Router();
const settingsSchema = z.object({
  preShiftEnabled: z.boolean(),
  preShiftMinutes: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60), z.literal(120), z.literal(240), z.literal(480), z.literal(720), z.literal(1440)]),
  lateAlertEnabled: z.boolean(),
  lateGraceMinutes: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(30)]),
  notifyEmployer: z.boolean(),
});

function cronAuthorized(value: unknown) {
  const secret = process.env.CRON_SECRET || "";
  const supplied = String(value || "").replace(/^Bearer\s+/i, "");
  if (!secret || !supplied || secret.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied));
}

router.get("/run", async (req, res, next) => {
  if (!process.env.CRON_SECRET) {
    res.status(503).json({ message: "Clock reminder processor is not configured." });
    return;
  }
  if (!cronAuthorized(req.headers.authorization)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    await ensureCoreTables();
    const result = await processClockReminders();
    res.json({ ok: true, ...result });
  } catch (error) { next(error); }
});

router.use(authMiddleware);
router.get("/settings", async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    await ensureClockReminderTables();
    if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
    const employer = (await db.execute(sql`SELECT id FROM employers WHERE user_id = ${req.user.id} LIMIT 1`) as any).rows[0];
    if (!employer) throw new AppError(404, "Employer workspace not found");
    const row = (await db.execute(sql`SELECT * FROM clock_reminder_settings WHERE employer_id = ${employer.id}`) as any).rows[0];
    res.json({ settings: row ? {
      preShiftEnabled: row.pre_shift_enabled,
      preShiftMinutes: Number(row.pre_shift_minutes),
      lateAlertEnabled: row.late_alert_enabled,
      lateGraceMinutes: Number(row.late_grace_minutes),
      notifyEmployer: row.notify_employer,
    } : defaultClockReminderSettings });
  } catch (error) { next(error); }
});

router.put("/settings", async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    await ensureClockReminderTables();
    if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
    const employer = (await db.execute(sql`SELECT id FROM employers WHERE user_id = ${req.user.id} LIMIT 1`) as any).rows[0];
    if (!employer) throw new AppError(404, "Employer workspace not found");
    const input = settingsSchema.parse(req.body);
    await db.execute(sql`INSERT INTO clock_reminder_settings
      (employer_id, pre_shift_enabled, pre_shift_minutes, late_alert_enabled, late_grace_minutes, notify_employer, updated_at)
      VALUES (${employer.id}, ${input.preShiftEnabled}, ${input.preShiftMinutes}, ${input.lateAlertEnabled}, ${input.lateGraceMinutes}, ${input.notifyEmployer}, CURRENT_TIMESTAMP)
      ON CONFLICT (employer_id) DO UPDATE SET
        pre_shift_enabled=EXCLUDED.pre_shift_enabled,
        pre_shift_minutes=EXCLUDED.pre_shift_minutes,
        late_alert_enabled=EXCLUDED.late_alert_enabled,
        late_grace_minutes=EXCLUDED.late_grace_minutes,
        notify_employer=EXCLUDED.notify_employer,
        updated_at=CURRENT_TIMESTAMP`);
    res.json({ settings: input });
  } catch (error) { next(error); }
});

export default router;
