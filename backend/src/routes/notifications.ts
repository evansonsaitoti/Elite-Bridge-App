import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
const deviceSchema = z.object({
  token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/),
  platform: z.enum(["ios", "android"]),
  app: z.enum(["caregiver", "employer"]),
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
