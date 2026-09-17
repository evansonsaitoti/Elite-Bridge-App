import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import express from "express";
import type { Server } from "node:http";
import * as schema from "../src/db/schema";

// Real PostgreSQL SQL in a disposable database. No production database or provider is contacted.
const outbound = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("axios", () => ({ default: { post: outbound.post } }));
const database = new PGlite();
const db = drizzle(database, { schema });
vi.doMock("../src/db/index", () => ({ db, checkDatabaseConnection: async () => true }));

let server: Server;
let base: string;
let employer: any, otherEmployer: any, caregiver: any, replacement: any;
let invitation: any, reviewShift: any, instantShift: any, application: any, callout: any;
const password = "Local-test-only-Password-9842";

async function request(path: string, account?: any, method = "GET", body?: unknown, status = 200) {
  const response = await fetch(`${base}/api${path}`, {
    method, headers: { "Content-Type": "application/json", ...(account ? { Authorization: `Bearer ${account.token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  expect(response.status, `${method} ${path}: ${text}`).toBe(status);
  return data;
}
const signup = (role: string, email: string, extra = {}) => request("/auth/register", undefined, "POST", {
  email, password, firstName: "Test", lastName: role, role, companyName: "Isolated QA", ...extra,
}, 201);
function shift(mode = "review", extra = {}) {
  return { title: "ISOLATED TEST SHIFT", serviceType: "personal_care", caregiverType: "caregiver",
    startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), startTime: "09:00", endTime: "13:00",
    location: { type: "facility", address: "Test only", city: "Lowell", state: "MA", zipCode: "01852" },
    pay: { hourlyRate: 30 }, responsibilities: "Test only", contact: { name: "Test", phone: "2025550147" },
    assignmentMode: mode, ...extra };
}

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://unused:unused@localhost/isolated_test");
  vi.stubEnv("JWT_SECRET", "isolated-test-secret-at-least-32-characters");
  vi.stubEnv("RESEND_API_KEY", "test-intercepted-key");
  vi.stubEnv("RESEND_FROM", "Elite Bridge <notifications@elitebridgestaffing.com>");
  vi.stubEnv("SIGNUP_ALERT_EMAIL", "info@elitebridgestaffing.com");
  vi.stubEnv("CHECKR_API_KEY", "");
  vi.stubEnv("CHEKR_API_KEY", "");
  outbound.post.mockResolvedValue({ data: { id: "intercepted-email-id" } });
  const { ensureCoreTables } = await import("../src/db/bootstrap");
  await ensureCoreTables();
  const app = express();
  app.use(express.json());
  for (const route of ["auth", "employers", "caregivers", "bookings", "messages", "notifications", "payroll"]) {
    app.use(`/api/${route}`, (await import(`../src/routes/${route}.ts`)).default);
  }
  app.use((await import("../src/middleware/errorHandler")).errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
}, 60000);
afterAll(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await database.close();
  vi.unstubAllEnvs();
});

describe.sequential("Employer and caregiver lifecycle", () => {
  it("registers an employer and sends welcome plus office signup alert", async () => {
    employer = await signup("employer", "employer@example.com");
    expect(employer.emailNotifications).toEqual({ officeAlertSent: true, welcomeSent: true });
    expect(outbound.post.mock.calls.some(([, body]) => body.to[0] === "info@elitebridgestaffing.com" && body.subject.includes("signup"))).toBe(true);
    expect(outbound.post.mock.calls.some(([, body]) => body.to[0] === "employer@example.com" && body.subject.includes("Welcome"))).toBe(true);
    otherEmployer = await signup("employer", "other@example.com");
  });
  it("persists profiles across independent login sessions", async () => {
    await request("/employers/me", employer, "PUT", { companyName: "Persisted test company" });
    const login = await request("/auth/login", undefined, "POST", { email: "employer@example.com", password });
    expect((await request("/employers/me", login)).profile.companyName).toBe("Persisted test company");
    await request("/auth/login", undefined, "POST", { email: "employer@example.com", password: "incorrect" }, 401);
  });
  it("creates an email invitation with a web signup link", async () => {
    invitation = await request("/employers/invitations", employer, "POST", { firstName: "Test", email: "caregiver@example.com" }, 201);
    expect(invitation.emailSent).toBe(true);
    expect(new URL(invitation.inviteUrl).origin).toBe("https://app.elitebridgestaffing.com");
    invitation.token = new URL(invitation.inviteUrl).searchParams.get("invite");
    expect((await request(`/employers/invitations/${invitation.token}`)).invitation.status).toBe("pending");
  });
  it("rejects invitations used with the wrong email", async () => {
    await request("/auth/register", undefined, "POST", { email: "wrong@example.com", password, firstName: "Test", lastName: "Wrong", role: "caregiver", inviteToken: invitation.token }, 400);
  });
  it("shows an invited caregiver immediately, before profile setup or a shift", async () => {
    caregiver = await signup("caregiver", "caregiver@example.com", { inviteToken: invitation.token });
    const team = (await request("/bookings/employer/team", employer)).team;
    expect(team).toHaveLength(1);
    expect(team[0]).toMatchObject({ user_id: caregiver.user.id, assigned_shifts: 0, upcoming_shifts: 0 });
    expect(team[0].caregiver_id).toBeTypeOf("number");
    expect((await request("/bookings/employer/team", otherEmployer)).team).toEqual([]);
    expect((await request("/employers/invitations", employer)).invitations[0].status).toBe("accepted");
    await request(`/employers/invitations/${invitation.token}`, undefined, "GET", undefined, 404);
    replacement = await signup("caregiver", "replacement@example.com");
  });
  it("updates caregiver profile and matching preferences", async () => {
    await request(`/caregivers/${caregiver.user.id}`, caregiver, "PUT", { hourlyRate: 30, specialties: ["personal_care"], certifications: ["caregiver"], bio: "Test profile" });
    await request("/caregivers/me/matching", caregiver, "PUT", { availability: ["weekdays"], preferredServices: ["personal_care"], maxDistanceMiles: 25, instantOffers: true });
    expect((await request(`/caregivers/${caregiver.user.id}`, caregiver)).profile.bio).toBe("Test profile");
    await request(`/caregivers/${caregiver.user.id}`, replacement, "PUT", { hourlyRate: 1, specialties: ["other"] }, 403);
  });
  it("rejects unauthorized and invalid shifts", async () => {
    await request("/bookings", undefined, "POST", shift(), 401);
    await request("/bookings", caregiver, "POST", shift(), 403);
    await request("/bookings", employer, "POST", shift("review", { endTime: "08:00" }), 400);
  });
  it("posts a shift and synchronizes web, mobile and employer feeds", async () => {
    reviewShift = (await request("/bookings", employer, "POST", shift(), 201)).shift;
    const mobile = (await request("/bookings/open", caregiver)).shifts;
    const web = (await request("/bookings/available", caregiver)).shifts;
    expect(web).toEqual(mobile);
    expect(web[0].id).toBe(reviewShift.id);
    expect((await request("/bookings/employer/my", employer)).shifts[0].id).toBe(reviewShift.id);
    expect((await request("/bookings/employer/my", otherEmployer)).shifts).toEqual([]);
  });
  it("keeps qualification filtering identical across web and mobile", async () => {
    await request("/bookings", employer, "POST", shift("review", { serviceType: "specialist", caregiverType: "RN" }), 201);
    const mobile = (await request("/bookings/open", caregiver)).shifts;
    expect((await request("/bookings/available", caregiver)).shifts).toEqual(mobile);
    expect(mobile).toHaveLength(1);
  });
  it("applies, lists both sides, and prevents another employer approving", async () => {
    application = (await request(`/bookings/${reviewShift.id}/apply`, caregiver, "POST", { note: "Test application" }, 201)).application;
    expect((await request("/bookings/caregiver/my-applications", caregiver)).applications[0].status).toBe("pending");
    expect((await request("/bookings/employer/applications", employer)).applications[0].id).toBe(application.id);
    await request(`/bookings/employer/applications/${application.id}`, otherEmployer, "PATCH", { status: "approved" }, 404);
    await request(`/bookings/${reviewShift.id}/clock-in`, caregiver, "POST", {}, 403);
  });
  it("approves a caregiver and creates exactly one assigned booking", async () => {
    await request(`/bookings/employer/applications/${application.id}`, employer, "PATCH", { status: "approved" });
    expect((await request("/bookings/caregiver/my-applications", caregiver)).applications[0].shift.status).toBe("assigned");
    expect((await request("/bookings/employer/team", employer)).team[0].assigned_shifts).toBe(1);
    expect((await database.query("SELECT * FROM bookings")).rows).toHaveLength(1);
  });
  it("enforces clock ownership, duplicate prevention, and calculates a timesheet", async () => {
    await request(`/bookings/${reviewShift.id}/clock-in`, replacement, "POST", {}, 403);
    await request(`/bookings/${reviewShift.id}/clock-out`, caregiver, "POST", {}, 409);
    await request(`/bookings/${reviewShift.id}/clock-in`, caregiver, "POST", { notes: "test start" });
    await request(`/bookings/${reviewShift.id}/clock-in`, caregiver, "POST", {}, 409);
    await database.query("UPDATE shift_activities SET timestamp = CURRENT_TIMESTAMP - INTERVAL '2 hours' WHERE shift_id = $1 AND type = 'clock_in'", [reviewShift.id]);
    const out = await request(`/bookings/${reviewShift.id}/clock-out`, caregiver, "POST", { notes: "test finish" });
    expect(out.timesheet.worked_minutes).toBe(120);
    expect(Number(out.timesheet.total_amount)).toBe(60);
    const timesheets = (await request("/bookings/employer/timesheets", employer)).timesheets;
    expect(timesheets[0]).toMatchObject({ worked_hours: 2, total_amount: 60, status: "pending_approval" });
    expect((await request("/bookings/employer/timesheets", otherEmployer)).timesheets).toEqual([]);
    await request(`/bookings/${reviewShift.id}/clock-out`, caregiver, "POST", {}, 403);
  });
  it("claims an instant shift only once", async () => {
    instantShift = (await request("/bookings", employer, "POST", shift("instant", { startTime: "14:00", endTime: "17:00" }), 201)).shift;
    await request(`/bookings/${instantShift.id}/claim`, caregiver, "POST", {});
    await request(`/bookings/${instantShift.id}/claim`, replacement, "POST", {}, 409);
  });
  it("reopens a call-out, sends rescue offers and requires employer approval", async () => {
    callout = (await request(`/bookings/${instantShift.id}/callout`, caregiver, "POST", { reason: "other", note: "Isolated test" }, 201)).callout;
    const rescue = await request(`/bookings/employer/callouts/${callout.id}/launch-rescue`, employer, "POST", {});
    expect(rescue.offersSent).toBeGreaterThan(0);
    const offer = (await request("/bookings/caregiver/offers", replacement)).offers[0];
    await request(`/bookings/caregiver/offers/${offer.id}/respond`, caregiver, "POST", { status: "accepted" }, 404);
    await request(`/bookings/caregiver/offers/${offer.id}/respond`, replacement, "POST", { status: "accepted" });
    const pending = (await request("/bookings/employer/applications", employer)).applications.find((a: any) => a.caregiver_user_id === replacement.user.id);
    expect(pending.status).toBe("pending");
    await request(`/bookings/employer/applications/${pending.id}`, employer, "PATCH", { status: "approved" });
    expect((await request("/bookings/employer/callouts", employer)).callouts[0].status).toBe("resolved");
  });
  it("cancels a shift and prevents subsequent clock-in", async () => {
    await request(`/bookings/employer/${instantShift.id}/cancel`, employer, "PATCH", {}, 204);
    await request(`/bookings/${instantShift.id}/clock-in`, replacement, "POST", {}, 403);
  });
  it("synchronizes messages and isolates unrelated conversations", async () => {
    await request("/messages", employer, "POST", { recipientId: caregiver.user.id, content: "Isolated workflow test" }, 201);
    expect((await request(`/messages/${employer.user.id}`, caregiver)).messages[0].content).toBe("Isolated workflow test");
    expect((await request("/messages/conversations", caregiver)).conversations[0].id).toBe(employer.user.id);
    expect((await request(`/messages/${employer.user.id}`, replacement)).messages).toEqual([]);
  });
  it("permits only one concurrent approval and keeps retries idempotent", async () => {
    const target = (await request("/bookings", employer, "POST", shift(), 201)).shift;
    const one = (await request(`/bookings/${target.id}/apply`, caregiver, "POST", {}, 201)).application;
    const two = (await request(`/bookings/${target.id}/apply`, replacement, "POST", {}, 201)).application;
    const responses = await Promise.all([one, two].map(a => fetch(`${base}/api/bookings/employer/applications/${a.id}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${employer.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status: "approved" }),
    })));
    expect(responses.map(r => r.status).sort()).toEqual([200, 409]);
    const winner = [one, two][responses.findIndex(r => r.status === 200)];
    await request(`/bookings/employer/applications/${winner.id}`, employer, "PATCH", { status: "approved" });
    const approved = (await database.query<any>("SELECT id FROM shift_applications WHERE shift_id = $1 AND status = 'approved'", [target.id])).rows;
    expect(approved).toHaveLength(1);
    await request(`/bookings/employer/${target.id}/cancel`, employer, "PATCH", {}, 204);
  });
  it("lists and marks notifications without granting cross-user access", async () => {
    const item = (await request("/notifications", employer)).notifications[0];
    expect(item).toBeDefined();
    await request(`/notifications/${item.id}/read`, otherEmployer, "PATCH", {}, 404);
    await request(`/notifications/${item.id}/read`, employer, "PATCH", {}, 204);
    await request("/notifications/read-all", employer, "POST", {}, 204);
    expect((await request("/notifications", employer)).notifications.every((n: any) => n.is_read)).toBe(true);
  });
  it("validates push registration and removes device tokens", async () => {
    const device = { token: "ExpoPushToken[isolated-fake-token]", app: "caregiver", platform: "ios" };
    await request("/notifications/device", employer, "POST", device, 403);
    await request("/notifications/device", caregiver, "POST", { ...device, token: "bad" }, 400);
    await request("/notifications/device", caregiver, "POST", device, 204);
    await request("/notifications/device", caregiver, "DELETE", { token: device.token }, 204);
    expect((await database.query("SELECT * FROM push_tokens")).rows).toEqual([]);
  });
  it("restricts background checks to team members and records manual pending status", async () => {
    await request("/employers/background-checks", otherEmployer, "POST", { caregiverUserId: caregiver.user.id }, 403);
    const check = await request("/employers/background-checks", employer, "POST", { caregiverUserId: caregiver.user.id }, 201);
    expect(check).toMatchObject({ status: "pending", provider: "manual" });
    expect(outbound.post.mock.calls.some(([url]) => url.includes("checkr"))).toBe(false);
  });
  it("returns payroll overview without charging money", async () => {
    expect((await request("/payroll/employer/overview", employer)).recentPayments).toEqual([]);
  });
  it("prevents invoicing another employer's booking or unfinished work", async () => {
    const bookings = (await database.query<any>("SELECT * FROM bookings ORDER BY id")).rows;
    const completed = bookings.find((b: any) => b.status === "completed");
    const cancelled = bookings.find((b: any) => b.status === "cancelled");
    await request("/payroll/generate-invoice", otherEmployer, "POST", { bookingId: completed.id }, 404);
    await request("/payroll/generate-invoice", caregiver, "POST", { bookingId: completed.id }, 403);
    await request("/payroll/generate-invoice", employer, "POST", { bookingId: cancelled.id }, 409);
    const invoice = (await request("/payroll/generate-invoice", employer, "POST", { bookingId: completed.id }, 201)).payment;
    expect(Number(invoice.amount)).toBe(60);
    expect((await request("/payroll/generate-invoice", employer, "POST", { bookingId: completed.id })).payment.id).toBe(invoice.id);
    await request(`/payroll/${invoice.id}/process`, otherEmployer, "POST", {}, 404);
    await request(`/payroll/${invoice.id}/process`, employer, "POST", {}, 501);
    expect((await database.query<any>("SELECT status FROM payments WHERE id = $1", [invoice.id])).rows[0].status).toBe("pending");
  });
  it("uses one-time password resets and rejects the old password", async () => {
    await request("/auth/forgot-password", undefined, "POST", { email: caregiver.user.email });
    const mail = outbound.post.mock.calls.findLast(([, body]) => body.subject === "Reset your Elite Bridge password")![1];
    const token = new URL(mail.text.match(/https:\/\/\S+/)[0]).searchParams.get("token");
    await request("/auth/reset-password", undefined, "POST", { token, password: "Updated-test-Password-1234" });
    await request("/auth/reset-password", undefined, "POST", { token, password }, 400);
    await request("/auth/login", undefined, "POST", { email: caregiver.user.email, password }, 401);
    await request("/auth/login", undefined, "POST", { email: caregiver.user.email, password: "Updated-test-Password-1234" });
  });
  it("reports failed email delivery without breaking account creation", async () => {
    outbound.post.mockRejectedValueOnce(new Error("Provider unavailable")).mockRejectedValueOnce(new Error("Provider unavailable"));
    const account = await signup("employer", "mail-outage@example.com");
    expect(account.emailNotifications).toEqual({ officeAlertSent: false, welcomeSent: false });
    await request("/auth/login", undefined, "POST", { email: account.user.email, password });
    await request("/auth/account", account, "DELETE", undefined, 204);
  });
  it("routes staffing alerts to the office address", () => {
    const alerts = outbound.post.mock.calls.filter(([, body]) => body.subject?.startsWith("Elite Bridge:"));
    for (const event of ["New shift posted", "New shift application", "Shift application approved", "Shift claimed", "Shift cancelled", "Urgent shift call-out", "Timesheet ready"]) {
      expect(alerts.some(([, body]) => body.subject === `Elite Bridge: ${event}` && body.to[0] === "info@elitebridgestaffing.com")).toBe(true);
    }
  });
  it("deletes test accounts and dependent records", async () => {
    for (const account of [caregiver, replacement, employer, otherEmployer]) await request("/auth/account", account, "DELETE", undefined, 204);
    for (const table of ["users", "employer_caregivers", "caregiver_invitations", "shift_posts", "shift_timesheets", "messages"]) {
      expect((await database.query(`SELECT * FROM ${table}`)).rows, table).toEqual([]);
    }
  });
});
