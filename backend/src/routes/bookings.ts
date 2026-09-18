import { Router } from "express";
import { z } from "zod";
import { sql, eq } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { caregivers, employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { sendPushToUsers, sendOperationsAlert } from "../services/notifications";
import { shiftSchedule } from "../services/shift-schedule";
import { ensureOperations } from "../db/operations";
import { checkGeofence } from "../services/geofence";
import { sendShiftSms } from "../services/sms";

const router = Router();
type ShiftTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function refreshShiftStatus(tx: ShiftTransaction, shiftId: number) {
  await tx.execute(sql`
    UPDATE shift_posts sp SET status = CASE
      WHEN (SELECT COUNT(*) FROM shift_timesheets st JOIN shift_applications a ON a.shift_id = st.shift_id AND a.caregiver_id = st.caregiver_id
            WHERE st.shift_id = sp.id AND a.status = 'approved') >= sp.number_of_caregivers THEN 'completed'
      WHEN EXISTS (SELECT 1 FROM shift_activities i WHERE i.shift_id = sp.id AND i.type = 'clock_in'
                   AND NOT EXISTS (SELECT 1 FROM shift_activities o WHERE o.shift_id = i.shift_id AND o.caregiver_id = i.caregiver_id AND o.type = 'clock_out' AND o.id > i.id)) THEN 'in_progress'
      WHEN (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id = sp.id AND a.status = 'approved') >= sp.number_of_caregivers THEN 'assigned'
      ELSE 'open' END, updated_at = CURRENT_TIMESTAMP
    WHERE sp.id = ${shiftId} AND sp.status NOT IN ('cancelled', 'closed')
  `);
}

async function assignCaregiver(shiftId: number, caregiverId: number, applicationId?: number) {
  return db.transaction(async tx => {
    // All assignment and clock mutations use the same lock order.
    await tx.execute(sql`SELECT id FROM caregivers WHERE id = ${caregiverId} FOR UPDATE`);
    const shift = (await tx.execute(sql`SELECT * FROM shift_posts WHERE id = ${shiftId} FOR UPDATE`) as any).rows[0];
    if (!shift || !['open', 'assigned', 'in_progress'].includes(shift.status)) throw new AppError(409, "This shift is no longer available");
    const existing = (await tx.execute(sql`SELECT * FROM shift_applications WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiverId} FOR UPDATE`) as any).rows[0];
    if (existing?.status === 'approved') throw new AppError(409, "This caregiver is already assigned");
    if (applicationId && (existing?.id !== applicationId || existing.status !== 'pending')) throw new AppError(409, "This application has already been decided");
    const filled = Number((await tx.execute(sql`SELECT COUNT(*) AS total FROM shift_applications WHERE shift_id = ${shiftId} AND status = 'approved'`) as any).rows[0].total);
    if (filled >= shift.number_of_caregivers) throw new AppError(409, "All positions on this shift are filled");
    const overlap = (await tx.execute(sql`
      SELECT a.id FROM shift_applications a JOIN shift_posts sp ON sp.id = a.shift_id
      WHERE a.caregiver_id = ${caregiverId} AND a.status = 'approved' AND sp.id <> ${shiftId}
        AND sp.status NOT IN ('cancelled', 'closed', 'completed')
        AND sp.start_time < ${new Date(utcTimestamp(shift.end_time)!)} AND sp.end_time > ${new Date(utcTimestamp(shift.start_time)!)} LIMIT 1
    `) as any).rows[0];
    if (overlap) throw new AppError(409, "This caregiver already has an overlapping shift");
    const application = (await tx.execute(sql`
      INSERT INTO shift_applications (shift_id, caregiver_id, status, note)
      VALUES (${shiftId}, ${caregiverId}, 'approved', 'Claimed a matched instant shift offer.')
      ON CONFLICT (shift_id, caregiver_id) DO UPDATE SET status = 'approved', updated_at = CURRENT_TIMESTAMP RETURNING *
    `) as any).rows[0];
    const total = ((new Date(utcTimestamp(shift.end_time)!).getTime() - new Date(utcTimestamp(shift.start_time)!).getTime()) / 3600000 * Number(shift.hourly_rate)).toFixed(2);
    await tx.execute(sql`
      INSERT INTO bookings (caregiver_id, employer_id, start_time, end_time, service_type, status, hourly_rate, total_amount, notes)
      VALUES (${caregiverId}, ${shift.employer_id}, ${new Date(utcTimestamp(shift.start_time)!)}, ${new Date(utcTimestamp(shift.end_time)!)}, ${shift.service_type}, 'confirmed', ${String(shift.hourly_rate)}, ${total}, ${shift.notes || null})
    `);
    let competingUserIds: number[] = [];
    if (filled + 1 >= shift.number_of_caregivers) {
      competingUserIds = (await tx.execute(sql`SELECT c.user_id FROM shift_applications a JOIN caregivers c ON c.id = a.caregiver_id WHERE a.shift_id = ${shiftId} AND a.status = 'pending'`) as any).rows.map((r: any) => r.user_id);
      await tx.execute(sql`UPDATE shift_applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE shift_id = ${shiftId} AND status = 'pending'`);
      await tx.execute(sql`UPDATE shift_callouts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE shift_id = ${shiftId} AND status = 'open'`);
      await tx.execute(sql`UPDATE replacement_offers SET status = CASE WHEN caregiver_id = ${caregiverId} THEN 'accepted' ELSE 'expired' END, responded_at = CURRENT_TIMESTAMP WHERE shift_id = ${shiftId} AND status IN ('offered', 'accepted')`);
    }
    await refreshShiftStatus(tx, shiftId);
    const updated = (await tx.execute(sql`SELECT status FROM shift_posts WHERE id = ${shiftId}`) as any).rows[0];
    return { application, competingUserIds, status: updated.status };
  });
}

const shiftSchema = z.object({
  title: z.string().min(2),
  serviceType: z.string().min(1),
  caregiverType: z.string().min(1),
  careRecipientName: z.string().optional(),
  scheduleType: z.enum(["one_time", "recurring"]).default("one_time"),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  timeZone: z.string().max(100).optional(),
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
  numberOfCaregivers: z.number().int().min(1).max(50).default(1),
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
const clockBodySchema = z.object({
  notes: z.string().max(4000).optional(),
  location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().nonnegative().nullable(), capturedAt: z.string().datetime() }).nullable().optional(),
});

let shiftTableReady = false;

export async function ensureShiftPostsTable() {
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

  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT 'Care shift'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS service_type VARCHAR(100) NOT NULL DEFAULT 'personal_care'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS assignment_mode VARCHAR(20) NOT NULL DEFAULT 'instant'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100) NOT NULL DEFAULT 'UTC'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS caregiver_type VARCHAR(100) NOT NULL DEFAULT 'caregiver'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS care_recipient_name VARCHAR(255)`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) NOT NULL DEFAULT 'one_time'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS end_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS location_type VARCHAR(50) NOT NULL DEFAULT 'client_home'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS address VARCHAR(255) NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS city VARCHAR(100) NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS state VARCHAR(2) NOT NULL DEFAULT 'MA'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) NOT NULL DEFAULT '0'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS number_of_caregivers INTEGER NOT NULL DEFAULT 1`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS requirements JSON DEFAULT '[]'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS responsibilities TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255) NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50) NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS urgency VARCHAR(50) NOT NULL DEFAULT 'standard'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'open'`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);

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
  await db.execute(sql`ALTER TABLE shift_activities ADD COLUMN IF NOT EXISTS location JSONB`);
  await db.execute(sql`ALTER TABLE shift_activities ADD COLUMN IF NOT EXISTS notes TEXT`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS shift_timesheets (
      id SERIAL PRIMARY KEY,
      shift_id INTEGER NOT NULL REFERENCES shift_posts(id) ON DELETE CASCADE,
      caregiver_id INTEGER NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      clock_in_at TIMESTAMP NOT NULL,
      clock_out_at TIMESTAMP NOT NULL,
      worked_minutes INTEGER NOT NULL,
      hourly_rate DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(15,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending_approval',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shift_posts(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS caregiver_id INTEGER REFERENCES caregivers(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS employer_id INTEGER REFERENCES employers(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS clock_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS clock_out_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS worked_minutes INTEGER NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) NOT NULL DEFAULT '0'`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) NOT NULL DEFAULT '0'`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending_approval'`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);

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
  await db.execute(sql`ALTER TABLE shift_applications ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shift_posts(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE shift_applications ADD COLUMN IF NOT EXISTS caregiver_id INTEGER REFERENCES caregivers(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE shift_applications ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending'`);
  await db.execute(sql`ALTER TABLE shift_applications ADD COLUMN IF NOT EXISTS note TEXT`);
  await db.execute(sql`ALTER TABLE shift_applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);

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
  await db.execute(sql`ALTER TABLE shift_callouts ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shift_posts(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE shift_callouts ADD COLUMN IF NOT EXISTS caregiver_id INTEGER REFERENCES caregivers(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE shift_callouts ADD COLUMN IF NOT EXISTS reason VARCHAR(50) NOT NULL DEFAULT 'other'`);
  await db.execute(sql`ALTER TABLE shift_callouts ADD COLUMN IF NOT EXISTS note TEXT`);
  await db.execute(sql`ALTER TABLE shift_callouts ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'open'`);
  await db.execute(sql`ALTER TABLE shift_callouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE shift_callouts ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP`);

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
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS callout_id INTEGER REFERENCES shift_callouts(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS shift_id INTEGER REFERENCES shift_posts(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS caregiver_id INTEGER REFERENCES caregivers(id) ON DELETE CASCADE`);
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS rationale TEXT NOT NULL DEFAULT ''`);
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'offered'`);
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await db.execute(sql`ALTER TABLE replacement_offers ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP`);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_posts_status_start_idx ON shift_posts(status, start_time)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_applications_shift_idx ON shift_applications(shift_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_applications_caregiver_idx ON shift_applications(caregiver_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_callouts_shift_idx ON shift_callouts(shift_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS replacement_offers_caregiver_idx ON replacement_offers(caregiver_id, status)`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS shift_timesheets_shift_caregiver_idx ON shift_timesheets(shift_id, caregiver_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS shift_timesheets_employer_idx ON shift_timesheets(employer_id, status)`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS agency_note TEXT`);
  await db.execute(sql`ALTER TABLE shift_timesheets ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS timesheet_reviews (
    id SERIAL PRIMARY KEY, timesheet_id INTEGER NOT NULL REFERENCES shift_timesheets(id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(50) NOT NULL, note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

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

function utcTimestamp(value: Date | string | null) {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString();
  return new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).toISOString();
}

function attendanceRecord(row: any) {
  const result = { ...row };
  for (const key of ['timestamp', 'clock_in_at', 'clock_out_at', 'approved_at', 'created_at', 'updated_at', 'start_time', 'end_time']) {
    if (result[key]) result[key] = utcTimestamp(result[key]);
  }
  return result;
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
    startTime: utcTimestamp(row.start_time),
    endTime: utcTimestamp(row.end_time),
    timeZone: row.time_zone || "UTC",
    location: {
      type: row.location_type,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    hourlyRate: Number(row.hourly_rate),
    numberOfCaregivers: row.number_of_caregivers,
    assignedCaregivers: Number(row.assigned_count || 0),
    remainingPositions: Math.max(0, Number(row.number_of_caregivers) - Number(row.assigned_count || 0)),
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

async function getApprovedAssignment(shiftId: number, caregiverId: number, tx: Pick<typeof db, "execute"> = db) {
  const result = await tx.execute(sql`
    SELECT sp.*, e.user_id AS employer_user_id
    FROM shift_posts sp
    JOIN shift_applications sa ON sa.shift_id = sp.id
    JOIN employers e ON e.id = sp.employer_id
    WHERE sp.id = ${shiftId}
      AND sa.caregiver_id = ${caregiverId}
      AND sa.status = 'approved'
      AND sp.status IN ('open', 'assigned', 'in_progress')
    LIMIT 1
  `);
  return (result as any).rows[0];
}

async function findLatestClockIn(shiftId: number, caregiverId: number, tx: Pick<typeof db, "execute"> = db) {
  const result = await tx.execute(sql`
    SELECT id, timestamp
    FROM shift_activities
    WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiverId} AND type = 'clock_in'
      AND id > COALESCE((
        SELECT MAX(id)
        FROM shift_activities
        WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiverId} AND type = 'clock_out'
      ), 0)
    ORDER BY id DESC
    LIMIT 1
  `);
  return (result as any).rows[0];
}

router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const data = shiftSchema.parse(req.body);
    const { start: startDateTime, end: endDateTime, zone } = shiftSchedule(data);

    const result = await db.execute(sql`
      INSERT INTO shift_posts (
        employer_id, title, service_type, caregiver_type, care_recipient_name,
        schedule_type, start_time, end_time, location_type, address, city, state,
        zip_code, hourly_rate, number_of_caregivers, requirements, responsibilities,
        notes, contact_name, contact_phone, urgency, assignment_mode, status, time_zone
      ) VALUES (
        ${employer.id}, ${data.title}, ${data.serviceType}, ${data.caregiverType}, ${data.careRecipientName || null},
        ${data.scheduleType}, ${startDateTime}, ${endDateTime}, ${data.location.type}, ${data.location.address},
        ${data.location.city}, ${data.location.state.toUpperCase()}, ${data.location.zipCode}, ${data.pay.hourlyRate.toString()},
        ${data.numberOfCaregivers}, CAST(${JSON.stringify(data.requirements)} AS json), ${data.responsibilities},
        ${data.notes || null}, ${data.contact.name}, ${data.contact.phone}, ${data.urgency}, ${data.assignmentMode}, 'open', ${zone}
      )
      RETURNING *
    `);
    const createdShift = (result as any).rows[0];
    const matches = await db.execute(sql`
      SELECT c.user_id
      FROM caregivers c JOIN users u ON u.id = c.user_id
      WHERE c.is_available = true AND u.is_active = true
        AND (
          COALESCE(jsonb_array_length(c.certifications::jsonb), 0) = 0
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
    await sendOperationsAlert("New shift posted", `Employer #${employer.id} posted shift #${createdShift.id}.`);
    await sendShiftSms(matchedUserIds, createdShift.id).catch(() => console.warn('Shift SMS delivery could not be completed'));
    res.status(201).json({ shift: mapShift(createdShift), matchedCaregivers: matchedUserIds.length });
  } catch (error) {
    next(error);
  }
});

router.get("/employer/my", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      SELECT sp.*, e.company_name,
        (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id = sp.id AND a.status = 'approved') AS assigned_count
      FROM shift_posts sp
      JOIN employers e ON e.id = sp.employer_id
      WHERE sp.employer_id = ${employer.id}
      ORDER BY sp.start_time ASC, sp.created_at DESC
    `);
    res.json({ shifts: (result as any).rows.map(mapShift) });
  } catch (error) { next(error); }
});

router.get(["/open", "/available"], authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const result = await db.execute(sql`
      SELECT sp.*, e.company_name, sa.status AS application_status,
        (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id = sp.id AND a.status = 'approved') AS assigned_count
      FROM shift_posts sp
      JOIN employers e ON e.id = sp.employer_id
      JOIN caregivers c ON c.id = ${caregiver.id}
      LEFT JOIN shift_applications sa ON sa.shift_id = sp.id AND sa.caregiver_id = ${caregiver.id}
      WHERE sp.status IN ('open', 'assigned', 'in_progress')
        AND (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id = sp.id AND a.status = 'approved') < sp.number_of_caregivers
        AND COALESCE(sa.status, '') <> 'approved'
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

// Each accepted caregiver occupies one position; row locks prevent overbooking.
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
      WHERE sp.id = ${shiftId} AND sp.status IN ('open', 'assigned', 'in_progress') AND sp.assignment_mode = 'instant'
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

    const assigned = await assignCaregiver(shiftId, caregiver.id);
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (${shift.employer_user_id}, 'shift_claimed', 'Shift claimed', 'A qualified caregiver claimed your matched shift offer.', ${shiftId})
    `);
    void sendPushToUsers([shift.employer_user_id], {
      title: "Shift claimed",
      body: `A qualified caregiver claimed ${shift.title}.`,
      data: { type: "shift_claimed", shiftId, applicationId: assigned.application.id },
    });
    await sendOperationsAlert("Shift claimed", `Shift #${shiftId} for employer #${shift.employer_id} has been claimed.`);
    res.json({ application: assigned.application, shift: { id: shiftId, status: assigned.status } });
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
    await db.execute(sql`
      UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Cancelled by employer',
        cancelled_by = 'employer', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE employer_id = ${employer.id} AND status IN ('pending', 'confirmed')
        AND start_time = (SELECT start_time FROM shift_posts WHERE id = ${shiftId})
        AND end_time = (SELECT end_time FROM shift_posts WHERE id = ${shiftId})
        AND caregiver_id IN (SELECT caregiver_id FROM shift_applications WHERE shift_id = ${shiftId} AND status = 'approved')
    `);
    const caregiversResult = await db.execute(sql`SELECT c.user_id FROM shift_applications sa JOIN caregivers c ON c.id = sa.caregiver_id WHERE sa.shift_id = ${shiftId} AND sa.status = 'approved'`);
    const caregiverUserIds = (caregiversResult as any).rows.map((row: any) => row.user_id);
    void sendPushToUsers(caregiverUserIds, { title: "Shift cancelled", body: "The employer cancelled an assigned Elite Bridge shift.", data: { type: "shift_cancelled", shiftId } });
    await sendOperationsAlert("Shift cancelled", `Employer #${employer.id} cancelled shift #${shiftId}.`);
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
      WHERE sp.id = ${shiftId} AND sp.status IN ('open', 'assigned', 'in_progress')
        AND (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id = sp.id AND a.status = 'approved') < sp.number_of_caregivers
      LIMIT 1
    `);
    const shift = (shiftResult as any).rows[0];
    if (!shift) throw new AppError(404, "Open shift not found");

    const result = await db.execute(sql`
      INSERT INTO shift_applications (shift_id, caregiver_id, status, note)
      VALUES (${shiftId}, ${caregiver.id}, 'pending', ${note || null})
      ON CONFLICT (shift_id, caregiver_id)
      DO UPDATE SET status = 'pending', note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
      WHERE shift_applications.status NOT IN ('approved', 'callout')
      RETURNING *
    `);
    if (!(result as any).rows[0]) throw new AppError(409, "You already have an assignment or call-out for this shift");
    void sendPushToUsers([shift.employer_user_id], {
      title: "New caregiver application",
      body: `A caregiver applied for ${shift.title}.`,
      data: { type: "new_application", shiftId, applicationId: (result as any).rows[0].id },
    });
    await sendOperationsAlert("New shift application", `A caregiver applied for shift #${shiftId}. Employer account #${shift.employer_user_id} can review the application.`);
    res.status(201).json({ application: (result as any).rows[0] });
  } catch (error) { next(error); }
});

router.get("/caregiver/my-applications", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const result = await db.execute(sql`
      SELECT sa.id AS application_id, sa.status AS application_status, sa.note AS application_note,
             sa.created_at AS applied_at, sp.*, e.company_name,
             (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id = sp.id AND a.status = 'approved') AS assigned_count
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

router.get("/employer/team", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      SELECT c.id AS caregiver_id, u.id AS user_id, u.first_name, u.last_name,
             u.email, u.phone, c.rating, c.total_hours, c.certifications::text AS certifications,
             c.specialties::text AS specialties, c.hourly_rate, c.background_check_status, c.background_check_date,
             COUNT(DISTINCT sa.shift_id) FILTER (WHERE sa.status = 'approved') AS assigned_shifts,
             COUNT(DISTINCT sa.shift_id) FILTER (WHERE sa.status = 'approved' AND sp.start_time >= CURRENT_TIMESTAMP AND sp.status IN ('open', 'assigned', 'in_progress')) AS upcoming_shifts,
             MAX(sa.updated_at) FILTER (WHERE sa.status = 'approved') AS last_assigned_at
      FROM users u
      LEFT JOIN caregivers c ON c.user_id = u.id
      LEFT JOIN shift_posts sp ON sp.employer_id = ${employer.id}
      LEFT JOIN shift_applications sa ON sa.shift_id = sp.id AND sa.caregiver_id = c.id AND sa.status = 'approved'
      WHERE u.role = 'caregiver' AND u.is_active = true AND (
        EXISTS (SELECT 1 FROM employer_caregivers ec WHERE ec.employer_id = ${employer.id}
                AND ec.caregiver_user_id = u.id AND ec.status = 'active')
        OR sa.id IS NOT NULL
      )
      GROUP BY c.id, u.id
      ORDER BY u.first_name, u.last_name
    `);
    res.json({ team: (result as any).rows.map((member: any) => ({
      ...member,
      specialties: typeof member.specialties === "string" ? JSON.parse(member.specialties) : member.specialties || [],
      certifications: typeof member.certifications === "string" ? JSON.parse(member.certifications) : member.certifications,
      assigned_shifts: Number(member.assigned_shifts || 0),
      upcoming_shifts: Number(member.upcoming_shifts || 0),
    })) });
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
    if (application.status === status) return res.json({ application });
    if (application.status !== "pending") throw new AppError(409, "This application has already been decided");
    const decision = status === "approved"
      ? await assignCaregiver(application.shift_id, application.caregiver_id, applicationId)
      : { application: (await db.execute(sql`UPDATE shift_applications SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ${applicationId} AND status = 'pending' RETURNING *`) as any).rows[0], competingUserIds: [] as number[] };
    if (!decision.application) throw new AppError(409, "This application has already been decided");
    if (status === "approved") {
      const competingUserIds = decision.competingUserIds;
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

    await sendOperationsAlert(`Shift application ${status}`, `Employer #${employer.id} ${status} application #${applicationId} for shift #${application.shift_id}.`);
    res.json({ application: decision.application });
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

    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM caregivers WHERE id = ${caregiver.id} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM shift_posts WHERE id = ${shiftId} FOR UPDATE`);
    const assignmentResult = await tx.execute(sql`
      SELECT sp.*, sa.id AS application_id, e.user_id AS employer_user_id
      FROM shift_posts sp
      JOIN shift_applications sa ON sa.shift_id = sp.id
      JOIN employers e ON e.id = sp.employer_id
      WHERE sp.id = ${shiftId} AND sa.caregiver_id = ${caregiver.id}
        AND sa.status = 'approved' AND sp.status IN ('open', 'assigned', 'in_progress')
      LIMIT 1
    `);
    const assignment = (assignmentResult as any).rows[0];
    if (!assignment) throw new AppError(404, "Active assigned shift not found");

    if (await findLatestClockIn(shiftId, caregiver.id, tx)) throw new AppError(409, "Clock out before reporting a call-out so your worked time is preserved");
    if ((await tx.execute(sql`SELECT id FROM shift_timesheets WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiver.id}`) as any).rows[0]) throw new AppError(409, "This assignment is already completed");
    const existing = await tx.execute(sql`
      SELECT id FROM shift_callouts WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiver.id} AND status = 'open' LIMIT 1
    `);
    if ((existing as any).rows[0]) throw new AppError(409, "A call-out is already open for this shift");

    const callout = await tx.execute(sql`
      INSERT INTO shift_callouts (shift_id, caregiver_id, reason, note, status)
      VALUES (${shiftId}, ${caregiver.id}, ${data.reason}, ${data.note || null}, 'open')
      RETURNING *
    `);

    await tx.execute(sql`
      UPDATE shift_applications SET status = 'callout', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${assignment.application_id}
    `);
    await tx.execute(sql`
      UPDATE shift_posts SET urgency = 'urgent', updated_at = CURRENT_TIMESTAMP WHERE id = ${shiftId}
    `);
    await tx.execute(sql`
      UPDATE bookings
      SET status = 'cancelled', cancellation_reason = ${data.reason}, cancelled_by = 'caregiver',
          cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE caregiver_id = ${caregiver.id} AND employer_id = ${assignment.employer_id}
        AND start_time = ${new Date(utcTimestamp(assignment.start_time)!)} AND end_time = ${new Date(utcTimestamp(assignment.end_time)!)}
        AND status IN ('pending', 'confirmed', 'in_progress')
    `);
    await tx.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (${assignment.employer_user_id}, 'callout', 'Urgent shift call-out',
        'A caregiver called out of an assigned shift. Elite reopened it as urgent and it is ready for Coverage Copilot.',
        ${shiftId})
    `);

    await refreshShiftStatus(tx, shiftId);
    return { assignment, callout: (callout as any).rows[0], status: (await tx.execute(sql`SELECT status FROM shift_posts WHERE id = ${shiftId}`) as any).rows[0].status };
    });
    void sendPushToUsers([result.assignment.employer_user_id], {
      title: "Urgent shift call-out",
      body: `A caregiver called out of ${result.assignment.title}. The shift has been reopened as urgent.`,
      data: { type: "shift_callout", shiftId },
    });
    await sendOperationsAlert("Urgent shift call-out", `Shift #${shiftId} for employer #${result.assignment.employer_id} needs replacement coverage.`);
    res.status(201).json({ callout: result.callout, shift: { id: shiftId, status: result.status, urgency: "urgent" } });
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
        AND NOT EXISTS (SELECT 1 FROM shift_applications a WHERE a.shift_id = ${callout.shift_id} AND a.caregiver_id = c.id AND a.status IN ('approved', 'callout'))
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
        AND sp.status IN ('open', 'assigned', 'in_progress')
        AND (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id = sp.id AND a.status = 'approved') < sp.number_of_caregivers
        AND NOT EXISTS (SELECT 1 FROM shift_applications a WHERE a.shift_id = sp.id AND a.caregiver_id = ${caregiver.id} AND a.status = 'approved')
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
    if (!['open', 'assigned', 'in_progress'].includes(offer.shift_status)) throw new AppError(409, "This shift is no longer available");

    await db.execute(sql`
      UPDATE replacement_offers SET status = ${status}, responded_at = CURRENT_TIMESTAMP WHERE id = ${offerId}
    `);

    if (status === "accepted") {
      await db.execute(sql`
        INSERT INTO shift_applications (shift_id, caregiver_id, status, note)
        VALUES (${offer.shift_id}, ${caregiver.id}, 'pending', 'Accepted a Coverage Copilot priority rescue offer.')
        ON CONFLICT (shift_id, caregiver_id)
        DO UPDATE SET status = 'pending', note = EXCLUDED.note, updated_at = CURRENT_TIMESTAMP
        WHERE shift_applications.status NOT IN ('approved', 'callout')
      `);
    }

    res.json({ offer: { id: offerId, status }, nextStep: status === "accepted" ? "Agency approval required" : "Offer declined" });
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
      ORDER BY sa.timestamp DESC, sa.id DESC LIMIT 50
    `);
    const active = await db.execute(sql`
      SELECT COUNT(DISTINCT i.caregiver_id) AS total FROM shift_activities i JOIN shift_posts sp ON sp.id = i.shift_id
      WHERE sp.employer_id = ${employer.id} AND i.type = 'clock_in'
        AND NOT EXISTS (SELECT 1 FROM shift_activities o WHERE o.shift_id = i.shift_id AND o.caregiver_id = i.caregiver_id AND o.type = 'clock_out' AND o.id > i.id)
    `);
    res.json({ activities: (result as any).rows.map(attendanceRecord), activeCount: Number((active as any).rows[0].total) });
  } catch (error) { next(error); }
});

router.get("/employer/timesheets", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.execute(sql`
      SELECT st.*, sp.title AS shift_title, sp.service_type, sp.start_time, sp.end_time,
             sp.city, sp.state, u.first_name, u.last_name, u.email
      FROM shift_timesheets st
      JOIN shift_posts sp ON sp.id = st.shift_id
      JOIN caregivers c ON c.id = st.caregiver_id
      JOIN users u ON u.id = c.user_id
      WHERE st.employer_id = ${employer.id}
      ORDER BY st.clock_out_at DESC
      LIMIT 100
    `);
    res.json({ timesheets: (result as any).rows.map((row: any) => ({
      ...attendanceRecord(row),
      worked_hours: Number((Number(row.worked_minutes || 0) / 60).toFixed(2)),
      hourly_rate: Number(row.hourly_rate),
      total_amount: Number(row.total_amount),
    })) });
  } catch (error) { next(error); }
});

router.get("/caregiver/timekeeping", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const activities = await db.execute(sql`SELECT * FROM shift_activities WHERE caregiver_id = ${caregiver.id} ORDER BY id ASC`);
    const timesheets = await db.execute(sql`SELECT * FROM shift_timesheets WHERE caregiver_id = ${caregiver.id} ORDER BY clock_in_at DESC`);
    res.json({ activities: (activities as any).rows.map(attendanceRecord), timesheets: (timesheets as any).rows.map(attendanceRecord) });
  } catch (error) { next(error); }
});

router.post("/:shiftId/break", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = z.coerce.number().int().positive().parse(req.params.shiftId);
    const { action } = z.object({ action: z.enum(['start', 'end']) }).parse(req.body);
    const activity = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM caregivers WHERE id = ${caregiver.id} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM shift_posts WHERE id = ${shiftId} FOR UPDATE`);
      if (!await getApprovedAssignment(shiftId, caregiver.id, tx)) throw new AppError(403, "Assigned caregiver access required");
      if (!await findLatestClockIn(shiftId, caregiver.id, tx)) throw new AppError(409, "Clock in before recording a break");
      const last = (await tx.execute(sql`SELECT type FROM shift_activities WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiver.id} ORDER BY id DESC LIMIT 1`) as any).rows[0];
      if ((action === 'start' && last.type === 'break_start') || (action === 'end' && last.type !== 'break_start')) throw new AppError(409, "Break state changed. Refresh your time clock.");
      return (await tx.execute(sql`INSERT INTO shift_activities (shift_id, caregiver_id, type, timestamp) VALUES (${shiftId}, ${caregiver.id}, ${action === 'start' ? 'break_start' : 'break_end'}, clock_timestamp() AT TIME ZONE 'UTC') RETURNING *`) as any).rows[0];
    });
    res.json({ activity });
  } catch (error) { next(error); }
});

router.patch("/employer/timesheets/:timesheetId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const id = z.coerce.number().int().positive().parse(req.params.timesheetId);
    const data = z.object({ status: z.enum(['approved', 'correction_requested']), note: z.string().trim().max(2000).default('') }).parse(req.body);
    if (data.status === 'correction_requested' && !data.note) throw new AppError(400, "Explain what needs clarification");
    const timesheet = await db.transaction(async tx => {
      const current = (await tx.execute(sql`SELECT * FROM shift_timesheets WHERE id = ${id} AND employer_id = ${employer.id} FOR UPDATE`) as any).rows[0];
      if (!current) throw new AppError(404, "Timesheet not found");
      if (current.status !== 'pending_approval') throw new AppError(409, "This timesheet is no longer pending review");
      const sheet = (await tx.execute(sql`UPDATE shift_timesheets SET status = ${data.status}, agency_note = ${data.note || null}, approved_at = CASE WHEN ${data.status} = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`) as any).rows[0];
      await tx.execute(sql`INSERT INTO timesheet_reviews (timesheet_id, actor_user_id, action, note) VALUES (${id}, ${req.user!.id}, ${data.status}, ${data.note || null})`);
      await tx.execute(sql`INSERT INTO notifications (user_id, type, title, message, related_id) SELECT c.user_id, 'timesheet_review', 'Timesheet review', ${data.status === 'approved' ? 'Your timesheet has been approved.' : 'Your employer requested clarification. Open your time clock to respond.'}, ${current.shift_id} FROM caregivers c WHERE c.id = ${current.caregiver_id}`);
      return sheet;
    });
    res.json({ timesheet });
  } catch (error) { next(error); }
});

router.post("/caregiver/timesheets/:timesheetId/resubmit", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const id = z.coerce.number().int().positive().parse(req.params.timesheetId);
    const { notes } = z.object({ notes: z.string().trim().min(1).max(2000) }).parse(req.body);
    const timesheet = await db.transaction(async tx => {
      const current = (await tx.execute(sql`SELECT * FROM shift_timesheets WHERE id = ${id} AND caregiver_id = ${caregiver.id} FOR UPDATE`) as any).rows[0];
      if (!current) throw new AppError(404, "Timesheet not found");
      if (current.status !== 'correction_requested') throw new AppError(409, "This timesheet does not need clarification");
      await tx.execute(sql`INSERT INTO timesheet_reviews (timesheet_id, actor_user_id, action, note) VALUES (${id}, ${req.user!.id}, 'resubmitted', ${notes})`);
      return (await tx.execute(sql`UPDATE shift_timesheets SET status = 'pending_approval', notes = CONCAT(COALESCE(notes, ''), E'\nClarification: ', CAST(${notes} AS text)), updated_at = CURRENT_TIMESTAMP WHERE id = ${id} RETURNING *`) as any).rows[0];
    });
    res.json({ timesheet });
  } catch (error) { next(error); }
});

router.post("/:shiftId/clock-in", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    await ensureOperations();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId)) throw new AppError(400, "Invalid shift ID");

    const data = clockBodySchema.parse(req.body || {});
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM caregivers WHERE id = ${caregiver.id} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM shift_posts WHERE id = ${shiftId} FOR UPDATE`);
    const assignment = await getApprovedAssignment(shiftId, caregiver.id, tx);
    if (!assignment) throw new AppError(403, "Only the assigned caregiver can clock in for this shift");
    const fence = (await tx.execute(sql`SELECT * FROM shift_geofences WHERE shift_id=${shiftId}`) as any).rows[0];
    const verification = checkGeofence(fence, data.location);
    if ((await tx.execute(sql`SELECT id FROM shift_timesheets WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiver.id}`) as any).rows[0]) throw new AppError(409, "This assignment already has a completed timesheet");
    const active = (await tx.execute(sql`SELECT i.id FROM shift_activities i WHERE i.caregiver_id = ${caregiver.id} AND i.type = 'clock_in' AND NOT EXISTS (SELECT 1 FROM shift_activities o WHERE o.shift_id = i.shift_id AND o.caregiver_id = i.caregiver_id AND o.type = 'clock_out' AND o.id > i.id) LIMIT 1`) as any).rows[0];
    if (active) throw new AppError(409, "Clock out of your active shift before starting another");
    const openClockIn = await findLatestClockIn(shiftId, caregiver.id, tx);
    if (openClockIn) throw new AppError(409, "You are already clocked in for this shift");

    const activity = await tx.execute(sql`
      INSERT INTO shift_activities (shift_id, caregiver_id, type, location, notes, timestamp)
      VALUES (${shiftId}, ${caregiver.id}, 'clock_in', CAST(${data.location ? JSON.stringify({ ...data.location, ...(verification ? { geofence: verification } : {}) }) : null} AS jsonb), ${data.notes || null}, clock_timestamp() AT TIME ZONE 'UTC')
      RETURNING *
    `);
    await tx.execute(sql`UPDATE shift_posts SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ${shiftId}`);
    await tx.execute(sql`
      UPDATE bookings SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
      WHERE caregiver_id = ${caregiver.id} AND employer_id = ${assignment.employer_id}
        AND start_time = ${new Date(utcTimestamp(assignment.start_time)!)} AND end_time = ${new Date(utcTimestamp(assignment.end_time)!)}
        AND status = 'confirmed'
    `);
    return { message: "Clocked in successfully", activity: (activity as any).rows[0] };
    });
    res.json(result);
  } catch (error) { next(error); }
});

router.post("/:shiftId/clock-out", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const caregiver = await getOrCreateCaregiver(req);
    const shiftId = Number(req.params.shiftId);
    if (!Number.isInteger(shiftId)) throw new AppError(400, "Invalid shift ID");

    const data = clockBodySchema.parse(req.body || {});
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM caregivers WHERE id = ${caregiver.id} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM shift_posts WHERE id = ${shiftId} FOR UPDATE`);
    const assignment = await getApprovedAssignment(shiftId, caregiver.id, tx);
    if (!assignment) throw new AppError(403, "Only the assigned caregiver can clock out for this shift");
    const clockIn = await findLatestClockIn(shiftId, caregiver.id, tx);
    if (!clockIn) throw new AppError(409, "Clock in before clocking out of this shift");

    const last = (await tx.execute(sql`SELECT type FROM shift_activities WHERE shift_id = ${shiftId} AND caregiver_id = ${caregiver.id} ORDER BY id DESC LIMIT 1`) as any).rows[0];
    if (last?.type === 'break_start') throw new AppError(409, "End your break before clocking out");
    const clockOut = await tx.execute(sql`
      INSERT INTO shift_activities (shift_id, caregiver_id, type, location, notes, timestamp)
      VALUES (${shiftId}, ${caregiver.id}, 'clock_out', CAST(${data.location ? JSON.stringify(data.location) : null} AS jsonb), ${data.notes || null}, clock_timestamp() AT TIME ZONE 'UTC')
      RETURNING *
    `);
    const clockInAt = new Date(utcTimestamp(clockIn.timestamp)!);
    const clockOutAt = new Date(utcTimestamp((clockOut as any).rows[0].timestamp)!);
    const workedMinutes = Math.max(0, Math.round((clockOutAt.getTime() - clockInAt.getTime()) / 60000));
    const rate = Number(assignment.hourly_rate);
    const total = Number(((workedMinutes / 60) * rate).toFixed(2));

    const timesheet = await tx.execute(sql`
      INSERT INTO shift_timesheets (
        shift_id, caregiver_id, employer_id, clock_in_at, clock_out_at, worked_minutes,
        hourly_rate, total_amount, status, notes
      ) VALUES (
        ${shiftId}, ${caregiver.id}, ${assignment.employer_id}, ${clockInAt}, ${clockOutAt}, ${workedMinutes},
        ${rate.toString()}, ${total.toString()}, 'pending_approval', ${data.notes || null}
      )
      RETURNING *
    `);

    await refreshShiftStatus(tx, shiftId);
    await tx.execute(sql`
      UPDATE bookings SET status = 'completed', total_amount = ${total.toString()}, updated_at = CURRENT_TIMESTAMP
      WHERE caregiver_id = ${caregiver.id} AND employer_id = ${assignment.employer_id}
        AND start_time = ${new Date(utcTimestamp(assignment.start_time)!)} AND end_time = ${new Date(utcTimestamp(assignment.end_time)!)}
        AND status IN ('confirmed', 'in_progress')
    `);
    await tx.execute(sql`
      UPDATE caregivers SET total_hours = COALESCE(total_hours, 0) + ${String(workedMinutes / 60)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${caregiver.id}
    `);
    await tx.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, related_id)
      VALUES (${assignment.employer_user_id}, 'timesheet_ready', 'Timesheet ready',
        'A caregiver completed a shift and the timesheet is ready for review.',
        ${shiftId})
    `);

    return { assignment, timesheet: (timesheet as any).rows[0] };
    });
    await sendOperationsAlert("Timesheet ready", `Shift #${shiftId} for employer #${result.assignment.employer_id} has a completed assignment. The timesheet is ready for review.`);
    res.json({ message: "Clocked out successfully", timesheet: result.timesheet });
  } catch (error) { next(error); }
});

router.put("/:shiftId/close", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureShiftPostsTable();
    const employer = await getOrCreateEmployer(req);
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM shift_posts WHERE id = ${Number(req.params.shiftId)} AND employer_id = ${employer.id} FOR UPDATE`);
      return tx.execute(sql`
      UPDATE shift_posts SET status = 'closed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number(req.params.shiftId)} AND employer_id = ${employer.id} AND status = 'open'
        AND NOT EXISTS (SELECT 1 FROM shift_applications a WHERE a.shift_id = shift_posts.id AND a.status = 'approved') RETURNING *
      `);
    });
    if (!(result as any).rows[0]) throw new AppError(404, "Shift not found");
    res.json({ shift: mapShift((result as any).rows[0]) });
  } catch (error) { next(error); }
});

export default router;
