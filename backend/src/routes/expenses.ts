import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
let expensesReady = false;

const expenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vendor: z.string().trim().min(1).max(255),
  category: z.enum(["gas", "subscriptions", "advertising", "supplies", "payroll", "insurance", "office", "other"]),
  amount: z.coerce.number().positive().max(100000),
  paymentMethod: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  receiptImageBase64: z.string().max(3_500_000).optional().default(""),
  receiptImageType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
});

async function ensureExpenses() {
  if (expensesReady) return;
  await ensureCoreTables();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_expenses (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      expense_date DATE NOT NULL,
      vendor VARCHAR(255) NOT NULL,
      category VARCHAR(80) NOT NULL,
      amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
      payment_method VARCHAR(80),
      description TEXT,
      receipt_image_base64 TEXT,
      receipt_image_type VARCHAR(40),
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  expensesReady = true;
}

function validateDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, "Enter a valid expense date.");
  }
}

async function getEmployer(req: AuthRequest) {
  if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
  const matches = await db.select().from(employers).where(eq(employers.userId, req.user.id)).limit(1);
  if (matches.length) return matches[0];
  const created = await db.insert(employers).values({ userId: req.user.id, companyName: req.user.email }).returning();
  return created[0];
}

router.get("/employer", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureExpenses();
    const employer = await getEmployer(req);
    const from = typeof req.query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from) ? req.query.from : null;
    const to = typeof req.query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to) ? req.query.to : null;
    const result = await db.execute(sql`
      SELECT id, expense_date, vendor, category, amount, payment_method, description,
             receipt_image_base64, receipt_image_type, created_at
      FROM company_expenses
      WHERE employer_id = ${employer.id}
        AND (${from}::date IS NULL OR expense_date >= ${from}::date)
        AND (${to}::date IS NULL OR expense_date <= ${to}::date)
      ORDER BY expense_date DESC, id DESC
      LIMIT 200
    `);
    const expenses = (result as any).rows.map((row: any) => ({
      ...row,
      amount: Number(row.amount),
      has_receipt: Boolean(row.receipt_image_base64),
    }));
    const totals = expenses.reduce((acc: Record<string, number>, item: any) => {
      acc.total += Number(item.amount || 0);
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount || 0);
      return acc;
    }, { total: 0 });
    res.json({ expenses, totals });
  } catch (error) { next(error); }
});

router.post("/employer", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureExpenses();
    const employer = await getEmployer(req);
    const data = expenseSchema.parse(req.body);
    validateDate(data.expenseDate);
    if (data.receiptImageBase64 && !data.receiptImageType) throw new AppError(400, "Receipt image type is required.");
    if (data.receiptImageBase64 && !/^[A-Za-z0-9+/]+={0,2}$/.test(data.receiptImageBase64)) throw new AppError(400, "Receipt image could not be read.");
    const row = (await db.execute(sql`
      INSERT INTO company_expenses
        (employer_id, expense_date, vendor, category, amount, payment_method, description,
         receipt_image_base64, receipt_image_type, created_by)
      VALUES
        (${employer.id}, ${data.expenseDate}::date, ${data.vendor}, ${data.category}, ${data.amount.toFixed(2)},
         ${data.paymentMethod || null}, ${data.description || null}, ${data.receiptImageBase64 || null},
         ${data.receiptImageType || null}, ${req.user!.id})
      RETURNING id, expense_date, vendor, category, amount, payment_method, description,
                receipt_image_base64, receipt_image_type, created_at
    `) as any).rows[0];
    res.status(201).json({ expense: { ...row, amount: Number(row.amount), has_receipt: Boolean(row.receipt_image_base64) } });
  } catch (error) { next(error); }
});

export default router;
