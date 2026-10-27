import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { employerForUser } from "../services/employerMemberships";
import { sendEmail, escapeEmailHtml } from "../services/email.js";

const router = Router();
let manualTimesheetsReady = false;

const entrySchema = z.object({
  staffName: z.string().trim().min(1).max(255),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  hourlyRate: z.coerce.number().positive().max(500),
  unpaidBreakMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  includeWeekends: z.boolean().default(true),
  reason: z.string().trim().min(3).max(2000),
});

const emailTimesheetSchema = z.object({
  staffName: z.string().trim().min(1).max(255),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  recipient: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  message: z.string().trim().max(1200).optional(),
  pdfBase64: z.string().min(100).max(3_200_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
}).refine((data) => Boolean(data.startDate) === Boolean(data.endDate), {
  message: "Select both the first and last date when emailing a custom period.",
});

const reviewSchema = z.object({
  status: z.enum(["approved", "correction_requested"]),
  note: z.string().trim().max(2000).default(""),
  approvedByName: z.string().trim().min(1).max(255).optional(),
  approvalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "approved" && !data.approvedByName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["approvedByName"], message: "Enter the approver's name." });
  if (data.status === "approved" && !data.approvalDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["approvalDate"], message: "Enter the approval date." });
});

async function ensureManualTimesheets() {
  if (manualTimesheetsReady) return;
  await ensureCoreTables();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS manual_timesheet_entries (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      staff_name VARCHAR(255) NOT NULL,
      shift_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      worked_minutes INTEGER NOT NULL CHECK (worked_minutes > 0),
      hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
      total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount >= 0),
      reason TEXT NOT NULL,
      entry_type VARCHAR(50) NOT NULL DEFAULT 'missed_clock_in',
      status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',
      agency_note TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (employer_id, staff_name, shift_date)
    )
  `);
  await db.execute(sql`ALTER TABLE manual_timesheet_entries ADD COLUMN IF NOT EXISTS approved_by_name VARCHAR(255)`);
  await db.execute(sql`ALTER TABLE manual_timesheet_entries ADD COLUMN IF NOT EXISTS approval_date DATE`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS manual_timesheet_reviews (
      id SERIAL PRIMARY KEY,
      manual_timesheet_id INTEGER NOT NULL REFERENCES manual_timesheet_entries(id) ON DELETE CASCADE,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(50) NOT NULL,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS manual_timesheet_email_history (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      sender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      staff_name VARCHAR(255) NOT NULL,
      recipient VARCHAR(254) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      entry_count INTEGER NOT NULL,
      hours NUMERIC(12,2) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'accepted_for_delivery',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  manualTimesheetsReady = true;
}

function asEmployerDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, "Enter a valid date.");
  }
  return date;
}

async function getEmployer(req: AuthRequest) {
  if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required.");
  return employerForUser(req.user.id);
}

router.get("/employer", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureManualTimesheets();
    const employer = await getEmployer(req);
    const result = await db.execute(sql`
      SELECT id, staff_name, shift_date, start_time, end_time, worked_minutes, hourly_rate,
             total_amount, reason, entry_type, status, agency_note, approved_by_name, approval_date, approved_at, created_at
      FROM manual_timesheet_entries
      WHERE employer_id = ${employer.id}
      ORDER BY shift_date DESC, end_time DESC, id DESC
      LIMIT 100
    `);
    const manualTimesheets = (result as any).rows.map((row: any) => ({
      ...row,
      entry_source: "manual_missed_clock_in",
      worked_hours: Number((Number(row.worked_minutes || 0) / 60).toFixed(2)),
      hourly_rate: Number(row.hourly_rate),
      total_amount: Number(row.total_amount),
    }));
    res.json({ manualTimesheets });
  } catch (error) { next(error); }
});

router.post("/employer", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureManualTimesheets();
    const employer = await getEmployer(req);
    const data = entrySchema.parse(req.body);
    const start = asEmployerDate(data.startDate);
    const end = asEmployerDate(data.endDate);
    const dayCount = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (dayCount < 1) throw new AppError(400, "The end date must be on or after the start date.");
    if (dayCount > 31) throw new AppError(400, "Enter no more than 31 calendar days at a time.");

    const [startHour, startMinute] = data.startTime.split(":").map(Number);
    const [endHour, endMinute] = data.endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    let shiftMinutes = endHour * 60 + endMinute - startMinutes;
    if (shiftMinutes <= 0) shiftMinutes += 1440;
    const workedMinutes = shiftMinutes - data.unpaidBreakMinutes;
    if (workedMinutes <= 0) throw new AppError(400, "The unpaid break must be shorter than the shift.");
    const hourlyRate = data.hourlyRate.toFixed(2);
    const totalAmount = Number(((workedMinutes / 60) * data.hourlyRate).toFixed(2));

    const dates: string[] = [];
    for (let offset = 0; offset < dayCount; offset++) {
      const date = new Date(start.getTime() + offset * 86400000);
      const day = date.getUTCDay();
      if (!data.includeWeekends && (day === 0 || day === 6)) continue;
      dates.push(date.toISOString().slice(0, 10));
    }
    if (!dates.length) throw new AppError(400, "The selected range contains no work days.");

    const entries = await db.transaction(async (tx) => {
      const created = [];
      for (const shiftDate of dates) {
        const row = (await tx.execute(sql`
          INSERT INTO manual_timesheet_entries
            (employer_id, staff_name, shift_date, start_time, end_time, worked_minutes, hourly_rate,
             total_amount, reason, entry_type, status, created_by)
          VALUES
            (${employer.id}, ${data.staffName}, ${shiftDate}::date, ${data.startTime}::time, ${data.endTime}::time,
             ${workedMinutes}, ${hourlyRate}, ${totalAmount}, ${data.reason}, 'missed_clock_in',
             'pending_approval', ${req.user!.id})
          RETURNING id, staff_name, shift_date, start_time, end_time, worked_minutes, hourly_rate,
                    total_amount, reason, entry_type, status, agency_note, approved_by_name, approval_date, approved_at, created_at
        `) as any).rows[0];
        created.push(row);
      }
      return created;
    });
    res.status(201).json({
      manualTimesheets: entries,
      count: entries.length,
      worked_hours: Number((workedMinutes * entries.length / 60).toFixed(2)),
      total_amount: Number((totalAmount * entries.length).toFixed(2)),
    });
  } catch (error: any) {
    if (error?.code === "23505") return next(new AppError(409, "A missed-clock-in entry already exists for this staff member on one of those dates."));
    next(error);
  }
});

router.get("/employer/email-history", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureManualTimesheets();
    const employer = await getEmployer(req);
    const result = await db.execute(sql`
      SELECT id, staff_name, recipient, start_date, end_date, entry_count, hours, status, created_at
      FROM manual_timesheet_email_history
      WHERE employer_id = ${employer.id}
      ORDER BY created_at DESC, id DESC
      LIMIT 30
    `);
    res.setHeader("Cache-Control", "no-store");
    res.json({ emails: (result as any).rows });
  } catch (error) { next(error); }
});

router.post("/employer/email", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureManualTimesheets();
    const employer = await getEmployer(req);
    const data = emailTimesheetSchema.parse(req.body);
    const first = data.startDate || `${data.month}-01`;
    const monthStart = asEmployerDate(`${data.month}-01`);
    const last = data.endDate || new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const start = asEmployerDate(first);
    const end = asEmployerDate(last);
    const rangeDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (rangeDays < 1 || rangeDays > 93) throw new AppError(400, "Choose a date range of 1 to 93 days.");

    const match = (await db.execute(sql`
      SELECT COUNT(*)::int AS entry_count,
             COALESCE(SUM(worked_minutes), 0)::int AS total_minutes
      FROM manual_timesheet_entries
      WHERE employer_id = ${employer.id} AND staff_name = ${data.staffName}
        AND shift_date BETWEEN ${first}::date AND ${last}::date
    `) as any).rows[0];
    if (!Number(match?.entry_count || 0)) throw new AppError(404, "No timesheet entries were found for this caregiver and date range.");

    const pdf = Buffer.from(data.pdfBase64, "base64");
    if (pdf.length > 2_400_000 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) || !pdf.includes(Buffer.from("%%EOF"))) {
      throw new AppError(400, "The timesheet PDF could not be verified. Download it again and retry.");
    }

    const filenameBase = data.staffName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "staff";
    const period = first === last ? first : `${first}_to_${last}`;
    const filename = `${filenameBase}_Hours_${period}.pdf`;
    const description = first === last ? first : `${first} to ${last}`;
    const optionalNote = data.message ? `\n\nMessage from the sender:\n${data.message}` : "";
    const safeNote = data.message ? `<p><strong>Message:</strong> ${escapeEmailHtml(data.message)}</p>` : "";
    const sent = await sendEmail({
      from: "Elite Bridge Staffing <info@elitebridgestaffing.com>",
      to: data.recipient,
      subject: `Elite Bridge Staffing - ${data.staffName} hours - ${description}`,
      text: `Attached is the requested timesheet for ${data.staffName} (${description}): ${Number(match.total_minutes) / 60} recorded hours. Please handle this staff record confidentially.${optionalNote}`,
      html: `<p>Attached is the requested timesheet for <strong>${escapeEmailHtml(data.staffName)}</strong> (${escapeEmailHtml(description)}), covering <strong>${Number(match.total_minutes) / 60} recorded hours</strong>.</p><p>Please handle this staff record confidentially.</p>${safeNote}`,
      attachments: [{ filename, content: pdf, contentType: "application/pdf" }],
    });
    if (!sent) throw new AppError(503, "Email delivery is not configured on the Elite Bridge server.");
    const logged = await db.execute(sql`
      INSERT INTO manual_timesheet_email_history
        (employer_id, sender_user_id, staff_name, recipient, start_date, end_date, entry_count, hours, status)
      VALUES
        (${employer.id}, ${req.user!.id}, ${data.staffName}, ${data.recipient},
         ${first}::date, ${last}::date, ${Number(match.entry_count)},
         ${Number(match.total_minutes) / 60}, 'accepted_for_delivery')
      RETURNING id
    `);
    res.setHeader("Cache-Control", "no-store");
    res.json({ accepted: true, sent: true, historyId: (logged as any).rows[0]?.id });
  } catch (error: any) {
    if (error instanceof AppError) return next(error);
    console.error("Manual timesheet email submission failed", {
      providerStatus: error?.response?.status,
      providerCode: error?.code,
      errorName: error?.name,
    });
    next(new AppError(502, "The request could not be completed. Check the email recipient and sender configuration before retrying; email acceptance may need verification."));
  }
});

router.patch("/employer/:manualTimesheetId/review", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureManualTimesheets();
    const employer = await getEmployer(req);
    const id = z.coerce.number().int().positive().parse(req.params.manualTimesheetId);
    const data = reviewSchema.parse(req.body);
    if (data.status === "correction_requested" && !data.note) throw new AppError(400, "Explain what needs clarification.");
    if (data.status === "approved") asEmployerDate(data.approvalDate!);

    const result = await db.execute(sql`
      WITH updated AS (
        UPDATE manual_timesheet_entries
        SET status = ${data.status}, agency_note = ${data.note || null},
            approved_by = CASE WHEN ${data.status} = 'approved' THEN ${req.user!.id} ELSE NULL END,
            approved_by_name = CASE WHEN ${data.status} = 'approved' THEN ${data.approvedByName || null} ELSE NULL END,
            approval_date = CASE WHEN ${data.status} = 'approved' THEN ${data.approvalDate || null}::date ELSE NULL END,
            approved_at = CASE WHEN ${data.status} = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND employer_id = ${employer.id} AND status = 'pending_approval'
        RETURNING id, staff_name, shift_date, start_time, end_time, worked_minutes, hourly_rate,
                  total_amount, reason, entry_type, status, agency_note, approved_by_name,
                  approval_date, approved_at, created_at
      ), audit AS (
        INSERT INTO manual_timesheet_reviews (manual_timesheet_id, actor_user_id, action, note)
        SELECT id, ${req.user!.id}, ${data.status}, ${data.note || null}
        FROM updated
        RETURNING manual_timesheet_id
      )
      SELECT updated.*
      FROM updated
      INNER JOIN audit ON audit.manual_timesheet_id = updated.id
    `);
    const entry = (result as any).rows[0];
    if (!entry) {
      const current = (await db.execute(sql`
        SELECT status FROM manual_timesheet_entries WHERE id = ${id} AND employer_id = ${employer.id}
      `) as any).rows[0];
      if (!current) throw new AppError(404, "Manual timesheet entry not found.");
      throw new AppError(409, "This entry is no longer pending review.");
    }
    res.json({ manualTimesheet: entry });
  } catch (error) { next(error); }
});

export default router;

