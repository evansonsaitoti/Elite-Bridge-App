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
  "📍 144 Thissell Ave, Dracut, MA 01826"
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
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;width:100%;max-width:560px;border-collapse:collapse;table-layout:fixed;">',
    '<tr>',
    '<td width="35%" style="width:35%;vertical-align:middle;padding:0 12px 0 0;text-align:left;">',
    '<img src="' + LOGO_URL + '" width="148" height="37" alt="Elite Bridge — Staffing You Can Rely On" style="display:block;width:100%;max-width:148px;height:auto;border:0;" />',
    '</td>',
    '<td width="65%" style="width:65%;vertical-align:middle;padding:2px 0 2px 13px;border-left:2px solid #b9791f;text-align:left;font-size:11px;line-height:1.5;color:#064024;overflow-wrap:anywhere;">',
    '<div style="margin:0 0 5px;"><span style="font-size:9px;line-height:1;display:inline-block;width:13px;vertical-align:baseline;" aria-hidden="true">📞</span> <a href="tel:+15082519346" style="color:#064024;text-decoration:none;">(508) 251-9346</a></div>',
    '<div style="margin:0 0 5px;"><span style="font-size:9px;line-height:1;display:inline-block;width:13px;vertical-align:baseline;" aria-hidden="true">📧</span> <a href="mailto:info@elitebridgestaffing.com" style="color:#064024;text-decoration:none;">info@elitebridgestaffing.com</a></div>',
    '<div style="margin:0 0 5px;"><span style="font-size:9px;line-height:1;display:inline-block;width:13px;vertical-align:baseline;" aria-hidden="true">🌐</span> <a href="https://www.elitebridgestaffing.com" style="color:#064024;text-decoration:none;">www.elitebridgestaffing.com</a></div>',
    '<div style="margin-top:6px;color:#68766f;font-size:10px;line-height:1.4;"><span style="font-size:9px;line-height:1;display:inline-block;width:13px;vertical-align:baseline;" aria-hidden="true">📍</span> 144 Thissell Ave, Dracut, MA 01826</div>',
    '</td></tr>',
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
  // Organization-wide sender policy: all Elite Bridge app mail uses the verified business mailbox.
  // Callers cannot override the From header with a personal address.
  const from = DEFAULT_FROM;
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
  if (!config.SMTP_HOST || !config.SMTP_PORT || !config.SMTP_USER || !config.SMTP_PASS) {
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
    from,
  });
  return result.accepted.some((recipient: unknown) => String(recipient).toLowerCase() === signed.to.toLowerCase());
}
