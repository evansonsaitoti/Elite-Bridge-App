import nodemailer from "nodemailer";
import axios from "axios";
import { config } from "../config/env.js";

type EmailMessage = { to: string; subject: string; text: string; html?: string };

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (config.RESEND_API_KEY && config.RESEND_FROM) {
    const response = await axios.post("https://api.resend.com/emails", {
      from: config.RESEND_FROM, ...message, to: [message.to],
    }, {
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}` },
      timeout: 15_000,
    });
    return Boolean(response.data?.id);
  }
  if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS || !config.SMTP_FROM) {
    console.warn("Email not sent: configure Resend or SMTP");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  const result = await transporter.sendMail({ from: config.SMTP_FROM, ...message });
  return result.accepted.some((recipient: unknown) => String(recipient).toLowerCase() === message.to.toLowerCase());
}

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
}
