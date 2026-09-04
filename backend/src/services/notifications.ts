import axios from "axios";
import nodemailer from "nodemailer";
import { sql } from "drizzle-orm";

import { config } from "../config/env";
import { db } from "../db";

type SignupDetails = {
  email: string;
  firstName: string;
  lastName: string;
  role: "caregiver" | "employer";
  phone?: string;
  companyName?: string;
};

export async function sendSignupAlert(details: SignupDetails): Promise<boolean> {
  if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS || !config.SMTP_FROM) {
    console.warn("Signup alert email skipped: SMTP is not fully configured");
    return false;
  }

  try {
    const transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    const roleLabel = details.role === "employer" ? "Employer" : "Caregiver";
    await transport.sendMail({
      from: config.SMTP_FROM,
      to: config.SIGNUP_ALERT_EMAIL,
      subject: `New Elite Bridge ${roleLabel} signup`,
      text: [
        `A new ${roleLabel.toLowerCase()} registered on Elite Bridge.`,
        "",
        `Name: ${details.firstName} ${details.lastName}`,
        `Email: ${details.email}`,
        `Phone: ${details.phone || "Not provided"}`,
        ...(details.role === "employer" ? [`Organization: ${details.companyName || "Not provided"}`] : []),
        `Registered: ${new Date().toISOString()}`,
        "",
        `Source app: Elite Bridge ${roleLabel}`,
      ].join("\n"),
    });
    return true;
  } catch (error) {
    console.error("Signup alert email failed", error);
    return false;
  }
}

type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
};

export async function sendPushToUsers(userIds: number[], message: PushMessage): Promise<void> {
  try {
    const uniqueIds = [...new Set(userIds.filter(Number.isInteger))];
    if (!uniqueIds.length) return;
    const result = await db.execute(sql`
      SELECT expo_push_token FROM push_tokens
      WHERE user_id IN (${sql.join(uniqueIds.map((id) => sql`${id}`), sql`, `)})
    `);
    await deliverPush((result as any).rows.map((row: any) => row.expo_push_token), message);
  } catch (error) {
    console.error("Push recipient lookup failed", error);
  }
}

export async function sendPushToRole(role: "caregiver" | "employer", message: PushMessage): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT pt.expo_push_token
      FROM push_tokens pt
      JOIN users u ON u.id = pt.user_id
      WHERE u.role = ${role} AND u.is_active = true
    `);
    await deliverPush((result as any).rows.map((row: any) => row.expo_push_token), message);
  } catch (error) {
    console.error("Push recipient lookup failed", error);
  }
}

async function deliverPush(tokens: string[], message: PushMessage): Promise<void> {
  const uniqueTokens = [...new Set(tokens)].filter((token) => /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/.test(token));
  if (!uniqueTokens.length) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${config.EXPO_ACCESS_TOKEN}`;

  for (let index = 0; index < uniqueTokens.length; index += 100) {
    const batch = uniqueTokens.slice(index, index + 100);
    try {
      const response = await axios.post("https://exp.host/--/api/v2/push/send", batch.map((to) => ({
        to,
        sound: "default",
        title: message.title,
        body: message.body,
        data: message.data || {},
      })), { headers, timeout: 15_000 });

      const tickets = Array.isArray(response.data?.data) ? response.data.data : [response.data?.data];
      const invalid = batch.filter((_, itemIndex) => tickets[itemIndex]?.details?.error === "DeviceNotRegistered");
      if (invalid.length) {
        await db.execute(sql`DELETE FROM push_tokens WHERE expo_push_token IN (${sql.join(invalid.map((token) => sql`${token}`), sql`, `)})`);
      }
    } catch (error) {
      console.error("Expo push delivery failed", error);
    }
  }
}
