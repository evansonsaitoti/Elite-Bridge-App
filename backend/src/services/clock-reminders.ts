import { sql } from "drizzle-orm";
import { db } from "../db";
import { config } from "../config/env";
import { sendPushToUsers, sendTransactionalEmail } from "./notifications";
import { ensureSms, sendSms, smsReady } from "./sms";

export type ClockReminderSettings = {
  preShiftEnabled: boolean;
  preShiftMinutes: number;
  lateAlertEnabled: boolean;
  lateGraceMinutes: number;
  notifyEmployer: boolean;
};

export const defaultClockReminderSettings: ClockReminderSettings = {
  preShiftEnabled: false,
  preShiftMinutes: 15,
  lateAlertEnabled: false,
  lateGraceMinutes: 5,
  notifyEmployer: true,
};

export async function ensureClockReminderTables() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS clock_reminder_settings (
    employer_id INTEGER PRIMARY KEY REFERENCES employers(id) ON DELETE CASCADE,
    pre_shift_enabled BOOLEAN NOT NULL DEFAULT false,
    pre_shift_minutes INTEGER NOT NULL DEFAULT 15 CHECK (pre_shift_minutes IN (15,30,45,60)),
    late_alert_enabled BOOLEAN NOT NULL DEFAULT false,
    late_grace_minutes INTEGER NOT NULL DEFAULT 5 CHECK (late_grace_minutes IN (5,10,15,30)),
    notify_employer BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS clock_reminder_deliveries (
    id SERIAL PRIMARY KEY,
    shift_id INTEGER NOT NULL,
    caregiver_id INTEGER NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'claimed',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (shift_id, caregiver_id, event_type, recipient_user_id)
  )`);
}

function localShiftTime(value: Date | string, zone: string) {
  const date = value instanceof Date ? value : new Date(value);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: zone || "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

async function sendNotice(input: {
  shiftId: number;
  caregiverId: number;
  eventType: "pre_shift" | "late_caregiver" | "late_employer";
  recipientUserId: number;
  recipientEmail: string;
  recipientName: string;
  title: string;
  message: string;
}) {
  const claim = (await db.execute(sql`INSERT INTO clock_reminder_deliveries
    (shift_id, caregiver_id, event_type, recipient_user_id, status)
    VALUES (\${input.shiftId}, \${input.caregiverId}, \${input.eventType}, \${input.recipientUserId}, 'claimed')
    ON CONFLICT (shift_id, caregiver_id, event_type, recipient_user_id) DO NOTHING
    RETURNING id`) as any).rows[0];
  if (!claim) return false;

  await db.execute(sql`INSERT INTO notifications (user_id, type, title, message, related_id)
    VALUES (\${input.recipientUserId}, \${input.eventType}, \${input.title}, \${input.message}, \${input.shiftId})`);

  const appUrl = config.WEB_APP_URL.replace(/\/$/, "");
  const shiftUrl = appUrl + (input.recipientName === "caregiver" ? "/caregiver-dashboard#clock" : "/employer-dashboard#activity");
  await Promise.all([
    sendPushToUsers([input.recipientUserId], {
      title: input.title,
      body: input.message,
      data: { type: input.eventType, shiftId: input.shiftId, url: shiftUrl },
    }),
    sendTransactionalEmail(input.recipientEmail, input.title, input.message + "\n\nOpen Elite Bridge: " + shiftUrl),
  ]);

  if (smsReady()) {
    try {
      await ensureSms();
      const preference = (await db.execute(sql`SELECT phone FROM sms_preferences
        WHERE user_id = \${input.recipientUserId} AND verified = true AND opted_in = true`) as any).rows[0];
      if (preference?.phone) {
        try {
          await sendSms(preference.phone, "Elite Bridge: " + input.message + " Open " + shiftUrl + ". Reply STOP to opt out.");
        } catch {
          console.warn("Clock reminder SMS could not be confirmed");
        }
      }
    } catch {
      console.warn("Clock reminder SMS preferences could not be checked");
    }
  }

  await db.execute(sql`UPDATE clock_reminder_deliveries
    SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = \${claim.id}`);
  return true;
}

export async function processClockReminders() {
  await ensureClockReminderTables();
  const preShift = (await db.execute(sql`SELECT sp.id AS shift_id, sp.title, sp.service_type, sp.start_time, sp.time_zone,
      a.caregiver_id, c.user_id AS caregiver_user_id, cu.email AS caregiver_email,
      cu.first_name AS caregiver_first_name, cu.last_name AS caregiver_last_name,
      e.user_id AS employer_user_id, eu.email AS employer_email,
      s.pre_shift_minutes, s.notify_employer
    FROM shift_posts sp
    JOIN employers e ON e.id = sp.employer_id
    JOIN shift_applications a ON a.shift_id = sp.id AND a.status = 'approved'
    JOIN caregivers c ON c.id = a.caregiver_id
    JOIN users cu ON cu.id = c.user_id AND cu.is_active = true
    JOIN users eu ON eu.id = e.user_id AND eu.is_active = true
    JOIN clock_reminder_settings s ON s.employer_id = e.id AND s.pre_shift_enabled = true
    WHERE sp.status NOT IN ('cancelled','closed','completed')
      AND sp.start_time > CURRENT_TIMESTAMP
      AND sp.start_time <= CURRENT_TIMESTAMP + make_interval(mins => s.pre_shift_minutes)
      AND sp.start_time > CURRENT_TIMESTAMP + make_interval(mins => s.pre_shift_minutes - 5)
      AND NOT EXISTS (
        SELECT 1 FROM shift_activities i
        WHERE i.shift_id = sp.id AND i.caregiver_id = a.caregiver_id AND i.type = 'clock_in'
      )
    ORDER BY sp.start_time ASC`) as any).rows;

  let preShiftSent = 0;
  for (const row of preShift) {
    const title = String(row.title || row.service_type || "care shift");
    const start = localShiftTime(row.start_time, row.time_zone);
    const message = "Your " + title + " shift starts at " + start + ". Please open Elite Bridge and clock in when you arrive.";
    if (await sendNotice({
      shiftId: Number(row.shift_id), caregiverId: Number(row.caregiver_id),
      eventType: "pre_shift", recipientUserId: Number(row.caregiver_user_id),
      recipientEmail: row.caregiver_email, recipientName: "caregiver",
      title: "Clock-in reminder", message,
    })) preShiftSent++;
  }

  const late = (await db.execute(sql`SELECT sp.id AS shift_id, sp.title, sp.service_type, sp.start_time, sp.end_time, sp.time_zone,
      a.caregiver_id, c.user_id AS caregiver_user_id, cu.email AS caregiver_email,
      cu.first_name AS caregiver_first_name, cu.last_name AS caregiver_last_name,
      e.user_id AS employer_user_id, eu.email AS employer_email,
      s.late_grace_minutes, s.notify_employer
    FROM shift_posts sp
    JOIN employers e ON e.id = sp.employer_id
    JOIN shift_applications a ON a.shift_id = sp.id AND a.status = 'approved'
    JOIN caregivers c ON c.id = a.caregiver_id
    JOIN users cu ON cu.id = c.user_id AND cu.is_active = true
    JOIN users eu ON eu.id = e.user_id AND eu.is_active = true
    JOIN clock_reminder_settings s ON s.employer_id = e.id AND s.late_alert_enabled = true
    WHERE sp.status NOT IN ('cancelled','closed','completed')
      AND sp.start_time + make_interval(mins => s.late_grace_minutes) <= CURRENT_TIMESTAMP
      AND sp.end_time > CURRENT_TIMESTAMP
      AND NOT EXISTS (
        SELECT 1 FROM shift_activities i
        WHERE i.shift_id = sp.id AND i.caregiver_id = a.caregiver_id AND i.type = 'clock_in'
      )
    ORDER BY sp.start_time ASC`) as any).rows;

  let lateSent = 0;
  for (const row of late) {
    const title = String(row.title || row.service_type || "care shift");
    const start = localShiftTime(row.start_time, row.time_zone);
    const caregiver = [row.caregiver_first_name, row.caregiver_last_name].filter(Boolean).join(" ") || "your caregiver";
    const message = "Your " + title + " shift started at " + start + " and you are not clocked in yet. Please clock in now or contact your manager if plans changed.";
    if (await sendNotice({
      shiftId: Number(row.shift_id), caregiverId: Number(row.caregiver_id),
      eventType: "late_caregiver", recipientUserId: Number(row.caregiver_user_id),
      recipientEmail: row.caregiver_email, recipientName: "caregiver",
      title: "You are not clocked in yet", message,
    })) lateSent++;

    if (row.notify_employer && row.employer_user_id && row.employer_email) {
      const managerMessage = caregiver + " has not clocked in for the " + title + " shift that started at " + start + ". Please check whether coverage is on track.";
      if (await sendNotice({
        shiftId: Number(row.shift_id), caregiverId: Number(row.caregiver_id),
        eventType: "late_employer", recipientUserId: Number(row.employer_user_id),
        recipientEmail: row.employer_email, recipientName: "employer",
        title: "Late clock-in alert", message: managerMessage,
      })) lateSent++;
    }
  }

  return { preShiftSent, lateSent, checkedAt: new Date().toISOString() };
}
