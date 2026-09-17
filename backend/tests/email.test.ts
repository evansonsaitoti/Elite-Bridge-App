import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ config: {} as Record<string, unknown>, post: vi.fn(), sendMail: vi.fn(), transport: vi.fn() }));
vi.mock("../src/config/env", () => ({ config: mocks.config }));
vi.mock("axios", () => ({ default: { post: mocks.post } }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.transport } }));
import { sendEmail, escapeEmailHtml } from "../src/services/email";
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
    expect(mocks.post.mock.calls[0][1]).toMatchObject({ to: [message.to], html: "<p>Test</p>" });
    expect(await sendEmail(message)).toBe(false);
  });
  it("requires SMTP recipient acceptance and configures timeouts", async () => {
    Object.assign(mocks.config, { SMTP_HOST: "smtp.example.com", SMTP_PORT: 465, SMTP_USER: "test", SMTP_PASS: "intercepted", SMTP_FROM: "notifications@elitebridgestaffing.com" });
    mocks.sendMail.mockResolvedValueOnce({ accepted: [message.to] }).mockResolvedValueOnce({ accepted: [], rejected: [message.to] });
    expect(await sendEmail(message)).toBe(true);
    expect(mocks.transport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, connectionTimeout: 10000, socketTimeout: 15000 }));
    expect(await sendEmail(message)).toBe(false);
  });
  it("escapes user supplied names in HTML emails", () => {
    expect(escapeEmailHtml('<img src=x onerror="bad"> & O\'Neil')).toBe('&lt;img src=x onerror=&quot;bad&quot;&gt; &amp; O&#39;Neil');
  });
});
