import axios from "axios";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { config } from "../config/env";

let ready: Promise<void> | undefined;
export function ensureSms() {
  return (ready ||= (async () => {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS sms_preferences (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, phone TEXT NOT NULL, opted_in BOOLEAN NOT NULL DEFAULT false,
      verified BOOLEAN NOT NULL DEFAULT false, consent_at TIMESTAMPTZ, consent_version TEXT,
      code_hash TEXT, code_expires TIMESTAMPTZ, attempts INTEGER NOT NULL DEFAULT 0,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS sms_verified_phone_idx ON sms_preferences(phone) WHERE verified=true`,
    );
    await db.execute(sql`CREATE TABLE IF NOT EXISTS sms_deliveries (
      id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, event_key TEXT NOT NULL,
      status TEXT NOT NULL, provider_id TEXT UNIQUE, error_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id,event_key))`);
  })().catch((e) => {
    ready = undefined;
    throw e;
  }));
}
export function smsReady() {
  return (
    process.env.SMS_ENABLED === "true" &&
    !!(
      config.TWILIO_ACCOUNT_SID &&
      config.TWILIO_AUTH_TOKEN &&
      config.TWILIO_PHONE_NUMBER &&
      process.env.SMS_WEBHOOK_BASE_URL?.startsWith("https://")
    )
  );
}
export async function sendSms(phone: string, body: string) {
  if (!smsReady()) throw new Error("SMS is not configured");
  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}/Messages.json`,
    new URLSearchParams({
      To: phone,
      From: config.TWILIO_PHONE_NUMBER!,
      Body: body,
      StatusCallback: `${process.env.SMS_WEBHOOK_BASE_URL!.replace(/\/$/, "")}/api/sms/status`,
    }).toString(),
    {
      auth: {
        username: config.TWILIO_ACCOUNT_SID!,
        password: config.TWILIO_AUTH_TOKEN!,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10000,
    },
  );
  if (!response.data?.sid)
    throw new Error("SMS provider did not acknowledge the request");
  return response.data;
}
export async function sendShiftSms(userIds: number[], shiftId: number) {
  if (!smsReady() || !userIds.length) return;
  await ensureSms();
  // Sequential claims prevent duplicate provider requests when an event is replayed.
  for (let offset = 0; offset < userIds.length; offset += 10)
    await Promise.allSettled(
      userIds.slice(offset, offset + 10).map(async (userId) => {
        const pref = (
          (await db.execute(
            sql`SELECT phone FROM sms_preferences WHERE user_id=${userId} AND opted_in=true AND verified=true`,
          )) as any
        ).rows[0];
        if (!pref) return;
        const record = (
          (await db.execute(
            sql`INSERT INTO sms_deliveries(user_id,event_key,status) VALUES (${userId},${`shift:${shiftId}`},'submitting') ON CONFLICT (user_id,event_key) DO NOTHING RETURNING id`,
          )) as any
        ).rows[0];
        if (!record) return;
        try {
          const message = await sendSms(
            pref.phone,
            `Elite Bridge: a matched shift is available. Sign in at ${config.WEB_APP_URL} to review it. Reply STOP to opt out.`,
          );
          await db.execute(
            sql`UPDATE sms_deliveries SET provider_id=${message.sid},status=${message.status || "queued"},updated_at=CURRENT_TIMESTAMP WHERE id=${record.id}`,
          );
        } catch (e: any) {
          // A timeout may have occurred after acceptance. Never blindly retry an uncertain send.
          const code = String(e.response?.data?.code || "unknown");
          await db.execute(
            sql`UPDATE sms_deliveries SET status='failed_or_unknown',error_code=${code},updated_at=CURRENT_TIMESTAMP WHERE id=${record.id}`,
          );
          if (code === "21610")
            await db.execute(
              sql`UPDATE sms_preferences SET opted_in=false WHERE user_id=${userId}`,
            );
        }
      }),
    );
}
