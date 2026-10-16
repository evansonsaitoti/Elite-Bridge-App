import nodemailer from "nodemailer";
import axios from "axios";
import { config } from "../config/env.js";

type EmailAttachment = { filename: string; content: Buffer; contentType?: string };
type EmailMessage = { from?: string; to: string; subject: string; text: string; html?: string; attachments?: EmailAttachment[] };

const DEFAULT_FROM = "Elite Bridge Staffing <info@elitebridgestaffing.com>";
const SIGNATURE_MARKER = "elite-bridge-official-signature";
const LOGO_URL = "https://app.elitebridgestaffing.com/invoice-approved-logo.webp";

export function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
}

function textToHtml(value: string): string {
  const safe = escapeEmailHtml(value);
  // Linkify URLs for plaintext-only welcome, verification, and shift messages.
  return safe.replace(/https?:\/\/[^\s<]+/g, (url) =>
    '<a href="' + url + '" style="color:#064024">' + url + '</a>'
  ).replace(/\r?\n/g, "<br>");
}

export const ELITE_BRIDGE_TEXT_SIGNATURE = [
  "--",
  "Elite Bridge Staffing LLC",
  "Staffing You Can Rely On",
  "📞 (508) 251-9346",
  "📧 info@elitebridgestaffing.com",
  "🌐 www.elitebridgestaffing.com",
  "144 Thissell Ave, Dracut, MA 01826"
].join("\n");

export function addEliteBridgeEmailSignature(message: EmailMessage): EmailMessage {
  // All mail sent through this service gets the same signature, exactly once.
  if (message.html?.includes(SIGNATURE_MARKER)) return message;
  const originalText = message.text || "";
  const text = originalText.includes(ELITE_BRIDGE_TEXT_SIGNATURE)
    ? originalText
    : originalText.trimEnd() + "\n\n" + ELITE_BRIDGE_TEXT_SIGNATURE;
  const body = message.html?.trim() || textToHtml(originalText);
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#20352a;font-size:14px;line-height:1.6;">',
    '<div>' + body + '</div>',
    '<!-- ' + SIGNATURE_MARKER + ' -->',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;border-top:2px solid #b9791f;padding-top:15px;width:100%;max-width:560px;border-collapse:separate;">',
    '<tr><td style="padding:12px 0 7px 0;">',
    '<img src="' + LOGO_URL + '" width="244" height="61" alt="Elite Bridge — Staffing You Can Rely On" style="display:block;width:244px;height:61px;max-width:100%;border:0;" />',
    '</td></tr>',
    '<tr><td style="color:#586a60;font-size:12px;padding-top:4px;">Non-medical home care services</td></tr>',
    '<tr><td style="font-size:12px;padding-top:9px;"><span style="font-size:15px;vertical-align:middle;" aria-hidden="true">📞</span> &nbsp;<a href="tel:+15082519346" style="color:#064024;text-decoration:none;">(508) 251-9346</a></td></tr>',
    '<tr><td style="font-size:12px;padding-top:5px;"><span style="font-size:15px;vertical-align:middle;" aria-hidden="true">📧</span> &nbsp;<a href="mailto:info@elitebridgestaffing.com" style="color:#064024;text-decoration:none;">info@elitebridgestaffing.com</a></td></tr>',
    '<tr><td style="font-size:12px;padding-top:5px;"><span style="font-size:15px;vertical-align:middle;" aria-hidden="true">🌐</span> &nbsp;<a href="https://www.elitebridgestaffing.com" style="color:#064024;text-decoration:none;">www.elitebridgestaffing.com</a></td></tr>',
    '<tr><td style="font-size:11px;color:#68766f;padding-top:5px;">144 Thissell Ave, Dracut, MA 01826</td></tr>',
    '</table></div>'
  ].join("\n");
  // Respect full-document templates, too: insert before </body> rather than
  // nesting one HTML document inside another. The signature marker remains
  // idempotent across both representations.
  const finalHtml = message.html && /<\/body>/i.test(message.html)
    ? message.html.replace(/<\/body>/i, html.slice(html.indexOf('<!-- ' + SIGNATURE_MARKER), html.lastIndexOf('</div>')) + '</body>')
    : html;
  return { ...message, text, html: finalHtml };
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const signed = addEliteBridgeEmailSignature(message);
  // Prefer the verified domain; preserve any explicit from address.
  const from = signed.from || config.RESEND_FROM || DEFAULT_FROM;
  if (config.RESEND_API_KEY) {
    const response = await axios.post("https://api.resend.com/emails", {
      from,
      to: [signed.to],
      subject: signed.subject,
      text: signed.text,
      html: signed.html,
      attachments: signed.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString("base64"),
        ...(attachment.contentType ? { content_type: attachment.contentType } : {}),
      })),
    }, {
      headers: { Authorization: "Bearer " + config.RESEND_API_KEY },
      timeout: 15_000,
    });
    return Boolean(response.data?.id);
  }
  if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS || (!signed.from && !config.SMTP_FROM)) {
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
  const result = await transporter.sendMail({
    ...signed,
    from: signed.from || config.SMTP_FROM,
  });
  return result.accepted.some((recipient: unknown) => String(recipient).toLowerCase() === signed.to.toLowerCase());
}
