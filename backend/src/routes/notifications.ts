import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { ensureNotificationPreferences } from "../services/shift-email";

const router = Router();
const deviceSchema = z.object({
  token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/),
  platform: z.enum(["ios", "android"]),
  app: z.enum(["caregiver", "employer"]),
});

router.get("/preferences", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    await ensureNotificationPreferences();
    const rows = (await db.execute(sql`SELECT email_shift_alerts FROM notification_preferences WHERE user_id=${req.user!.id}`) as any).rows;
    res.json({ emailShiftAlerts: rows[0]?.email_shift_alerts ?? true });
  } catch (error) { next(error); }
});

router.put("/preferences", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    await ensureNotificationPreferences();
    const { emailShiftAlerts } = z.object({ emailShiftAlerts: z.boolean() }).parse(req.body);
    await db.execute(sql`INSERT INTO notification_preferences(user_id, email_shift_alerts)
      VALUES (${req.user!.id}, ${emailShiftAlerts})
      ON CONFLICT(user_id) DO UPDATE SET email_shift_alerts=EXCLUDED.email_shift_alerts`);
    res.json({ emailShiftAlerts });
  } catch (error) { next(error); }
});

router.get("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user) throw new AppError(401, "User not authenticated");
    const result = await db.execute(sql`
      SELECT id, type, title, message, related_id, is_read, read_at, created_at
      FROM notifications WHERE user_id = ${req.user.id}
      ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ notifications: (result as any).rows });
  } catch (error) { next(error); }
});

router.patch("/:id/read", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user) throw new AppError(401, "User not authenticated");
    const notificationId = Number(req.params.id);
    if (!Number.isInteger(notificationId)) throw new AppError(400, "Invalid notification ID");
    const result = await db.execute(sql`
      UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = ${notificationId} AND user_id = ${req.user.id} RETURNING id
    `);
    if (!(result as any).rows[0]) throw new AppError(404, "Notification not found");
    res.status(204).send();
  } catch (error) { next(error); }
});

router.post("/read-all", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user) throw new AppError(401, "User not authenticated");
    await db.execute(sql`UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = ${req.user.id} AND is_read = false`);
    res.status(204).send();
  } catch (error) { next(error); }
});

router.post("/device", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user) throw new AppError(401, "User not authenticated");
    const input = deviceSchema.parse(req.body);
    if (req.user.role !== input.app) throw new AppError(403, "The push token does not match this account type");
    await db.execute(sql`
      INSERT INTO push_tokens (user_id, expo_push_token, platform, app)
      VALUES (${req.user.id}, ${input.token}, ${input.platform}, ${input.app})
      ON CONFLICT (expo_push_token)
      DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
                    app = EXCLUDED.app, updated_at = CURRENT_TIMESTAMP
    `);
    res.status(204).send();
  } catch (error) { next(error); }
});

router.delete("/device", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user) throw new AppError(401, "User not authenticated");
    const { token } = deviceSchema.pick({ token: true }).parse(req.body);
    await db.execute(sql`DELETE FROM push_tokens WHERE user_id = ${req.user.id} AND expo_push_token = ${token}`);
    res.status(204).send();
  } catch (error) { next(error); }
});

export default router;
