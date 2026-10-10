import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { sendEmail, escapeEmailHtml } from "../services/email.js";

const router = Router();
let clientInvoicesReady = false;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const createSchema = z.object({
  clientName: z.string().trim().min(1).max(255),
  clientEmail: z.string().trim().email().max(254).optional().or(z.literal("")),
  billingAddress: z.string().trim().max(1000).default(""),
  invoiceDate: z.string().regex(datePattern),
  dueDate: z.string().regex(datePattern),
  serviceStartDate: z.string().regex(datePattern),
  serviceEndDate: z.string().regex(datePattern),
  hourlyRate: z.coerce.number().positive().max(500),
  morningStartTime: z.string().regex(timePattern),
  morningEndTime: z.string().regex(timePattern),
  morningCaregiver: z.string().trim().min(1).max(255),
  eveningStartTime: z.string().regex(timePattern),
  eveningEndTime: z.string().regex(timePattern),
  eveningCaregiver: z.string().trim().min(1).max(255),
  includeWeekends: z.boolean().default(true),
  notes: z.string().trim().max(2000).default(""),
});
const invoiceEmailSchema = z.object({
  recipient: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  pdfBase64: z.string().min(100).max(3_200_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

async function ensureClientInvoices() {
  if (clientInvoicesReady) return;
  await ensureCoreTables();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS client_invoices (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      invoice_number VARCHAR(40) UNIQUE,
      client_name VARCHAR(255) NOT NULL,
      client_email VARCHAR(254),
      billing_address TEXT NOT NULL DEFAULT '',
      invoice_date DATE NOT NULL,
      due_date DATE NOT NULL,
      service_start_date DATE NOT NULL,
      service_end_date DATE NOT NULL,
      hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate > 0),
      service_days JSONB NOT NULL DEFAULT '[]'::jsonb,
      line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0),
      total DECIMAL(15,2) NOT NULL CHECK (total >= 0),
      notes TEXT NOT NULL DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      sent_to VARCHAR(254),
      sent_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  clientInvoicesReady = true;
}

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new AppError(400, "Enter a valid invoice or service date.");
  return date;
}
function shiftHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - sh * 60 - sm;
  if (minutes <= 0) throw new AppError(400, "Each invoice shift must end after it starts on the same day.");
  return minutes / 60;
}
async function getEmployer(req: AuthRequest) {
  if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required.");
  const matches = await db.select().from(employers).where(eq(employers.userId, req.user.id)).limit(1);
  if (matches.length) return matches[0];
  const created = await db.insert(employers).values({ userId: req.user.id, companyName: req.user.email }).returning();
  return created[0];
}

router.get("/employer", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureClientInvoices();
    const employer = await getEmployer(req);
    const result = await db.execute(sql`
      SELECT id, invoice_number, client_name, client_email, billing_address, invoice_date, due_date,
             service_start_date, service_end_date, hourly_rate, service_days, line_items, subtotal,
             total, notes, status, sent_to, sent_at, created_at
      FROM client_invoices WHERE employer_id = ${employer.id}
      ORDER BY invoice_date DESC, id DESC LIMIT 100
    `);
    res.json({ invoices: (result as any).rows });
  } catch (error) { next(error); }
});

router.post("/employer", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureClientInvoices();
    const employer = await getEmployer(req);
    const data = createSchema.parse(req.body);
    const invoiceDate = parseDate(data.invoiceDate);
    const dueDate = parseDate(data.dueDate);
    const serviceStart = parseDate(data.serviceStartDate);
    const serviceEnd = parseDate(data.serviceEndDate);
    if (dueDate < invoiceDate) throw new AppError(400, "The due date must be on or after the invoice date.");
    const daysCount = Math.floor((serviceEnd.getTime() - serviceStart.getTime()) / 86400000) + 1;
    if (daysCount < 1) throw new AppError(400, "The service end date must be on or after the start date.");
    if (daysCount > 31) throw new AppError(400, "Create invoices for no more than 31 calendar days at a time.");
    const morningHours = shiftHours(data.morningStartTime, data.morningEndTime);
    const eveningHours = shiftHours(data.eveningStartTime, data.eveningEndTime);
    const serviceDays: string[] = [];
    for (let offset = 0; offset < daysCount; offset++) {
      const day = new Date(serviceStart.getTime() + offset * 86400000);
      if (!data.includeWeekends && [0, 6].includes(day.getUTCDay())) continue;
      serviceDays.push(day.toISOString().slice(0, 10));
    }
    if (!serviceDays.length) throw new AppError(400, "The selected period contains no billable service days.");
    const rate = data.hourlyRate.toFixed(2);
    const lineItems = serviceDays.flatMap(date => [
      { serviceDate: date, description: "Morning care", caregiver: data.morningCaregiver, startTime: data.morningStartTime, endTime: data.morningEndTime, hours: morningHours, rate: Number(rate), amount: Number((morningHours * Number(rate)).toFixed(2)) },
      { serviceDate: date, description: "Evening care", caregiver: data.eveningCaregiver, startTime: data.eveningStartTime, endTime: data.eveningEndTime, hours: eveningHours, rate: Number(rate), amount: Number((eveningHours * Number(rate)).toFixed(2)) },
    ]);
    const total = Number(lineItems.reduce((sum, row) => sum + row.amount, 0).toFixed(2));
    const result = await db.execute(sql`
      WITH created AS (
        INSERT INTO client_invoices
          (employer_id, client_name, client_email, billing_address, invoice_date, due_date,
           service_start_date, service_end_date, hourly_rate, service_days, line_items,
           subtotal, total, notes, status, created_by)
        VALUES
          (${employer.id}, ${data.clientName}, ${data.clientEmail || null}, ${data.billingAddress},
           ${data.invoiceDate}::date, ${data.dueDate}::date, ${data.serviceStartDate}::date,
           ${data.serviceEndDate}::date, ${rate}, ${JSON.stringify(serviceDays)}::jsonb,
           ${JSON.stringify(lineItems)}::jsonb, ${total}, ${total}, ${data.notes}, 'draft', ${req.user!.id})
        RETURNING *
      ), numbered AS (
        UPDATE client_invoices invoice
        SET invoice_number = 'EBS-' || to_char(invoice.invoice_date, 'YYYY') || '-' || lpad(invoice.id::text, 6, '0')
        FROM created WHERE invoice.id = created.id
        RETURNING invoice.*
      ) SELECT * FROM numbered
    `);
    res.status(201).json({ invoice: (result as any).rows[0] });
  } catch (error) { next(error); }
});

router.post("/employer/:invoiceId/email", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureClientInvoices();
    const employer = await getEmployer(req);
    const id = z.coerce.number().int().positive().parse(req.params.invoiceId);
    const data = invoiceEmailSchema.parse(req.body);
    const invoice = (await db.execute(sql`
      SELECT * FROM client_invoices WHERE id = ${id} AND employer_id = ${employer.id}
    `) as any).rows[0];
    if (!invoice) throw new AppError(404, "Client invoice not found.");
    if (invoice.status !== "draft") throw new AppError(409, "Only draft invoices can be emailed.");
    const pdf = Buffer.from(data.pdfBase64, "base64");
    if (pdf.length > 2_400_000 || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-")) || !pdf.includes(Buffer.from("%%EOF"))) {
      throw new AppError(400, "The invoice PDF could not be verified. Download it again and retry.");
    }
    const sent = await sendEmail({
      from: "Elite Bridge Staffing <info@elitebridgestaffing.com>", to: data.recipient,
      subject: `Elite Bridge invoice ${invoice.invoice_number}`,
      text: `Attached is invoice ${invoice.invoice_number} for ${invoice.client_name}. Total due: $${Number(invoice.total).toFixed(2)}. Please handle this billing record securely.`,
      html: `<p>Attached is invoice <strong>${escapeEmailHtml(invoice.invoice_number)}</strong> for <strong>${escapeEmailHtml(invoice.client_name)}</strong>.</p><p>Total due: <strong>$${Number(invoice.total).toFixed(2)}</strong>.</p>`,
      attachments: [{ filename: `${invoice.invoice_number}_Invoice.pdf`, content: pdf, contentType: "application/pdf" }],
    });
    if (!sent) throw new AppError(503, "Email delivery is not configured on the Elite Bridge server.");
    await db.execute(sql`
      UPDATE client_invoices SET status = 'sent', sent_to = ${data.recipient}, sent_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP WHERE id = ${id} AND employer_id = ${employer.id} AND status = 'draft'
    `);
    res.json({ sent: true });
  } catch (error: any) {
    if (error instanceof AppError) return next(error);
    console.error("Client invoice email delivery failed", { providerStatus: error?.response?.status, providerCode: error?.code, errorName: error?.name });
    next(new AppError(502, "Email delivery failed. Check that info@elitebridgestaffing.com is verified for outbound email and that the recipient address is valid."));
  }
});

export default router;
