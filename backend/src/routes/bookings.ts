import { Router } from "express";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { caregivers, employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { sendPushToUsers } from "../services/notifications";

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
  assignmentMode: z.enum(["instant", "review"]).default("instant"),
});

const applicationActionSchema = z.object({ status: z.enum(["approved", "rejected"]) });
const calloutSchema = z.object({
  reason: z.enum(["illness", "family_emergency", "transportation", "schedule_conflict", "other"]),
  note: z.string().max(500).optional(),
});
const offerResponseSchema = z.object({ status: z.enum(["accepted", "declined"]) });

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
      assignment_mode VARCHAR(20) NOT NULL DEFAULT 'instant',
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(20) NOT NULL DEFAULT 'instant'`);

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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shift_callouts (
      id SERIAL PRIMARY KEY,
      shift_id INTEGER NOT NULL REFERENCES shift_posts(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      reason VARCHAR(50) NOT NULL,
      note TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS replacement_offers (
      id SERIAL PRIMARY KEY,
      callout_id INTEGER NOT NULL REFERENCES shift_callouts(id) ON DELETE CASCADE,
      shift_id INTEGER NOT NULL REFERENCES shift_posts(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      rationale TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'offered',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP,
      UNIQUE (callout_id, caregiver_id)
    )
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_posts_status_start_idx ON shift_posts(status, start_time)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_applications_shift_idx ON shift_applications(shift_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_applications_caregiver_idx ON shift_applications(caregiver_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_callouts_shift_idx ON shift_callouts(shift_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS replacement_offers_caregiver_idx ON replacement_offers(caregiver_id, status)`);

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
  const created = await db.insert(employers).values({ userId: req.user!.id, companyName: req.user!.email }).returning();
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
    contact: { name: row.contact_name, phone: row.contact_phone },
    urgency: row.urgency,
    assignmentMode: row.assignment_mode || "instant",
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
        notes, contact_name, contact_phone, urgency, assignment_mode, status
      ) VALUES (
        ${employer.id}, ${data.title}, ${data.serviceType}, ${data.caregiverType}, ${data.careRecipientName || null},
        ${data.scheduleType}, ${startDateTime}, ${endDateTime}, ${data.location.type}, ${data.location.address},
        ${data.location.city}, ${data.location.state.toUpperCase()}, ${data.location.zipCode}, ${data.pay.hourlyRate.toString()},
        ${data.numberOfCaregivers}, ${JSON.stringify(data.requirements)}, ${data.responsibilities},
        ${data.notes || null}, ${data.contact.name}, ${data.contact.phone}, ${data.urgency}, ${data.assignmentMode}, 'open'
      )
      RETURNING *
    `);
    const createdShift = (result as any).rows[0];
    const matches = await db.execute(sql`
      SELECT c.user_id
      FROM caregivers c JOIN users u ON u.id = c.user_id
      WHERE c.is_available = true AND u.is_active = true
        AND (
          COALESCE(json_array_length(c.certifications), 0) = 0
          OR LOWER(c.certifications::text) LIKE ${`%${data.caregiverType.toLowerCase()}%`}
          OR LOWER(c.specialties::text) LIKE ${`%${data.serviceType.toLowerCase()}%`}
        )
      LIMIT 100
    `);
    const matchedUserIds = (matches as any).rows.map((row: any) => row.user_id);
    for (const userId of matchedUserIds) {
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (${userId}, 'shift_offer', ${data.urgency === "urgent" ? "Urgent matched shift" : "New matched shift"},
          ${`${data.serviceType} in ${data.location.city}, ${data.location.state.toUpperCase()} · $${data.pay.hourlyRate}/hr`}, ${createdShift.id})
      `);
    }
    void sendPushToUsers(matchedUserIds, {
      title: data.urgency === "urgent" ? "Urgent matched shift" : "New matched shift",
      body: `${data.serviceType} in ${data.location.city}, ${data.location.state.toUpperCase()} · $${data.pay.hourlyRate}/hr`,
      data: { type: "new_shift_offer", shiftId: createdShift.id, assignmentMode: data.assignmentMode },
    });
    res.status(201).json({ shift: mapShift(createdShift), matchedCaregivers: matchedUserIds.length });
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
      LEFT JOIN shift_applications sa ON sa.shift_id = sp.id AND sa.caregiver_id = ${caregiver.id}
      WHERE sp.status = 'open'
        AND sp.start_time >= CURRENT_TIMESTAMP - INTERVAL '12 hours'
        AND c.is_available = true
        AND (
          COALESCE(json_array_length(c.certifications), 0) = 0
          OR LOWER(c.certifications::text) LIKE '%' || LOWER(sp.caregiver_type) || '%'
          OR LOWER(c.specialties::text) LIKE '%' || LOWER(sp.service_type) || '%'
        )
      ORDER BY CASE WHEN sp.urgency = 'urgent' THEN 0 ELSE 1 END, sp.start_time ASC
      LIMIT 100
    `);
    res.json({ shifts: (result as any).rows.map(mapShift) });
  } catch (error) { next(error); }
});

// Qualified caregivers can claim instant-assignment shifts. The conditional
// status update is the concurrency guard: only the first eligible claimant wins.
router.post("/:shiftId/claim", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId)) throw new AppError(400, "Invalid shift ID");

    const eligibility = await db.execute(sql`
      SELECT sp.*, e.user_id AS employer_user_id
      FROM shift_posts sp
      JOIN employers e ON e.id = sp.employer_id
      JOIN caregivers c ON c.id = ${caregiver.id}
      WHERE sp.id = ${shiftId} AND sp.status = 'open' AND sp.assignment_mode = 'instant'
        AND c.is_available = true
        AND (
          COALESCE(json_array_length(c.certifications), 0) = 0
          OR LOWER(c.certifications::text) LIKE '%' || LOWER(sp.caregiver_type) || '%'
          OR LOWER(c.specialties::text) LIKE '%' || LOWER(sp.service_type) || '%'
        )
      LIMIT 1
    `);
    const shift = (eligibility as any).rows[0];
    if (!shift) throw new AppError(409, "This shift is unavailable or does not match your current qualifications");

    const claimed = await db.execute(sql`
      UPDATE shift_posts SET status = 'assigned', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${shiftId} AND status = 'open' RETURNING id
    `);
    if (!(claimed as any).rows[0]) throw new AppError(409, "Another caregiver already claimed this shift");

    const application = await db.execute(sql`
      INSERT INTO shift_applications (shift_id, caregiver_id, status, note)
      VALUES (${shiftId}, ${caregiver.id}, 'approved', 'Claimed a matched instant shift offer.')
      ON CONFLICT (shift_id, caregiver_id)
      DO UPDATE SET status = 'approved', note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    await db.execute(sql`
      UPDATE shift_applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE shift_id = ${shiftId} AND caregiver_id <> ${caregiver.id} AND status = 'pending'
    `);
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const hours = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
    const total = Number((hours * Number(shift.hourly_rate)).toFixed(2));
    await db.execute(sql`
      INSERT INTO bookings (caregiver_id, employer_id, start_time, end_time, service_type, status, hourly_rate, total_amount, notes)
      VALUES (${caregiver.id}, ${shift.employer_id}, ${start}, ${end}, ${shift.service_type}, 'confirmed', ${String(shift.hourly_rate)}, ${String(total)}, ${shift.notes || null})
    `);
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (${shift.employer_user_id}, 'shift_claimed', 'Shift claimed', 'A qualified caregiver claimed your matched shift offer.', ${shiftId})
    `);
    void sendPushToUsers([shift.employer_user_id], {
      title: "Shift claimed",
      body: `A qualified caregiver claimed ${shift.title}.`,
      data: { type: "shift_claimed", shiftId, applicationId: (application as any).rows[0].id },
    });
    res.json({ application: (application as any).rows[0], shift: { id: shiftId, status: "assigned" } });
  } catch (error) { next(error); }
});

router.patch("/employer/:shiftId/cancel", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId)) throw new AppError(400, "Invalid shift ID");
    const updated = await db.execute(sql`
      UPDATE shift_posts SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${shiftId} AND employer_id = ${employer.id} AND status IN ('open', 'assigned') RETURNING id
    `);
    if (!(updated as any).rows[0]) throw new AppError(409, "This shift cannot be cancelled");
    await db.execute(sql`UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Cancelled by employer', cancelled_by = 'employer', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE employer_id = ${employer.id} AND status IN ('pending', 'confirmed') AND start_time = (SELECT start_time FROM shift_posts WHERE id = ${shiftId})`);
    const caregiversResult = await db.execute(sql`SELECT c.user_id FROM shift_applications sa JOIN caregivers c ON c.id = sa.caregiver_id WHERE sa.shift_id = ${shiftId} AND sa.status = 'approved'`);
    const caregiverUserIds = (caregiversResult as any).rows.map((row: any) => row.user_id);
    void sendPushToUsers(caregiverUserIds, { title: "Shift cancelled", body: "The employer cancelled an assigned Elite Bridge shift.", data: { type: "shift_cancelled", shiftId } });
    res.status(204).send();
  } catch (error) { next(error); }
});

router.post("/:shiftId/apply", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId)) throw new AppError(400, "Invalid shift ID");
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

    const shiftResult = await db.execute(sql`
      SELECT sp.*, e.user_id AS employer_user_id
      FROM shift_posts sp
      JOIN employers e ON e.id = sp.employer_id
      WHERE sp.id = ${shiftId} AND sp.status = 'open'
      LIMIT 1
    `);
    const shift = (shiftResult as any).rows[0];
    if (!shift) throw new AppError(404, "Open shift not found");

    const result = await db.execute(sql`
      INSERT INTO shift_applications (shift_id, caregiver_id, status, note)
      VALUES (${shiftId}, ${caregiver.id}, 'pending', ${note || null})
      ON CONFLICT (shift_id, caregiver_id)
      DO UPDATE SET status = 'pending', note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    void sendPushToUsers([shift.employer_user_id], {
      title: "New caregiver application",
      body: `A caregiver applied for ${shift.title}.`,
      data: { type: "new_application", shiftId, applicationId: (result as any).rows[0].id },
    });
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
    res.json({ applications: (result as any).rows.map((row: any) => ({
      id: row.application_id,
      status: row.application_status,
      note: row.application_note,
      appliedAt: row.applied_at,
      shift: mapShift(row),
    })) });
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
      UPDATE shift_applications SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${applicationId} RETURNING *
    `);

    if (status === "approved") {
      const competingResult = await db.execute(sql`
        SELECT c.user_id
        FROM shift_applications sa
        JOIN caregivers c ON c.id = sa.caregiver_id
        WHERE sa.shift_id = ${application.shift_id} AND sa.id <> ${applicationId} AND sa.status = 'pending'
      `);
      const competingUserIds = (competingResult as any).rows.map((row: any) => row.user_id);
      await db.execute(sql`
        UPDATE shift_applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE shift_id = ${application.shift_id} AND id <> ${applicationId} AND status = 'pending'
      `);
      await db.execute(sql`
        UPDATE shift_posts SET status = 'assigned', updated_at = CURRENT_TIMESTAMP WHERE id = ${application.shift_id}
      `);

      const start = new Date(application.start_time);
      const end = new Date(application.end_time);
      const hours = Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
      const rate = Number(application.hourly_rate);
      const total = Number((hours * rate).toFixed(2));

      await db.execute(sql`
        INSERT INTO bookings (caregiver_id, employer_id, start_time, end_time, service_type, status, hourly_rate, total_amount, notes)
        SELECT ${application.caregiver_id}, ${employer.id}, ${start}, ${end}, ${application.service_type},
               'confirmed', ${rate.toString()}, ${total.toString()}, ${application.shift_notes || null}
        WHERE NOT EXISTS (
          SELECT 1 FROM bookings
          WHERE caregiver_id = ${application.caregiver_id} AND employer_id = ${employer.id}
            AND start_time = ${start} AND end_time = ${end} AND status <> 'cancelled'
        )
      `);

      await db.execute(sql`
        UPDATE shift_callouts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
        WHERE shift_id = ${application.shift_id} AND status = 'open'
      `);
      await db.execute(sql`
        UPDATE replacement_offers
        SET status = CASE WHEN caregiver_id = ${application.caregiver_id} THEN 'accepted' ELSE 'expired' END,
            responded_at = CASE WHEN caregiver_id = ${application.caregiver_id} THEN COALESCE(responded_at, CURRENT_TIMESTAMP) ELSE responded_at END
        WHERE shift_id = ${application.shift_id} AND status IN ('offered', 'accepted')
      `);

      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (${application.caregiver_user_id}, 'shift_application', 'Shift approved',
          'Your Elite Bridge shift application was approved. Open the caregiver app for the assignment details.',
          ${application.shift_id})
      `);
      void sendPushToUsers([application.caregiver_user_id], {
        title: "Shift approved",
        body: "Your shift application was approved. Open Elite Bridge Caregiver for assignment details.",
        data: { type: "application_approved", shiftId: application.shift_id },
      });
      if (competingUserIds.length) {
        for (const userId of competingUserIds) {
          await db.execute(sql`
            INSERT INTO notifications (user_id, type, title, message, related_id)
            VALUES (${userId}, 'shift_application', 'Application update',
              'The agency selected another caregiver for this shift. New opportunities are available in Elite Bridge.',
              ${application.shift_id})
          `);
        }
        void sendPushToUsers(competingUserIds, {
          title: "Application update",
          body: "The agency selected another caregiver for this shift. New opportunities are available.",
          data: { type: "application_rejected", shiftId: application.shift_id },
        });
      }
    } else {
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (${application.caregiver_user_id}, 'shift_application', 'Application update',
          'The agency selected another caregiver for this shift. New opportunities are available in Elite Bridge.',
          ${application.shift_id})
      `);
      void sendPushToUsers([application.caregiver_user_id], {
        title: "Application update",
        body: "The agency selected another caregiver for this shift. New opportunities are available.",
        data: { type: "application_rejected", shiftId: application.shift_id },
      });
    }

    res.json({ application: (updated as any).rows[0] });
  } catch (error) { next(error); }
});

// Caregiver reports that an approved assignment can no longer be worked.
// Elite reopens the shift as urgent, records the operational event and alerts the agency.
router.post("/:shiftId/callout", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = Number(req.params.shiftId);
    const data = calloutSchema.parse(req.body);

    const assignmentResult = await db.execute(sql`
      SELECT sp.*, sa.id AS application_id, e.user_id AS employer_user_id
      FROM shift_posts sp
      JOIN shift_applications sa ON sa.shift_id = sp.id
      JOIN employers e ON e.id = sp.employer_id
      WHERE sp.id = ${shiftId} AND sa.caregiver_id = ${caregiver.id}
        AND sa.status = 'approved' AND sp.status = 'assigned'
      LIMIT 1
    `);
    const assignment = (assignmentResult as any).rows[0];
    if (!assignment) throw new AppError(404, "Active assigned shift not found");

    const existing = await db.execute(sql`
      SELECT id FROM shift_callouts WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiver.id} AND status = 'open' LIMIT 1
    `);
    if ((existing as any).rows[0]) throw new AppError(409, "A call-out is already open for this shift");

    const callout = await db.execute(sql`
      INSERT INTO shift_callouts (shift_id, caregiver_id, reason, note, status)
      VALUES (${shiftId}, ${caregiver.id}, ${data.reason}, ${data.note || null}, 'open')
      RETURNING *
    `);

    await db.execute(sql`
      UPDATE shift_applications SET status = 'callout', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${assignment.application_id}
    `);
    void sendPushToUsers([assignment.employer_user_id], {
      title: "Urgent shift call-out",
      body: `A caregiver called out of ${assignment.title}. The shift has been reopened as urgent.`,
      data: { type: "shift_callout", shiftId },
    });
    await db.execute(sql`
      UPDATE shift_posts SET status = 'open', urgency = 'urgent', updated_at = CURRENT_TIMESTAMP WHERE id = ${shiftId}
    `);
    await db.execute(sql`
      UPDATE bookings
      SET status = 'cancelled', cancellation_reason = ${data.reason}, cancelled_by = 'caregiver',
          cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE caregiver_id = ${caregiver.id} AND employer_id = ${assignment.employer_id}
        AND start_time = ${new Date(assignment.start_time)} AND end_time = ${new Date(assignment.end_time)}
        AND status IN ('pending', 'confirmed')
    `);
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (${assignment.employer_user_id}, 'callout', 'Urgent shift call-out',
        'A caregiver called out of an assigned shift. Elite reopened it as urgent and it is ready for Coverage Copilot.',
        ${shiftId})
    `);

    res.status(201).json({ callout: (callout as any).rows[0], shift: { id: shiftId, status: "open", urgency: "urgent" } });
  } catch (error) { next(error); }
});

router.get("/employer/callouts", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      SELECT sc.id, sc.shift_id, sc.reason, sc.note, sc.status, sc.created_at, sc.resolved_at,
             sp.title, sp.service_type, sp.care_recipient_name, sp.start_time, sp.end_time,
             sp.city, sp.state, sp.hourly_rate, sp.urgency,
             u.first_name, u.last_name,
             COUNT(ro.id)::int AS offers_sent,
             COUNT(ro.id) FILTER (WHERE ro.status = 'accepted')::int AS offers_accepted
      FROM shift_callouts sc
      JOIN shift_posts sp ON sp.id = sc.shift_id
      JOIN caregivers c ON c.id = sc.caregiver_id
      JOIN users u ON u.id = c.user_id
      LEFT JOIN replacement_offers ro ON ro.callout_id = sc.id
      WHERE sp.employer_id = ${employer.id}
      GROUP BY sc.id, sp.id, u.id
      ORDER BY CASE WHEN sc.status = 'open' THEN 0 ELSE 1 END, sc.created_at DESC
    `);
    res.json({ callouts: (result as any).rows });
  } catch (error) { next(error); }
});

// Human-triggered rescue: rank available caregivers and send priority offers.
// This does not assign anyone. Caregivers opt in and the employer still approves the application.
router.post("/employer/callouts/:calloutId/launch-rescue", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const calloutId = Number(req.params.calloutId);

    const calloutResult = await db.execute(sql`
      SELECT sc.*, sp.title, sp.shift_id, sp.start_time, sp.city, sp.state
      FROM shift_callouts sc
      JOIN LATERAL (SELECT id AS shift_id, title, start_time, city, state, employer_id FROM shift_posts WHERE id = sc.shift_id) sp ON true
      WHERE sc.id = ${calloutId} AND sp.employer_id = ${employer.id} AND sc.status = 'open'
      LIMIT 1
    `);
    const callout = (calloutResult as any).rows[0];
    if (!callout) throw new AppError(404, "Open call-out not found");

    const candidatesResult = await db.execute(sql`
      SELECT c.id AS caregiver_id, c.user_id, c.rating, c.total_hours, c.certifications, c.is_available,
             u.first_name, u.last_name
      FROM caregivers c
      JOIN users u ON u.id = c.user_id
      WHERE c.id <> ${callout.caregiver_id} AND c.is_available = true AND u.is_active = true
      ORDER BY c.rating DESC NULLS LAST, c.total_hours ASC NULLS FIRST
      LIMIT 8
    `);

    const ranked = (candidatesResult as any).rows
      .map((row: any) => {
        const rating = Number(row.rating || 0);
        const hours = Number(row.total_hours || 0);
        const certifications = Array.isArray(row.certifications) ? row.certifications.length : 0;
        const score = Math.max(45, Math.min(99, Math.round(58 + rating * 5 + Math.max(0, 15 - hours / 3) + Math.min(8, certifications * 2))));
        const rationale = `${score}% fit · available now · ${hours.toFixed(0)} hrs logged · ${certifications} credential${certifications === 1 ? "" : "s"}`;
        return { ...row, score, rationale };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    for (const candidate of ranked) {
      await db.execute(sql`
        INSERT INTO replacement_offers (callout_id, shift_id, caregiver_id, score, rationale, status)
        VALUES (${calloutId}, ${callout.shift_id}, ${candidate.caregiver_id}, ${candidate.score}, ${candidate.rationale}, 'offered')
        ON CONFLICT (callout_id, caregiver_id)
        DO UPDATE SET score = EXCLUDED.score, rationale = EXCLUDED.rationale,
                      status = CASE WHEN replacement_offers.status IN ('accepted', 'declined') THEN replacement_offers.status ELSE 'offered' END
      `);
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, related_id)
        VALUES (${candidate.user_id}, 'replacement_offer', 'Priority shift offer',
          'An agency needs urgent coverage. Elite matched you as a strong fit; review the priority offer in the caregiver app.',
          ${callout.shift_id})
      `);
    }

    void sendPushToUsers(ranked.map((candidate: any) => candidate.user_id), {
      title: "Priority shift offer",
      body: `Urgent coverage is needed for ${callout.title}. Review the offer in Elite Bridge Caregiver.`,
      data: { type: "replacement_offer", shiftId: callout.shift_id, calloutId },
    });

    res.json({
      calloutId,
      offersSent: ranked.length,
      candidates: ranked.map((candidate: any) => ({
        caregiverId: candidate.caregiver_id,
        name: `${candidate.first_name} ${candidate.last_name}`,
        score: candidate.score,
        rationale: candidate.rationale,
      })),
      note: "No caregiver was assigned automatically. A scheduler must approve an accepted offer.",
    });
  } catch (error) { next(error); }
});

router.get("/caregiver/offers", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const result = await db.execute(sql`
      SELECT ro.id AS offer_id, ro.score, ro.rationale, ro.status AS offer_status, ro.created_at AS offered_at,
             sp.*, e.company_name
      FROM replacement_offers ro
      JOIN shift_posts sp ON sp.id = ro.shift_id
      JOIN employers e ON e.id = sp.employer_id
      WHERE ro.caregiver_id = ${caregiver.id} AND ro.status IN ('offered', 'accepted')
        AND sp.status = 'open'
      ORDER BY ro.created_at DESC
    `);
    res.json({ offers: (result as any).rows.map((row: any) => ({
      id: row.offer_id,
      score: row.score,
      rationale: row.rationale,
      status: row.offer_status,
      offeredAt: row.offered_at,
      shift: mapShift(row),
    })) });
  } catch (error) { next(error); }
});

router.post("/caregiver/offers/:offerId/respond", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const offerId = Number(req.params.offerId);
    const { status } = offerResponseSchema.parse(req.body);

    const lookup = await db.execute(sql`
      SELECT ro.*, sp.status AS shift_status
      FROM replacement_offers ro
      JOIN shift_posts sp ON sp.id = ro.shift_id
      WHERE ro.id = ${offerId} AND ro.caregiver_id = ${caregiver.id} LIMIT 1
    `);
    const offer = (lookup as any).rows[0];
    if (!offer) throw new AppError(404, "Priority offer not found");
    if (offer.shift_status !== "open") throw new AppError(409, "This shift is no longer available");

    await db.execute(sql`
      UPDATE replacement_offers SET status = ${status}, responded_at = CURRENT_TIMESTAMP WHERE id = ${offerId}
    `);

    if (status === "accepted") {
      await db.execute(sql`
        INSERT INTO shift_applications (shift_id, caregiver_id, status, note)
        VALUES (${offer.shift_id}, ${caregiver.id}, 'pending', 'Accepted a Coverage Copilot priority rescue offer.')
        ON CONFLICT (shift_id, caregiver_id)
        DO UPDATE SET status = 'pending', note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
      `);
    }

    res.json({ offer: { id: offerId, status }, nextStep: status === "accepted" ? "Agency approval required" : "Offer declined" });
  } catch (error) { next(error); }
});

router.post("/:shiftId/clock-in", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = parseInt(req.params.shiftId);
    await db.execute(sql`INSERT INTO shift_activities (shift_id, caregiver_id, type) VALUES (${shiftId}, ${caregiver.id}, 'clock_in')`);
    res.json({ message: "Clocked in successfully" });
  } catch (error) { next(error); }
});

router.post("/:shiftId/clock-out", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = parseInt(req.params.shiftId);
    await db.execute(sql`INSERT INTO shift_activities (shift_id, caregiver_id, type) VALUES (${shiftId}, ${caregiver.id}, 'clock_out')`);
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
      ORDER BY sa.timestamp DESC LIMIT 50
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
      WHERE id = ${Number(req.params.shiftId)} AND employer_id = ${employer.id} RETURNING *
    `);
    if (!(result as any).rows[0]) throw new AppError(404, "Shift not found");
    res.json({ shift: mapShift((result as any).rows[0]) });
  } catch (error) { next(error); }
});

export default router;
