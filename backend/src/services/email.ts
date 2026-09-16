import nodemailer from "nodemailer";
import { config } from "../config/env.js";

type SignupEmailInput = {
  email: string;
  firstName: string;
  lastName: string;
  role: "caregiver" | "employer";
  phone?: string;
  companyName?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function emailFrame(preview: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(preview)}</title></head>
  <body style="margin:0;background:#f3f6f4;font-family:Arial,sans-serif;color:#19372d">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f4;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e1e9e4">
          <tr><td style="background:#0b3726;padding:26px 32px;color:#ffffff">
            <div style="font-size:22px;font-weight:800;letter-spacing:.4px">ELITE <span style="color:#d09a3b">BRIDGE</span></div>
          </td></tr>
          <tr><td style="padding:34px 32px">${body}</td></tr>
          <tr><td style="padding:20px 32px;background:#f8faf9;color:#68776f;font-size:12px;line-height:18px">Elite Bridge · Care coordination across web and mobile</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function welcomeEmail(input: SignupEmailInput) {
  const firstName = escapeHtml(input.firstName);
  const isEmployer = input.role === "employer";
  const roleName = isEmployer ? "employer" : "caregiver";
  const heading = isEmployer ? "Your care workspace is ready" : "Your caregiver workspace is ready";
  const intro = isEmployer
    ? "Post shifts, coordinate caregivers, review activity, and keep your care operation organized from the web or mobile app."
    : "Build your profile, review care opportunities, manage your schedule, and keep your work activity together across web and mobile.";
  const nextStep = isEmployer ? "Complete your organization setup" : "Complete your caregiver profile";

  return {
    subject: `Welcome to Elite Bridge, ${input.firstName}`,
    text: `Welcome to Elite Bridge, ${input.firstName}. Your ${roleName} account is ready. ${intro} Sign in at ${config.APP_URL}`,
    html: emailFrame(
      `Welcome to your Elite Bridge ${roleName} account`,
      `<p style="margin:0 0 8px;color:#c08530;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase">Welcome to Elite Bridge</p>
       <h1 style="margin:0 0 14px;font-size:28px;line-height:36px;color:#0b3726">${heading}</h1>
       <p style="margin:0 0 18px;font-size:16px;line-height:25px;color:#465a51">Hi ${firstName},</p>
       <p style="margin:0 0 24px;font-size:16px;line-height:25px;color:#465a51">${intro}</p>
       <a href="${escapeHtml(config.APP_URL)}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#0b3726;color:#ffffff;text-decoration:none;font-weight:700">${nextStep}</a>
       <p style="margin:24px 0 0;font-size:14px;line-height:22px;color:#68776f">Use the same email and password in the Elite Bridge mobile app and web app.</p>`,
    ),
  };
}

function internalSignupEmail(input: SignupEmailInput) {
  const fullName = escapeHtml(`${input.firstName} ${input.lastName}`);
  const roleName = input.role === "employer" ? "Employer" : "Caregiver";
  const details = [
    ["Name", fullName],
    ["Account type", roleName],
    ["Email", escapeHtml(input.email)],
    ["Phone", escapeHtml(input.phone || "Not provided")],
    ...(input.role === "employer" ? [["Organization", escapeHtml(input.companyName || "Not provided")]] : []),
  ];

  return {
    subject: `New ${roleName.toLowerCase()} signup: ${input.firstName} ${input.lastName}`,
    text: `New Elite Bridge signup\nName: ${input.firstName} ${input.lastName}\nAccount type: ${roleName}\nEmail: ${input.email}\nPhone: ${input.phone || "Not provided"}${input.companyName ? `\nOrganization: ${input.companyName}` : ""}`,
    html: emailFrame(
      `New ${roleName.toLowerCase()} signup`,
      `<p style="margin:0 0 8px;color:#c08530;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase">New account</p>
       <h1 style="margin:0 0 20px;font-size:26px;color:#0b3726">A new ${roleName.toLowerCase()} joined Elite Bridge</h1>
       <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${details
         .map(([label, value]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e8eeea;color:#68776f;width:140px">${label}</td><td style="padding:10px 0;border-bottom:1px solid #e8eeea;color:#19372d;font-weight:700">${value}</td></tr>`)
         .join("")}</table>`,
    ),
  };
}

export async function sendSignupEmails(input: SignupEmailInput) {
  if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS || !config.SMTP_FROM) {
    console.warn("Signup emails skipped: SMTP configuration is incomplete");
    return { sent: false as const, reason: "smtp_not_configured" as const };
  }

  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE ?? config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });
  const from = `${config.SMTP_FROM_NAME} <${config.SMTP_FROM}>`;
  const welcome = welcomeEmail(input);
  const internal = internalSignupEmail(input);

  const results = await Promise.allSettled([
    transport.sendMail({ from, to: input.email, ...welcome }),
    transport.sendMail({ from, to: config.SIGNUP_NOTIFICATION_EMAIL, replyTo: input.email, ...internal }),
  ]);
  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length) {
    console.error("One or more signup emails failed", failed.map((result) => result.status === "rejected" ? result.reason : undefined));
  }

  return { sent: failed.length === 0, delivered: results.length - failed.length };
}
