import { sql } from "drizzle-orm";
import { db } from "../db";
import { config } from "../config/env";
import { sendTransactionalEmail } from "./notifications";

let ready: Promise<void> | undefined;
export function ensureNotificationPreferences(): Promise<void> {
  return ready ||= (async () => {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email_shift_alerts BOOLEAN NOT NULL DEFAULT true)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS shift_email_deliveries (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shift_id INTEGER NOT NULL, status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, shift_id))`);
  })().catch((error) => { ready = undefined; throw error; });
}

export async function sendShiftEmails(userIds: number[], shiftId: number): Promise<void> {
  const ids = [...new Set(userIds.filter(Number.isInteger))];
  if (!ids.length) return;
  await ensureNotificationPreferences();
  const recipients = (await db.execute(sql`
    SELECT u.id, u.email FROM users u
    LEFT JOIN notification_preferences p ON p.user_id = u.id
    WHERE u.id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
      AND u.role = 'caregiver' AND u.is_active = true
      AND COALESCE(p.email_shift_alerts, true) = true
  `) as any).rows as { id: number; email: string }[];
  // Claim each event before sending: replaying pickup must not duplicate emails.
  // Unknown provider outcomes are recorded and are never automatically retried.
  for (let offset = 0; offset < recipients.length; offset += 5) {
    const results = await Promise.allSettled(recipients.slice(offset, offset + 5).map(async user => {
      const claim = (await db.execute(sql`
        INSERT INTO shift_email_deliveries (user_id, shift_id, status)
        VALUES (${user.id}, ${shiftId}, 'submitting')
        ON CONFLICT (user_id, shift_id) DO NOTHING RETURNING id
      `) as any).rows[0];
      if (!claim) return;
      const accepted = await sendTransactionalEmail(user.email, "A shift is available in Elite Care", [
        "A shift from your care team is available for review.",
        "Open Elite Care and choose Shifts → Available shifts, or sign in to your workspace:",
        `${config.WEB_APP_URL.replace(/\/$/, "")}/dashboard`,
        "",
        "You can turn off shift emails in Elite Care notification settings.",
      ].join("\n"));
      await db.execute(sql`UPDATE shift_email_deliveries
        SET status=${accepted ? "provider_accepted" : "failed_or_unknown"}, updated_at=CURRENT_TIMESTAMP
        WHERE id=${claim.id}`);
    }));
    if (results.some(result => result.status === "rejected")) console.warn("Some shift email records could not be processed");
  }
}
