import { Router } from "express";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const shiftSchema = z.object({
  title: z.string().min(2),
  serviceType: z.string().min(1),
  caregiverType: z.string().min(1),
  careRecipientName: z.string().optional(),
  scheduleType: z.enum(["one_time", "recurring"]).default("one_time"),
  startDate: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.object({
    type: z.enum(["client_home", "facility", "other"]).default("client_home"),
    address: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(2).max(2),
    zipCode: z.string().min(1),
  }),
  pay: z.object({
    hourlyRate: z.number().positive(),
    currency: z.literal("USD").default("USD"),
  }),
  numberOfCaregivers: z.number().int().positive().default(1),
  requirements: z.array(z.string()).default([]),
  responsibilities: z.string().min(1),
  notes: z.string().optional(),
  contact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
  }),
  urgency: z.enum(["standard", "urgent"]).default("standard"),
});

let shiftTableReady = false;

async function ensureShiftPostsTable() {
  if (shiftTableReady) return;
  await ensureCoreTables();
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shift_posts (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      service_type VARCHAR(100) NOT NULL,
      caregiver_type VARCHAR(100) NOT NULL,
      care_recipient_name VARCHAR(255),
      schedule_type VARCHAR(50) NOT NULL DEFAULT 'one_time',
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      location_type VARCHAR(50) NOT NULL DEFAULT 'client_home',
      address VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(2) NOT NULL DEFAULT 'MA',
      zip_code VARCHAR(20) NOT NULL,
      hourly_rate DECIMAL(10,2) NOT NULL,
      number_of_caregivers INTEGER NOT NULL DEFAULT 1,
      requirements JSON DEFAULT '[]',
      responsibilities TEXT NOT NULL,
      notes TEXT,
      contact_name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(50) NOT NULL,
      urgency VARCHAR(50) NOT NULL DEFAULT 'standard',
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shift_activities (
      id SERIAL PRIMARY KEY,
      shift_id INTEGER NOT NULL REFERENCES shift_posts(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      location JSONB,
      notes TEXT
    )
  `);
  
  shiftTableReady = true;
}

async function getOrCreateEmployer(req: AuthRequest) {
  const employerList = await db.select().from(employers).where(eq(employers.userId, req.user!.id)).limit(1);
  if (employerList.length > 0) return employerList[0];
  
  const created = await db.insert(employers).values({
    userId: req.user!.id,
    companyName: req.user!.email,
  }).returning();
  return created[0];
}

function combineDateAndTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) throw new AppError(400, "Invalid shift date or time");
  return value;
}

function mapShift(row: any) {
  return {
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    serviceType: row.service_type,
    caregiverType: row.caregiver_type,
    careRecipientName: row.care_recipient_name,
    scheduleType: row.schedule_type,
    startTime: row.start_time,
    endTime: row.end_time,
    location: {
      type: row.location_type,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    hourlyRate: Number(row.hourly_rate),
    numberOfCaregivers: row.number_of_caregivers,
    requirements: row.requirements || [],
    responsibilities: row.responsibilities,
    notes: row.notes,
    contact: {
      name: row.contact_name,
      phone: row.contact_phone,
    },
    urgency: row.urgency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Routes
router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const data = shiftSchema.parse(req.body);
    const startDateTime = combineDateAndTime(data.startDate, data.startTime);
    const endDateTime = combineDateAndTime(data.startDate, data.endTime);
    
    const result = await db.execute(sql`
      INSERT INTO shift_posts (
        employer_id, title, service_type, caregiver_type, care_recipient_name,
        schedule_type, start_time, end_time, location_type, address, city, state,
        zip_code, hourly_rate, number_of_caregivers, requirements, responsibilities,
        notes, contact_name, contact_phone, urgency, status
      ) VALUES (
        ${employer.id}, ${data.title}, ${data.serviceType}, ${data.caregiverType}, ${data.careRecipientName || null},
        ${data.scheduleType}, ${startDateTime}, ${endDateTime}, ${data.location.type}, ${data.location.address},
        ${data.location.city}, ${data.location.state}, ${data.location.zipCode}, ${data.pay.hourlyRate.toString()},
        ${data.numberOfCaregivers}, ${JSON.stringify(data.requirements)}, ${data.responsibilities},
        ${data.notes || null}, ${data.contact.name}, ${data.contact.phone}, ${data.urgency}, 'open'
      )
      RETURNING *
    `);
    res.status(201).json({ shift: mapShift((result as any).rows[0]) });
  } catch (error) { next(error); }
});

router.get("/employer/my", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`SELECT * FROM shift_posts WHERE employer_id = ${employer.id} ORDER BY created_at DESC`);
    res.json({ shifts: (result as any).rows.map(mapShift) });
  } catch (error) { next(error); }
});

// Clock-in route for caregivers
router.post("/:shiftId/clock-in", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const shiftId = parseInt(req.params.shiftId);
    await db.execute(sql`
      INSERT INTO shift_activities (shift_id, caregiver_id, type)
      VALUES (${shiftId}, ${req.user!.id}, 'clock_in')
    `);
    res.json({ message: "Clocked in successfully" });
  } catch (error) { next(error); }
});

// Clock-out route for caregivers
router.post("/:shiftId/clock-out", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const shiftId = parseInt(req.params.shiftId);
    await db.execute(sql`
      INSERT INTO shift_activities (shift_id, caregiver_id, type)
      VALUES (${shiftId}, ${req.user!.id}, 'clock_out')
    `);
    res.json({ message: "Clocked out successfully" });
  } catch (error) { next(error); }
});

// Get activities for employer monitoring
router.get("/activities", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      SELECT sa.*, sp.title as shift_title, u.first_name, u.last_name
      FROM shift_activities sa
      JOIN shift_posts sp ON sa.shift_id = sp.id
      JOIN users u ON sa.caregiver_id = u.id
      WHERE sp.employer_id = ${employer.id}
      ORDER BY sa.timestamp DESC
      LIMIT 50
    `);
    res.json({ activities: (result as any).rows });
  } catch (error) { next(error); }
});

router.put("/:shiftId/close", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      UPDATE shift_posts SET status = 'closed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number(req.params.shiftId)} AND employer_id = ${employer.id}
      RETURNING *
    `);
    if (!(result as any).rows[0]) throw new AppError(404, "Shift not found");
    res.json({ shift: mapShift((result as any).rows[0]) });
  } catch (error) { next(error); }
});

export default router;
