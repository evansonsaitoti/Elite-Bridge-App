import { Router } from "express";
import { sql, eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { payments, bookings, employers, caregivers, users } from "../db/schema.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireRole } from "../middleware/auth.js";
import { z } from "zod";

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

export default router;
