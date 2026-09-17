import axios from "axios";
import { sendEmail } from "./email";
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

export async function sendTransactionalEmail(to: string, subject: string, text: string): Promise<boolean> {
  try {
    return await sendEmail({ to, subject, text });
  } catch {
    // Provider errors can contain credentials and message content.
    console.error("Transactional email failed; check the email provider delivery log");
    return false;
  }
}

export async function sendWelcomeEmail(details: SignupDetails): Promise<boolean> {
  return sendTransactionalEmail(details.email, "Welcome to Elite Bridge", [
    `Hi ${details.firstName},`, "", "Welcome to Elite Bridge.",
    details.role === "caregiver"
      ? "Complete your caregiver profile to review shifts and stay connected with your care team."
      : "Your employer workspace is ready. Invite your caregivers and post your first shift.",
    "", `Sign in: ${config.WEB_APP_URL}`, "", "Need help? Contact info@elitebridgestaffing.com.",
  ].join("\n"));
}

export async function sendOperationsAlert(event: string, details: string): Promise<boolean> {
  return sendTransactionalEmail(config.SIGNUP_ALERT_EMAIL, `Elite Bridge: ${event}`,
    `${details}\n\nReview in your workspace: ${config.WEB_APP_URL}\n\nRecorded: ${new Date().toISOString()}`);
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

  return sendTransactionalEmail(details.email, subject, text);
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

  const delivered = await sendTransactionalEmail(config.SIGNUP_ALERT_EMAIL, subject, text);
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
