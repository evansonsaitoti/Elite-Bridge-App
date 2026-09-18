import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { ensureOperations } from "../db/operations";
import { ensureShiftPostsTable } from "./bookings";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import {
  sendOperationsAlert,
  sendTransactionalEmail,
} from "../services/notifications";

const router = Router();
const rows = (r: any): any[] => r.rows;
const id = z.coerce.number().int().positive();
router.use(authMiddleware);
router.use(async (_req, _res, next) => {
  try {
    await ensureShiftPostsTable();
    await ensureOperations();
    next();
  } catch (e) {
    next(e);
  }
});
async function employerId(req: AuthRequest) {
  if (req.user?.role !== "employer")
    throw new AppError(403, "Employer access required");
  const employer = rows(
    await db.execute(
      sql`SELECT id FROM employers WHERE user_id = ${req.user.id}`,
    ),
  )[0];
  if (!employer)
    throw new AppError(404, "Complete your employer profile first");
  return employer.id as number;
}
async function shiftAccess(req: AuthRequest, shiftId: number) {
  const shift = rows(
    await db.execute(
      sql`SELECT s.*, e.user_id AS employer_user_id FROM shift_posts s JOIN employers e ON e.id = s.employer_id WHERE s.id = ${shiftId}`,
    ),
  )[0];
  if (!shift) throw new AppError(404, "Shift not found");
  if (req.user?.role === "employer" && shift.employer_user_id === req.user.id)
    return shift;
  if (
    req.user?.role === "caregiver" &&
    rows(
      await db.execute(
        sql`SELECT a.id FROM shift_applications a JOIN caregivers c ON c.id = a.caregiver_id WHERE a.shift_id = ${shiftId} AND a.status = 'approved' AND c.user_id = ${req.user.id}`,
      ),
    ).length
  )
    return shift;
  throw new AppError(404, "Shift not found");
}
router.get("/shifts", async (req: AuthRequest, res, next) => {
  try {
    const result =
      req.user!.role === "employer"
        ? await db.execute(
            sql`SELECT s.id, s.title, s.start_time, f.latitude, f.longitude, f.radius_meters FROM shift_posts s LEFT JOIN shift_geofences f ON f.shift_id=s.id WHERE s.employer_id = ${await employerId(req)} ORDER BY s.start_time DESC LIMIT 200`,
          )
        : await db.execute(
            sql`SELECT s.id, s.title, s.start_time, f.latitude, f.longitude, f.radius_meters FROM shift_posts s JOIN shift_applications a ON a.shift_id=s.id JOIN caregivers c ON c.id=a.caregiver_id LEFT JOIN shift_geofences f ON f.shift_id=s.id WHERE c.user_id=${req.user!.id} AND a.status='approved' ORDER BY s.start_time DESC LIMIT 200`,
          );
    res.json({ shifts: rows(result) });
  } catch (e) {
    next(e);
  }
});
router.put("/shifts/:id/geofence", async (req: AuthRequest, res, next) => {
  try {
    const employer = await employerId(req),
      shiftId = id.parse(req.params.id);
    const data = z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radiusMeters: z.number().int().min(50).max(1000),
      })
      .parse(req.body);
    await db.transaction(async (tx) => {
      const shift = rows(
        await tx.execute(
          sql`SELECT id FROM shift_posts WHERE id=${shiftId} AND employer_id=${employer} AND status IN ('open','assigned') FOR UPDATE`,
        ),
      )[0];
      if (!shift)
        throw new AppError(
          409,
          "Only your open or assigned shifts can have their clock-in area changed",
        );
      if (
        rows(
          await tx.execute(
            sql`SELECT id FROM shift_activities WHERE shift_id=${shiftId} AND type='clock_in' LIMIT 1`,
          ),
        ).length
      )
        throw new AppError(409, "Attendance has already started");
      await tx.execute(
        sql`INSERT INTO shift_geofences (shift_id,employer_id,latitude,longitude,radius_meters) VALUES (${shiftId},${employer},${data.latitude},${data.longitude},${data.radiusMeters}) ON CONFLICT (shift_id) DO UPDATE SET latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, radius_meters=EXCLUDED.radius_meters, updated_at=CURRENT_TIMESTAMP`,
      );
      await tx.execute(
        sql`INSERT INTO operation_audit (employer_id,user_id,action,record_id,detail) VALUES (${employer},${req.user!.id},'geofence_configured',${shiftId},${JSON.stringify(data)}::jsonb)`,
      );
    });
    res.json({ message: "Clock-in area saved" });
  } catch (e) {
    next(e);
  }
});
router.get("/incidents", async (req: AuthRequest, res, next) => {
  try {
    const scope =
      req.user!.role === "employer"
        ? sql`i.employer_id = ${await employerId(req)}`
        : sql`i.reporter_id = ${req.user!.id}`;
    res.json({
      incidents: rows(
        await db.execute(
          sql`SELECT i.*, s.title AS shift_title, COALESCE((SELECT jsonb_agg(jsonb_build_object('id', u.id, 'status', u.status, 'note', u.note, 'created_at', u.created_at) ORDER BY u.id) FROM incident_updates u WHERE u.incident_id=i.id), '[]'::jsonb) AS updates FROM incident_reports i JOIN shift_posts s ON s.id=i.shift_id WHERE ${scope} ORDER BY i.created_at DESC LIMIT 200`,
        ),
      ),
    });
  } catch (e) {
    next(e);
  }
});
router.post("/incidents", async (req: AuthRequest, res, next) => {
  try {
    const data = z
      .object({
        shiftId: id,
        category: z.enum([
          "safety",
          "injury",
          "medication",
          "conduct",
          "property",
          "other",
        ]),
        severity: z.enum(["low", "medium", "high", "critical"]),
        description: z.string().trim().min(10).max(4000),
        occurredAt: z
          .string()
          .datetime()
          .refine(
            (v) => Date.parse(v) <= Date.now() + 60000,
            "Incident time cannot be in the future",
          ),
      })
      .parse(req.body);
    const shift = await shiftAccess(req, data.shiftId);
    const incident = rows(
      await db.execute(
        sql`INSERT INTO incident_reports (shift_id,employer_id,reporter_id,category,severity,description,occurred_at) VALUES (${data.shiftId},${shift.employer_id},${req.user!.id},${data.category},${data.severity},${data.description},${data.occurredAt}::timestamptz) RETURNING *`,
      ),
    )[0];
    const owner = rows(
      await db.execute(
        sql`SELECT email FROM users WHERE id=${shift.employer_user_id}`,
      ),
    )[0];
    // Deliberately omit incident narratives and resident information from email.
    const employerEmailSent = owner
      ? await sendTransactionalEmail(
          owner.email,
          "Incident report requires review",
          `Incident #${incident.id} (${data.severity}) was submitted. Sign in to Elite Bridge to review the secure report.`,
        )
      : false;
    const officeEmailSent = await sendOperationsAlert(
      "Incident report requires review",
      `Incident #${incident.id} (${data.severity}) requires review in Elite Bridge.`,
    );
    res.status(201).json({ incident, employerEmailSent, officeEmailSent });
  } catch (e) {
    next(e);
  }
});
router.patch("/incidents/:id", async (req: AuthRequest, res, next) => {
  try {
    const employer = await employerId(req),
      incidentId = id.parse(req.params.id);
    const data = z
      .object({
        status: z.enum(["open", "investigating", "resolved"]),
        note: z.string().trim().min(5).max(4000),
      })
      .parse(req.body);
    const incident = await db.transaction(async (tx) => {
      const result = rows(
        await tx.execute(
          sql`UPDATE incident_reports SET status=${data.status}, resolution=${data.status === "resolved" ? data.note : null}, updated_at=CURRENT_TIMESTAMP WHERE id=${incidentId} AND employer_id=${employer} RETURNING *`,
        ),
      )[0];
      if (!result) throw new AppError(404, "Incident not found");
      await tx.execute(
        sql`INSERT INTO incident_updates (incident_id,author_id,status,note) VALUES (${incidentId},${req.user!.id},${data.status},${data.note})`,
      );
      return result;
    });
    res.json({ incident });
  } catch (e) {
    next(e);
  }
});
export default router;
