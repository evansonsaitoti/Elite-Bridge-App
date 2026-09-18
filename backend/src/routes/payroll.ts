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
import { payrollCsv } from "../services/payroll-export";

const router = Router();
router.use(authMiddleware, requireRole("employer"));

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

router.get("/integrations", async (_req: AuthRequest, res) => {
  res.json({ integrations: [
    { provider: 'gusto', name: 'Gusto', status: 'requires_provider_setup', message: 'Partner API approval, OAuth credentials and employee mapping are required before direct synchronization.' },
    { provider: 'adp', name: 'ADP', status: 'requires_provider_setup', message: 'An ADP API subscription, organization authorization and client certificate are required before direct synchronization.' },
    { provider: 'quickbooks', name: 'QuickBooks', status: 'requires_provider_setup', message: 'An Intuit production application, OAuth authorization and employee mapping are required before time activity synchronization.' }
  ], export: { status: 'available', format: 'Elite Bridge CSV', basis: 'Approved timesheets selected by clock-in date in UTC. Review overtime, taxes and pay-period allocation in your payroll system. This export does not send payments or mark records as paid.' } });
});

export default router;
