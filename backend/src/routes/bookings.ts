import { Router } from "express";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { caregivers, employers } from "../db/schema";
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

const applicationActionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shift_applications (
      id SERIAL PRIMARY KEY,
      shift_id INTEGER NOT NULL REFERENCES shift_posts(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (shift_id, caregiver_id)
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_posts_status_start_idx ON shift_posts(status, start_time)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_applications_shift_idx ON shift_applications(shift_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_applications_caregiver_idx ON shift_applications(caregiver_id)`);

  shiftTableReady = true;
}

function requireRole(req: AuthRequest, role: "caregiver" | "employer") {
  if (!req.user || req.user.role !== role) {
    throw new AppError(403, `${role === "caregiver" ? "Caregiver" : "Employer"} access required`);
  }
}

async function getOrCreateEmployer(req: AuthRequest) {
  requireRole(req, "employer");
  const employerList = await db.select().from(employers).where(eq(employers.userId, req.user!.id)).limit(1);
  if (employerList.length > 0) return employerList[0];

  const created = await db.insert(employers).values({
    userId: req.user!.id,
    companyName: req.user!.email,
  }).returning();
  return created[0];
}

async function getOrCreateCaregiver(req: AuthRequest) {
  requireRole(req, "caregiver");
  const caregiverList = await db.select().from(caregivers).where(eq(caregivers.userId, req.user!.id)).limit(1);
  if (caregiverList.length > 0) return caregiverList[0];

  const created = await db.insert(caregivers).values({
    userId: req.user!.id,
    hourlyRate: "0",
    specialties: [],
    certifications: [],
    isAvailable: true,
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
    employerName: row.company_name || undefined,
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
    applicationStatus: row.application_status || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const data = shiftSchema.parse(req.body);
    const startDateTime = combineDateAndTime(data.startDate, data.startTime);
    const endDateTime = combineDateAndTime(data.startDate, data.endTime);
    if (endDateTime <= startDateTime) throw new AppError(400, "Shift end time must be after start time");

    const result = await db.execute(sql`
      INSERT INTO shift_posts (
        employer_id, title, service_type, caregiver_type, care_recipient_name,
        schedule_type, start_time, end_time, location_type, address, city, state,
        zip_code, hourly_rate, number_of_caregivers, requirements, responsibilities,
        notes, contact_name, contact_phone, urgency, status
      ) VALUES (
        ${employer.id}, ${data.title}, ${data.serviceType}, ${data.caregiverType}, ${data.careRecipientName || null},
        ${data.scheduleType}, ${startDateTime}, ${endDateTime}, ${data.location.type}, ${data.location.address},
        ${data.location.city}, ${data.location.state.toUpperCase()}, ${data.location.zipCode}, ${data.pay.hourlyRate.toString()},
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
    const result = await db.execute(sql`
      SELECT sp.*, e.company_name
      FROM shift_posts sp
      JOIN employers e ON e.id = sp.employer_id
      WHERE sp.employer_id = ${employer.id}
      ORDER BY sp.start_time ASC, sp.created_at DESC
    `);
    res.json({ shifts: (result as any).rows.map(mapShift) });
  } catch (error) { next(error); }
});

router.get("/open", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const result = await db.execute(sql`
      SELECT sp.*, e.company_name, sa.status AS application_status
      FROM shift_posts sp
      JOIN employers e ON e.id = sp.employer_id
      LEFT JOIN shift_applications sa
        ON sa.shift_id = sp.id AND sa.caregiver_id = ${caregiver.id}
      WHERE sp.status = 'open'
        AND sp.start_time >= CURRENT_TIMESTAMP - INTERVAL '12 hours'
      ORDER BY CASE WHEN sp.urgency = 'urgent' THEN 0 ELSE 1 END, sp.start_time ASC
      LIMIT 100
    `);
    res.json({ shifts: (result as any).rows.map(mapShift) });
  } catch (error) { next(error); }
});

router.post("/:shiftId/apply", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId)) throw new AppError(400, "Invalid shift ID");
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

    const shiftResult = await db.execute(sql`SELECT * FROM shift_posts WHERE id = ${shiftId} AND status = 'open' LIMIT 1`);
    if (!(shiftResult as any).rows[0]) throw new AppError(404, "Open shift not found");

    const result = await db.execute(sql`
      INSERT INTO shift_applications (shift_id, caregiver_id, status, note)
      VALUES (${shiftId}, ${caregiver.id}, 'pending', ${note || null})
      ON CONFLICT (shift_id, caregiver_id)
      DO UPDATE SET note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);

    res.status(201).json({ application: (result as any).rows[0] });
  } catch (error) { next(error); }
});

router.get("/caregiver/my-applications", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const result = await db.execute(sql`
      SELECT sa.id AS application_id, sa.status AS application_status, sa.note AS application_note,
             sa.created_at AS applied_at, sp.*, e.company_name
      FROM shift_applications sa
      JOIN shift_posts sp ON sp.id = sa.shift_id
      JOIN employers e ON e.id = sp.employer_id
      WHERE sa.caregiver_id = ${caregiver.id}
      ORDER BY sa.created_at DESC
    `);
    res.json({
      applications: (result as any).rows.map((row: any) => ({
        id: row.application_id,
        status: row.application_status,
        note: row.application_note,
        appliedAt: row.applied_at,
        shift: mapShift(row),
      })),
    });
  } catch (error) { next(error); }
});

router.get("/employer/applications", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      SELECT sa.*, sp.title AS shift_title, sp.service_type, sp.start_time, sp.end_time,
             sp.city, sp.state, u.id AS caregiver_user_id, u.first_name, u.last_name, u.email,
             c.rating, c.total_hours, c.certifications
      FROM shift_applications sa
      JOIN shift_posts sp ON sp.id = sa.shift_id
      JOIN caregivers c ON c.id = sa.caregiver_id
      JOIN users u ON u.id = c.user_id
      WHERE sp.employer_id = ${employer.id}
      ORDER BY CASE WHEN sa.status = 'pending' THEN 0 ELSE 1 END, sa.created_at DESC
    `);
    res.json({ applications: (result as any).rows });
  } catch (error) { next(error); }
});

router.patch("/employer/applications/:applicationId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const applicationId = Number(req.params.applicationId);
    const { status } = applicationActionSchema.parse(req.body);

    const lookup = await db.execute(sql`
      SELECT sa.*, sp.employer_id, sp.start_time, sp.end_time, sp.service_type,
             sp.hourly_rate, sp.notes AS shift_notes, c.user_id AS caregiver_user_id
      FROM shift_applications sa
      JOIN shift_posts sp ON sp.id = sa.shift_id
      JOIN caregivers c ON c.id = sa.caregiver_id
      WHERE sa.id = ${applicationId} AND sp.employer_id = ${employer.id}
      LIMIT 1
    `);
    const application = (lookup as any).rows[0];
    if (!application) throw new AppError(404, "Application not found");

    const updated = await db.execute(sql`
      UPDATE shift_applications
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${applicationId}
      RETURNING *
    `);

    if (status === "approved") {
      await db.execute(sql`
        UPDATE shift_applications
        SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE shift_id = ${application.shift_id} AND id <> ${applicationId} AND status = 'pending'
      `);
      await db.execute(sql`
        UPDATE shift_posts SET status = 'assigned', updated_at = CURRENT_TIMESTAMP
        WHERE id = ${application.shift_id}
      `);

      const start = new Date(application.start_time);
      const end = new Date(application.end_time);
      const hours = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
      const rate = Number(application.hourly_rate);
      const total = Number((hours * rate).toFixed(2));

      await db.execute(sql`
        INSERT INTO bookings (
          caregiver_id, employer_id, start_time, end_time, service_type,
          status, hourly_rate, total_amount, notes
        )
        SELECT ${application.caregiver_id}, ${employer.id}, ${start}, ${end}, ${application.service_type},
               'confirmed', ${rate.toString()}, ${total.toString()}, ${application.shift_notes || null}
        WHERE NOT EXISTS (
          SELECT 1 FROM bookings
          WHERE caregiver_id = ${application.caregiver_id}
            AND employer_id = ${employer.id}
            AND start_time = ${start}
            AND end_time = ${end}
        )
      `);

      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (
          ${application.caregiver_user_id}, 'shift_application', 'Shift approved',
          'Your Elite Bridge shift application was approved. Open the caregiver app for the assignment details.',
          ${application.shift_id}
        )
      `);
    } else {
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (
          ${application.caregiver_user_id}, 'shift_application', 'Application update',
          'The agency selected another caregiver for this shift. New opportunities are available in Elite Bridge.',
          ${application.shift_id}
        )
      `);
    }

    res.json({ application: (updated as any).rows[0] });
  } catch (error) { next(error); }
});

router.post("/:shiftId/clock-in", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = parseInt(req.params.shiftId);
    await db.execute(sql`
      INSERT INTO shift_activities (shift_id, caregiver_id, type)
      VALUES (${shiftId}, ${caregiver.id}, 'clock_in')
    `);
    res.json({ message: "Clocked in successfully" });
  } catch (error) { next(error); }
});

router.post("/:shiftId/clock-out", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = parseInt(req.params.shiftId);
    await db.execute(sql`
      INSERT INTO shift_activities (shift_id, caregiver_id, type)
      VALUES (${shiftId}, ${caregiver.id}, 'clock_out')
    `);
    res.json({ message: "Clocked out successfully" });
  } catch (error) { next(error); }
});

router.get("/activities", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      SELECT sa.*, sp.title as shift_title, u.first_name, u.last_name
      FROM shift_activities sa
      JOIN shift_posts sp ON sa.shift_id = sp.id
      JOIN caregivers c ON sa.caregiver_id = c.id
      JOIN users u ON c.user_id = u.id
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