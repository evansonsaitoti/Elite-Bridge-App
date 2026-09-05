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

type VerificationDetails = {
  email: string;
  firstName: string;
  verificationUrl: string;
};

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (config.RESEND_API_KEY && config.RESEND_FROM) {
    try {
      await axios.post("https://api.resend.com/emails", {
        from: config.RESEND_FROM,
        to: [to],
        subject,
        text,
      }, {
        headers: {
          Authorization: `Bearer ${config.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      });
      return true;
    } catch (error) {
      console.error("Resend email delivery failed", error);
      return false;
    }
  }

  if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS || !config.SMTP_FROM) {
    console.warn("Email skipped: Resend and SMTP are not fully configured");
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
    await transport.sendMail({ from: config.SMTP_FROM, to, subject, text });
    return true;
  } catch (error) {
    console.error("Email delivery failed", error);
    return false;
  }
}

export async function sendEmailVerification(details: VerificationDetails): Promise<boolean> {
  const subject = "Confirm your Elite Bridge email";
  const text = [
    `Hi ${details.firstName},`,
    "",
    "Welcome to Elite Bridge. Confirm your email address to activate your verified email status:",
    details.verificationUrl,
    "",
    "This secure link expires in 24 hours. If you did not create this account, you can ignore this email.",
    "",
    "Elite Bridge Staffing",
  ].join("\n");

  return sendEmail(details.email, subject, text);
}

export async function sendSignupAlert(details: SignupDetails): Promise<boolean> {
  const roleLabel = details.role === "employer" ? "Employer" : "Caregiver";
  const subject = `New Elite Bridge ${roleLabel} signup`;
  const text = [
    `A new ${roleLabel.toLowerCase()} registered on Elite Bridge.`,
    "",
    `Name: ${details.firstName} ${details.lastName}`,
    `Email: ${details.email}`,
    `Phone: ${details.phone || "Not provided"}`,
    ...(details.role === "employer" ? [`Organization: ${details.companyName || "Not provided"}`] : []),
    `Registered: ${new Date().toISOString()}`,
    "",
    `Source app: Elite Bridge ${roleLabel}`,
  ].join("\n");

  const delivered = await sendEmail(config.SIGNUP_ALERT_EMAIL, subject, text);
  if (delivered) console.info("Signup alert email sent");
  return delivered;
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
