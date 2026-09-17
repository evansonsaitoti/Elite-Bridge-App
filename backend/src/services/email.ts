import nodemailer from "nodemailer";
import { config } from "../config/env.js";

type EmailMessage = { to: string; subject: string; text: string; html: string };

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS || !config.SMTP_FROM) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });

  await transporter.sendMail({ from: config.SMTP_FROM, ...message });
  return true;
}
