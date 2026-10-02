import { Router } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { payments, bookings, employers, caregivers, users } from "../db/schema.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireRole } from "../middleware/auth.js";
import { z } from "zod";
import { ensureShiftPostsTable } from "./bookings";
import { ensureOperations } from "../db/operations";
import { csvCell, payrollCsv } from "../services/payroll-export";

const router = Router();
router.use(authMiddleware, requireRole("employer"));

const PAID_CONFIRMATION = "MARK PAID";

const payrollDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Use YYYY-MM-DD");

const paymentNoteSchema = z.string()
  .trim()
  .max(280)
  .refine(value => !/\d{6,}/.test(value), "Do not store full bank, SSN, routing, or account numbers here")
  .optional();

async function ensure1099Payroll() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contractor_profiles (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      contractor_type VARCHAR(20) NOT NULL DEFAULT '1099',
      w9_status VARCHAR(30) NOT NULL DEFAULT 'not_collected',
      payment_method VARCHAR(40) NOT NULL DEFAULT 'manual',
      payment_note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employer_id, caregiver_id)
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contractor_payout_runs (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      gross_amount DECIMAL(15,2) NOT NULL DEFAULT '0',
      reimbursement_amount DECIMAL(15,2) NOT NULL DEFAULT '0',
      total_amount DECIMAL(15,2) NOT NULL DEFAULT '0',
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      paid_at TIMESTAMP,
      memo TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contractor_payout_items (
      id SERIAL PRIMARY KEY,
      payout_run_id INTEGER NOT NULL REFERENCES contractor_payout_runs(id) ON DELETE CASCADE,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      timesheet_id INTEGER REFERENCES shift_timesheets(id) ON DELETE SET NULL,
      description TEXT NOT NULL,
      worked_minutes INTEGER NOT NULL DEFAULT 0,
      hourly_rate DECIMAL(10,2) NOT NULL DEFAULT '0',
      gross_amount DECIMAL(15,2) NOT NULL DEFAULT '0',
      reimbursement_amount DECIMAL(15,2) NOT NULL DEFAULT '0',
      total_amount DECIMAL(15,2) NOT NULL DEFAULT '0',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(timesheet_id)
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS contractor_payout_runs_employer_idx ON contractor_payout_runs(employer_id, status, period_start)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS contractor_payout_items_employer_idx ON contractor_payout_items(employer_id, caregiver_id)`);
}

async function auditPayrollAction(employerId: number, userId: number, action: string, detail: Record<string, unknown>) {
  await ensureOperations();
  await db.execute(sql`
    INSERT INTO operation_audit (employer_id,user_id,action,detail)
    VALUES (${employerId},${userId},${action},${JSON.stringify(detail)}::jsonb)
  `);
}

async function currentEmployer(req: AuthRequest) {
  const employer = (await db.select().from(employers).where(eq(employers.userId, req.user!.id)).limit(1))[0];
  if (!employer) throw new AppError(404, "Employer not found");
  return employer;
}

function parsePayrollRange(query: unknown) {
  const range = z.object({ from: payrollDateSchema, to: payrollDateSchema }).parse(query);
  const start = Date.parse(range.from), end = Date.parse(range.to) + 86400000;
  if (end <= start || end-start > 366*86400000) throw new AppError(400, "Choose a period of 1 to 366 days");
  return { ...range, start, end };
}

// Get payroll overview for employer
router.get("/employer/overview", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const employerList = await db.select().from(employers).where(eq(employers.userId, req.user!.id)).limit(1);
    if (employerList.length === 0) throw new AppError(404, "Employer not found");
    const employer = employerList[0];

    const result = await db.execute(sql`
      SELECT 
        COUNT(id) as total_invoices,
        SUM(amount) as total_spent,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as paid_amount
      FROM payments
      WHERE employer_id = ${employer.id}
    `);

    const recentPayments = await db.execute(sql`
      SELECT p.*, u.first_name, u.last_name, b.service_type
      FROM payments p
      JOIN caregivers c ON p.caregiver_id = c.id
      JOIN users u ON c.user_id = u.id
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.employer_id = ${employer.id}
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    res.json({
      stats: (result as any).rows[0],
      recentPayments: (recentPayments as any).rows
    });
  } catch (error) { next(error); }
});

// Generate invoice for a completed booking
router.post("/generate-invoice", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { bookingId } = z.object({ bookingId: z.number().int().positive() }).parse(req.body);
    const bookingList = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (bookingList.length === 0) throw new AppError(404, "Booking not found");
    const booking = bookingList[0];
    const employer = (await db.select().from(employers).where(eq(employers.userId, req.user!.id)).limit(1))[0];
    if (!employer || employer.id !== booking.employerId) throw new AppError(404, "Booking not found");
    if (booking.status !== "completed") throw new AppError(409, "Only completed bookings can be invoiced");

    // Check if payment already exists
    const existing = await db.select().from(payments).where(eq(payments.bookingId, bookingId)).limit(1);
    if (existing.length > 0) return res.json({ payment: existing[0] });

    const amount = Number(booking.totalAmount);
    const platformFee = amount * 0.15; // 15% platform fee
    const caregiverPayout = amount - platformFee;
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await db.insert(payments).values({
      bookingId: booking.id,
      employerId: booking.employerId,
      caregiverId: booking.caregiverId,
      amount: amount.toString(),
      platformFee: platformFee.toString(),
      caregiverPayout: caregiverPayout.toString(),
      status: "pending",
      invoiceNumber
    }).returning();

    res.status(201).json({ payment: result[0] });
  } catch (error) { next(error); }
});

// Settlement must be confirmed by a payment provider before updating balances.
router.post("/:paymentId/process", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const paymentId = z.coerce.number().int().positive().parse(req.params.paymentId);
    const employer = (await db.select().from(employers).where(eq(employers.userId, req.user!.id)).limit(1))[0];
    if (!employer) throw new AppError(404, "Employer not found");
    const payment = (await db.select().from(payments).where(and(eq(payments.id, paymentId), eq(payments.employerId, employer.id))).limit(1))[0];
    if (!payment) throw new AppError(404, "Payment not found");
    throw new AppError(501, "Payment processing is not configured. No charge or payout was made.");
  } catch (error) { next(error); }
});

router.get("/export", async (req: AuthRequest, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v);
    const range = z.object({ from: date, to: date }).parse(req.query);
    const start = Date.parse(range.from), end = Date.parse(range.to) + 86400000;
    if (end <= start || end-start > 93*86400000) throw new AppError(400, "Choose a period of 1 to 93 days");
    await ensureShiftPostsTable(); await ensureOperations();
    const employer = (await db.select().from(employers).where(eq(employers.userId, req.user!.id)).limit(1))[0];
    if (!employer) throw new AppError(404, "Employer not found");
    const records = await db.transaction(async tx => {
      const result = (await tx.execute(sql`SELECT st.id,st.caregiver_id,u.first_name,u.last_name,u.email,
        to_char(st.clock_in_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS clock_in_utc,
        to_char(st.clock_out_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS clock_out_utc,
        st.worked_minutes,st.hourly_rate,st.total_amount,st.status
        FROM shift_timesheets st JOIN caregivers c ON c.id=st.caregiver_id JOIN users u ON u.id=c.user_id
        WHERE st.employer_id=${employer.id} AND st.status='approved' AND st.clock_in_at>=${new Date(start)} AND st.clock_in_at<${new Date(end)} ORDER BY st.id`) as any).rows;
      await tx.execute(sql`INSERT INTO operation_audit (employer_id,user_id,action,detail) VALUES (${employer.id},${req.user!.id},'payroll_export',${JSON.stringify({ ...range, timesheetIds: result.map((r: any) => r.id) })}::jsonb)`);
      return result;
    });
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Disposition',`attachment; filename="elite-payroll-${range.from}-${range.to}.csv"`);
    res.type('text/csv').send(payrollCsv(records));
  } catch (e) { next(e); }
});

router.get("/1099/overview", async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable(); await ensureOperations(); await ensure1099Payroll();
    const employer = await currentEmployer(req);
    const year = z.coerce.number().int().min(2024).max(2100).default(new Date().getFullYear()).parse(req.query.year);
    const yearStart = `${year}-01-01`, nextYearStart = `${year + 1}-01-01`;

    const approved = (await db.execute(sql`
      SELECT st.id, st.caregiver_id, u.first_name, u.last_name, u.email,
        sp.title AS shift_title, sp.service_type,
        to_char(st.clock_in_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS clock_in_utc,
        to_char(st.clock_out_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS clock_out_utc,
        st.worked_minutes, st.hourly_rate, st.total_amount, st.status,
        cp.w9_status, cp.payment_method
      FROM shift_timesheets st
      JOIN caregivers c ON c.id=st.caregiver_id
      JOIN users u ON u.id=c.user_id
      LEFT JOIN shift_posts sp ON sp.id=st.shift_id
      LEFT JOIN contractor_profiles cp ON cp.employer_id=st.employer_id AND cp.caregiver_id=st.caregiver_id
      LEFT JOIN contractor_payout_items pi ON pi.timesheet_id=st.id
      WHERE st.employer_id=${employer.id} AND st.status='approved' AND pi.id IS NULL
      ORDER BY st.clock_in_at DESC
      LIMIT 200
    `) as any).rows;

    const contractors = (await db.execute(sql`
      SELECT c.id AS caregiver_id, u.first_name, u.last_name, u.email,
        COALESCE(cp.w9_status, 'not_collected') AS w9_status,
        COALESCE(cp.payment_method, 'manual') AS payment_method,
        COALESCE(SUM(pi.total_amount) FILTER (WHERE pr.status='paid' AND pr.period_start >= ${yearStart}::date AND pr.period_start < ${nextYearStart}::date), 0) AS year_paid,
        COALESCE(SUM(pi.total_amount) FILTER (WHERE pr.status <> 'void'), 0) AS lifetime_paid
      FROM employer_caregivers ec
      JOIN users u ON u.id=ec.caregiver_user_id
      JOIN caregivers c ON c.user_id=u.id
      LEFT JOIN contractor_profiles cp ON cp.employer_id=ec.employer_id AND cp.caregiver_id=c.id
      LEFT JOIN contractor_payout_items pi ON pi.employer_id=ec.employer_id AND pi.caregiver_id=c.id
      LEFT JOIN contractor_payout_runs pr ON pr.id=pi.payout_run_id
      WHERE ec.employer_id=${employer.id}
      GROUP BY c.id, u.first_name, u.last_name, u.email, cp.w9_status, cp.payment_method
      ORDER BY u.first_name, u.last_name
    `) as any).rows;

    const runs = (await db.execute(sql`
      SELECT id, period_start, period_end, status, gross_amount, reimbursement_amount, total_amount, paid_at, memo, created_at
      FROM contractor_payout_runs
      WHERE employer_id=${employer.id}
      ORDER BY created_at DESC
      LIMIT 25
    `) as any).rows;

    const summary = (await db.execute(sql`
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE status='draft'), 0) AS draft_total,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid'), 0) AS paid_total,
        COALESCE(SUM(total_amount) FILTER (WHERE status='paid' AND period_start >= ${yearStart}::date AND period_start < ${nextYearStart}::date), 0) AS year_paid_total,
        COUNT(*) FILTER (WHERE status='draft') AS draft_runs
      FROM contractor_payout_runs
      WHERE employer_id=${employer.id}
    `) as any).rows[0];

    res.json({ mode: "1099_contractor", year, summary, approvedTimesheets: approved, contractors, runs });
  } catch (error) { next(error); }
});

router.patch("/1099/contractors/:caregiverId", async (req: AuthRequest, res, next) => {
  try {
    await ensure1099Payroll(); await ensureOperations();
    const employer = await currentEmployer(req);
    const caregiverId = z.coerce.number().int().positive().parse(req.params.caregiverId);
    const data = z.object({
      w9Status: z.enum(["not_collected", "requested", "received", "blocked"]).optional(),
      paymentMethod: z.enum(["manual", "ach", "check", "zelle", "cashapp", "venmo"]).optional(),
      paymentNote: paymentNoteSchema,
    }).parse(req.body);
    const caregiver = (await db.execute(sql`
      SELECT c.id FROM caregivers c
      JOIN employer_caregivers ec ON ec.caregiver_user_id=c.user_id
      WHERE c.id=${caregiverId} AND ec.employer_id=${employer.id}
      LIMIT 1
    `) as any).rows[0];
    if (!caregiver) throw new AppError(404, "Contractor not found");
    const result = (await db.execute(sql`
      INSERT INTO contractor_profiles (employer_id, caregiver_id, w9_status, payment_method, payment_note, updated_at)
      VALUES (${employer.id}, ${caregiverId}, ${data.w9Status || "not_collected"}, ${data.paymentMethod || "manual"}, ${data.paymentNote || null}, CURRENT_TIMESTAMP)
      ON CONFLICT (employer_id, caregiver_id) DO UPDATE
      SET w9_status=COALESCE(${data.w9Status || null}, contractor_profiles.w9_status),
          payment_method=COALESCE(${data.paymentMethod || null}, contractor_profiles.payment_method),
          payment_note=COALESCE(${data.paymentNote || null}, contractor_profiles.payment_note),
          updated_at=CURRENT_TIMESTAMP
      RETURNING *
    `) as any).rows[0];
    await auditPayrollAction(employer.id, req.user!.id, "contractor_1099_profile_updated", {
      caregiverId,
      w9Status: data.w9Status,
      paymentMethod: data.paymentMethod,
      paymentNoteUpdated: data.paymentNote !== undefined
    });
    res.json({ contractor: result });
  } catch (error) { next(error); }
});

router.post("/1099/runs", async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable(); await ensureOperations(); await ensure1099Payroll();
    const employer = await currentEmployer(req);
    const data = z.object({ from: payrollDateSchema, to: payrollDateSchema, memo: z.string().trim().max(1000).optional() }).parse(req.body);
    const { start, end } = parsePayrollRange({ from: data.from, to: data.to });
    const run = await db.transaction(async tx => {
      const rows = (await tx.execute(sql`
        SELECT st.id, st.caregiver_id, st.worked_minutes, st.hourly_rate, st.total_amount,
          sp.title AS shift_title, sp.service_type,
          to_char(st.clock_in_at, 'YYYY-MM-DD') AS service_date,
          u.first_name, u.last_name,
          COALESCE(cp.w9_status, 'not_collected') AS w9_status
        FROM shift_timesheets st
        JOIN caregivers c ON c.id=st.caregiver_id
        JOIN users u ON u.id=c.user_id
        LEFT JOIN shift_posts sp ON sp.id=st.shift_id
        LEFT JOIN contractor_profiles cp ON cp.employer_id=st.employer_id AND cp.caregiver_id=st.caregiver_id
        LEFT JOIN contractor_payout_items pi ON pi.timesheet_id=st.id
        WHERE st.employer_id=${employer.id} AND st.status='approved'
          AND st.clock_in_at>=${new Date(start)} AND st.clock_in_at<${new Date(end)}
          AND pi.id IS NULL
        ORDER BY st.clock_in_at ASC, st.id ASC
      `) as any).rows;
      if (!rows.length) throw new AppError(409, "No approved unpaid timesheets found for this period");
      const blocked = rows.filter((row: any) => row.w9_status !== "received");
      if (blocked.length) {
        const names = [...new Set(blocked.map((row: any) => `${row.first_name || ""} ${row.last_name || ""}`.trim()).filter(Boolean))].slice(0, 3).join(", ");
        throw new AppError(409, `W-9 must be marked received before creating payout${names ? ` for ${names}` : ""}`);
      }
      const gross = rows.reduce((sum: number, row: any) => sum + Number(row.total_amount || 0), 0);
      if (!Number.isFinite(gross) || gross <= 0 || gross > 100000) throw new AppError(400, "Payout total is outside the allowed range");
      const created = (await tx.execute(sql`
        INSERT INTO contractor_payout_runs (employer_id, period_start, period_end, status, gross_amount, total_amount, approved_by, memo)
        VALUES (${employer.id}, ${data.from}::date, ${data.to}::date, 'draft', ${gross.toFixed(2)}, ${gross.toFixed(2)}, ${req.user!.id}, ${data.memo || null})
        RETURNING *
      `) as any).rows[0];
      for (const row of rows) {
        const description = `${row.service_date || ""} ${row.shift_title || row.service_type || "Care shift"}`.trim();
        await tx.execute(sql`
          INSERT INTO contractor_payout_items (payout_run_id, employer_id, caregiver_id, timesheet_id, description, worked_minutes, hourly_rate, gross_amount, total_amount)
          VALUES (${created.id}, ${employer.id}, ${row.caregiver_id}, ${row.id}, ${description}, ${row.worked_minutes || 0}, ${String(row.hourly_rate || "0")}, ${String(row.total_amount || "0")}, ${String(row.total_amount || "0")})
        `);
      }
      await tx.execute(sql`
        INSERT INTO operation_audit (employer_id,user_id,action,detail)
        VALUES (${employer.id},${req.user!.id},'contractor_payout_run_created',${JSON.stringify({ runId: created.id, ...data, timesheetIds: rows.map((r: any) => r.id), gross: gross.toFixed(2) })}::jsonb)
      `);
      return created;
    });
    res.status(201).json({ payoutRun: run });
  } catch (error) { next(error); }
});

router.post("/1099/runs/:runId/mark-paid", async (req: AuthRequest, res, next) => {
  try {
    await ensure1099Payroll(); await ensureOperations();
    const employer = await currentEmployer(req);
    const runId = z.coerce.number().int().positive().parse(req.params.runId);
    const data = z.object({
      confirmation: z.literal(PAID_CONFIRMATION),
      memo: z.string().trim().max(1000).optional()
    }).parse(req.body || {});
    const run = await db.transaction(async tx => {
      const updated = (await tx.execute(sql`
        UPDATE contractor_payout_runs
        SET status='paid', paid_at=CURRENT_TIMESTAMP, memo=COALESCE(${data.memo || null}, memo), updated_at=CURRENT_TIMESTAMP
        WHERE id=${runId} AND employer_id=${employer.id} AND status='draft'
        RETURNING *
      `) as any).rows[0];
      if (!updated) throw new AppError(404, "Draft payout run not found");
      await tx.execute(sql`
        INSERT INTO operation_audit (employer_id,user_id,action,detail)
        VALUES (${employer.id},${req.user!.id},'contractor_payout_run_marked_paid',${JSON.stringify({ runId, totalAmount: updated.total_amount, confirmation: PAID_CONFIRMATION })}::jsonb)
      `);
      return updated;
    });
    res.json({ payoutRun: run });
  } catch (error) { next(error); }
});

router.get("/1099/runs/:runId/export", async (req: AuthRequest, res, next) => {
  try {
    await ensure1099Payroll(); await ensureOperations();
    const employer = await currentEmployer(req);
    const runId = z.coerce.number().int().positive().parse(req.params.runId);
    const rows = (await db.execute(sql`
      SELECT pr.id AS run_id, pr.period_start, pr.period_end, pr.status, pr.paid_at,
        pi.id AS item_id, pi.description, pi.worked_minutes, pi.hourly_rate, pi.gross_amount, pi.reimbursement_amount, pi.total_amount,
        u.first_name, u.last_name, u.email, cp.w9_status, cp.payment_method
      FROM contractor_payout_runs pr
      JOIN contractor_payout_items pi ON pi.payout_run_id=pr.id
      JOIN caregivers c ON c.id=pi.caregiver_id
      JOIN users u ON u.id=c.user_id
      LEFT JOIN contractor_profiles cp ON cp.employer_id=pr.employer_id AND cp.caregiver_id=c.id
      WHERE pr.id=${runId} AND pr.employer_id=${employer.id}
      ORDER BY u.first_name, u.last_name, pi.id
    `) as any).rows;
    if (!rows.length) throw new AppError(404, "Payout run not found");
    const header = ["Run ID","Period start","Period end","Status","Paid at","Contractor","Email","W-9 status","Payment method","Description","Worked minutes","Hours","Hourly rate","Gross","Reimbursement","Total"];
    const csv = [header, ...rows.map((r: any) => [r.run_id, r.period_start, r.period_end, r.status, r.paid_at || "", `${r.first_name} ${r.last_name}`, r.email, r.w9_status || "not_collected", r.payment_method || "manual", r.description, r.worked_minutes, (Number(r.worked_minutes || 0) / 60).toFixed(4), r.hourly_rate, r.gross_amount, r.reimbursement_amount, r.total_amount])].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
    await auditPayrollAction(employer.id, req.user!.id, "contractor_payout_run_exported", { runId, itemCount: rows.length, status: rows[0].status });
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Disposition',`attachment; filename="elite-1099-payout-run-${runId}.csv"`);
    res.type('text/csv').send(csv);
  } catch (error) { next(error); }
});

router.get("/integrations", async (_req: AuthRequest, res) => {
  res.json({ integrations: [
    { provider: 'elite_1099', name: 'Elite Bridge 1099 payouts', status: 'available', message: 'Approved timesheets can be batched into contractor payout runs, exported, and marked paid without employee tax withholding.' },
    { provider: 'year_end_1099', name: 'Year-end 1099 report', status: 'available', message: 'Paid contractor totals are tracked by calendar year for 1099-NEC preparation.' },
    { provider: 'external_payroll', name: 'External payroll software', status: 'optional', message: 'Gusto, ADP, and QuickBooks are optional only if you later add W-2 employees or want outside filing support.' }
  ], export: { status: 'available', format: 'Elite Bridge 1099 CSV', basis: 'Approved timesheets selected by service date. This export does not withhold taxes, send payments, or file 1099 forms.' } });
});

export default router;
