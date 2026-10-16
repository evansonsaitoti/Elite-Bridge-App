import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ config: {} as Record<string, unknown>, post: vi.fn(), sendMail: vi.fn(), transport: vi.fn() }));
vi.mock("../src/config/env", () => ({ config: mocks.config }));
vi.mock("axios", () => ({ default: { post: mocks.post } }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.transport } }));
import { sendEmail, escapeEmailHtml, addEliteBridgeEmailSignature, ELITE_BRIDGE_TEXT_SIGNATURE } from "../src/services/email";
const message = { to: "info@elitebridgestaffing.com", subject: "Test", text: "Local test" };
beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mocks.config)) delete mocks.config[key];
  mocks.transport.mockReturnValue({ sendMail: mocks.sendMail });
});
describe("Email provider acknowledgement", () => {
  it("does not report sent when no provider is configured", async () => {
    expect(await sendEmail(message)).toBe(false);
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.transport).not.toHaveBeenCalled();
  });
  it("uses Resend for every email type and requires a provider message id", async () => {
    Object.assign(mocks.config, { RESEND_API_KEY: "intercepted", RESEND_FROM: "notifications@elitebridgestaffing.com" });
    mocks.post.mockResolvedValueOnce({ data: { id: "mail-id" } }).mockResolvedValueOnce({ data: {} });
    expect(await sendEmail({ ...message, html: "<p>Test</p>" })).toBe(true);
    expect(mocks.post.mock.calls[0][1]).toMatchObject({ to: [message.to] });
    expect(mocks.post.mock.calls[0][1].html).toContain("<p>Test</p>");
    expect(mocks.post.mock.calls[0][1].html).toContain("elite-bridge-official-signature");
    expect(mocks.post.mock.calls[0][1].text).toContain(ELITE_BRIDGE_TEXT_SIGNATURE);
    expect(await sendEmail(message)).toBe(false);
  });
  it("requires SMTP recipient acceptance and configures timeouts", async () => {
    Object.assign(mocks.config, { SMTP_HOST: "smtp.example.com", SMTP_PORT: 465, SMTP_USER: "test", SMTP_PASS: "intercepted", SMTP_FROM: "notifications@elitebridgestaffing.com" });
    mocks.sendMail.mockResolvedValueOnce({ accepted: [message.to] }).mockResolvedValueOnce({ accepted: [], rejected: [message.to] });
    expect(await sendEmail(message)).toBe(true);
    expect(mocks.transport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, connectionTimeout: 10000, socketTimeout: 15000 }));
    expect(await sendEmail(message)).toBe(false);
  });
  it("appends the approved company logo, contact details, and a plain text signature once", () => {
    const first = addEliteBridgeEmailSignature({ ...message, html: "<p>Monthly billing report</p>" });
    const second = addEliteBridgeEmailSignature(first);
    expect(first.html).toContain('<img src="https://app.elitebridgestaffing.com/invoice-approved-logo.webp"');
    expect(first.html).toContain("info@elitebridgestaffing.com");
    expect(first.html).toContain("144 Thissell Ave");
    expect(first.text).toContain(ELITE_BRIDGE_TEXT_SIGNATURE);
    expect(second).toEqual(first);
    expect(first.html?.match(/elite-bridge-official-signature/g)).toHaveLength(1);
  });
  it("escapes plaintext markup, preserves clickable URLs and appends the signature", () => {
    const result = addEliteBridgeEmailSignature({ ...message, text: 'Visit https://app.elitebridgestaffing.com\n<script>alert(1)</script>' });
    expect(result.html).toContain('&lt;script&gt;');
    expect(result.html).not.toContain('<script>');
    expect(result.html).toContain('href="https://app.elitebridgestaffing.com"');
    expect(result.text).toContain(ELITE_BRIDGE_TEXT_SIGNATURE);
  });
  it("uses the verified company sender by default and keeps PDF attachment bytes unchanged", async () => {
    Object.assign(mocks.config, { RESEND_API_KEY: "intercepted" });
    mocks.post.mockResolvedValueOnce({ data: { id: "mail-id" } });
    const pdf = Buffer.from("%PDF-1.4 test");
    expect(await sendEmail({ ...message, attachments: [{ filename:"invoice.pdf", content:pdf, contentType:"application/pdf" }] })).toBe(true);
    expect(mocks.post.mock.calls[0][1].from).toBe("Elite Bridge Staffing <info@elitebridgestaffing.com>");
    expect(mocks.post.mock.calls[0][1].attachments[0]).toMatchObject({
      filename:"invoice.pdf",content:pdf.toString("base64"),content_type:"application/pdf"
    });
  });
  it("inserts the footer inside full HTML documents without adding a nested document", () => {
    const result = addEliteBridgeEmailSignature({
      ...message, html:"<!doctype html><html><body><p>Care update</p></body></html>"
    });
    expect(result.html).toContain("<p>Care update</p>");
    expect(result.html).toContain("elite-bridge-official-signature");
    expect(result.html).toContain("</body></html>");
    expect(result.html?.match(/<\/body>/gi)).toHaveLength(1);
  });
  it("escapes user supplied names in HTML emails", () => {
    expect(escapeEmailHtml('<img src=x onerror="bad"> & O\'Neil')).toBe('&lt;img src=x onerror=&quot;bad&quot;&gt; &amp; O&#39;Neil');
  });
});
