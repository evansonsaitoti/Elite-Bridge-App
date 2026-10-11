import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
let clientLocationsReady = false;

const clientLocationSchema = z.object({
  clientName: z.string().trim().min(1).max(255),
  locationName: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).optional().default(""),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(2).max(2).transform(value => value.toUpperCase()),
  zipCode: z.string().trim().max(20).optional().default(""),
  contactName: z.string().trim().max(255).optional().default(""),
  contactPhone: z.string().trim().max(40).optional().default(""),
  billingRate: z.coerce.number().positive().max(500),
  caregiverRate: z.coerce.number().positive().max(500),
  notes: z.string().trim().max(2000).optional().default(""),
});

async function ensureClientLocations() {
  if (clientLocationsReady) return;
  await ensureCoreTables();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS client_locations (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      client_name VARCHAR(255) NOT NULL,
      location_name VARCHAR(120) NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      city VARCHAR(120) NOT NULL,
      state VARCHAR(2) NOT NULL,
      zip_code VARCHAR(20),
      contact_name VARCHAR(255),
      contact_phone VARCHAR(40),
      billing_rate DECIMAL(10,2) NOT NULL CHECK (billing_rate > 0),
      caregiver_rate DECIMAL(10,2) NOT NULL CHECK (caregiver_rate > 0),
      notes TEXT NOT NULL DEFAULT '',
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  clientLocationsReady = true;
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
    await ensureClientLocations();
    const employer = await getEmployer(req);
    const rows = (await db.execute(sql`
      SELECT id, client_name, location_name, address, city, state, zip_code, contact_name,
             contact_phone, billing_rate, caregiver_rate, notes, created_at, updated_at
      FROM client_locations
      WHERE employer_id = ${employer.id}
      ORDER BY client_name ASC, location_name ASC, id DESC
      LIMIT 200
    `) as any).rows;
    res.json({ clients: rows.map((row: any) => ({
      id: row.id,
      clientName: row.client_name,
      locationName: row.location_name,
      address: row.address || "",
      city: row.city,
      state: row.state,
      zipCode: row.zip_code || "",
      contactName: row.contact_name || "",
      contactPhone: row.contact_phone || "",
      billingRate: Number(row.billing_rate),
      caregiverRate: Number(row.caregiver_rate),
      notes: row.notes || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) });
  } catch (error) { next(error); }
});

router.post("/employer", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureClientLocations();
    const employer = await getEmployer(req);
    const data = clientLocationSchema.parse(req.body);
    const row = (await db.execute(sql`
      INSERT INTO client_locations
        (employer_id, client_name, location_name, address, city, state, zip_code, contact_name,
         contact_phone, billing_rate, caregiver_rate, notes, created_by)
      VALUES
        (${employer.id}, ${data.clientName}, ${data.locationName}, ${data.address}, ${data.city},
         ${data.state}, ${data.zipCode || null}, ${data.contactName || null}, ${data.contactPhone || null},
         ${data.billingRate.toFixed(2)}, ${data.caregiverRate.toFixed(2)}, ${data.notes}, ${req.user!.id})
      RETURNING id, client_name, location_name, address, city, state, zip_code, contact_name,
                contact_phone, billing_rate, caregiver_rate, notes, created_at, updated_at
    `) as any).rows[0];
    res.status(201).json({ client: {
      id: row.id,
      clientName: row.client_name,
      locationName: row.location_name,
      address: row.address || "",
      city: row.city,
      state: row.state,
      zipCode: row.zip_code || "",
      contactName: row.contact_name || "",
      contactPhone: row.contact_phone || "",
      billingRate: Number(row.billing_rate),
      caregiverRate: Number(row.caregiver_rate),
      notes: row.notes || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } });
  } catch (error) { next(error); }
});

export default router;
