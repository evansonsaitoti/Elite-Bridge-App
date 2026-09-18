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
  await database.exec("SET TIME ZONE 'UTC'");
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
  for (const route of ["auth", "employers", "caregivers", "bookings", "messages", "notifications", "payroll", "operations", "sms"]) {
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
    await request("/bookings", employer, "POST", shift("review", { endTime: "09:00" }), 400);
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
  it("supports overnight local schedules and rejects invalid calendar/DST times", async () => {
    const overnight = (await request("/bookings", employer, "POST", shift("instant", { startDate: "2026-12-10", startTime: "22:00", endTime: "06:00", timeZone: "America/New_York" }), 201)).shift;
    expect(overnight.startTime).toBe("2026-12-11T03:00:00.000Z");
    expect(overnight.endTime).toBe("2026-12-11T11:00:00.000Z");
    const fall = (await request("/bookings", employer, "POST", shift("instant", { startDate: "2026-10-31", startTime: "22:00", endTime: "06:00", timeZone: "America/New_York" }), 201)).shift;
    expect((Date.parse(fall.endTime) - Date.parse(fall.startTime)) / 3600000).toBe(9);
    const spring = (await request("/bookings", employer, "POST", shift("instant", { startDate: "2026-03-07", startTime: "22:00", endTime: "06:00", timeZone: "America/New_York" }), 201)).shift;
    expect((Date.parse(spring.endTime) - Date.parse(spring.startTime)) / 3600000).toBe(7);
    for (const extra of [{ startDate: "2026-02-30" }, { startTime: "25:00" }, { timeZone: "Invalid/Zone" }, { startDate: "2026-03-08", startTime: "02:30", timeZone: "America/New_York" }, { startDate: "2026-11-01", startTime: "01:30", timeZone: "America/New_York" }]) {
      await request("/bookings", employer, "POST", shift("instant", extra), 400);
    }
  });
  it("keeps a multi-caregiver shift open until all positions are claimed", async () => {
    const target = (await request("/bookings", employer, "POST", shift("instant", { numberOfCaregivers: 2 }), 201)).shift;
    await request(`/bookings/${target.id}/claim`, caregiver, "POST", {});
    await request(`/bookings/${target.id}/claim`, caregiver, "POST", {}, 409);
    await request(`/bookings/${target.id}/apply`, caregiver, "POST", {}, 409);
    const partial = (await request("/bookings/open", replacement)).shifts.find((s: any) => s.id === target.id);
    expect(partial).toMatchObject({ assignedCaregivers: 1, remainingPositions: 1, status: "open" });
    await request(`/bookings/${target.id}/claim`, replacement, "POST", {});
    expect((await request("/bookings/employer/my", employer)).shifts.find((s: any) => s.id === target.id)).toMatchObject({ assignedCaregivers: 2, remainingPositions: 0, status: "assigned" });
    await request(`/bookings/${target.id}/clock-in`, caregiver, "POST", { location: { latitude: 999 } }, 400);
    const location = { latitude: 42.6334, longitude: -71.3162, accuracy: 12, capturedAt: new Date().toISOString() };
    const attempts = await Promise.all([1, 2].map(() => fetch(`${base}/api/bookings/${target.id}/clock-in`, { method: "POST", headers: { Authorization: `Bearer ${caregiver.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ location }) })));
    expect(attempts.map(r => r.status).sort()).toEqual([200, 409]);
    await request(`/bookings/${target.id}/clock-in`, replacement, "POST", {});
    expect((await request("/bookings/activities", employer)).activeCount).toBe(2);
    await request(`/bookings/${target.id}/callout`, caregiver, "POST", { reason: "other" }, 409);
    await request(`/bookings/${target.id}/break`, caregiver, "POST", { action: "start" });
    await request(`/bookings/${target.id}/break`, caregiver, "POST", { action: "start" }, 409);
    expect((await request("/bookings/activities", employer)).activeCount).toBe(2);
    await request(`/bookings/${target.id}/clock-out`, caregiver, "POST", {}, 409);
    await request(`/bookings/${target.id}/break`, caregiver, "POST", { action: "end" });
    const records = await request("/bookings/caregiver/timekeeping", caregiver);
    expect(records.activities.find((a: any) => a.shift_id === target.id && a.type === "clock_in").location).toEqual(location);
    expect((await request("/bookings/caregiver/timekeeping", replacement)).activities.filter((a: any) => a.shift_id === target.id)).toHaveLength(1);
    await database.query("UPDATE shift_activities SET timestamp = CURRENT_TIMESTAMP - INTERVAL '8 hours' WHERE shift_id = $1 AND type = 'clock_in'", [target.id]);
    const completed = await request(`/bookings/${target.id}/clock-out`, caregiver, "POST", { notes: "Overnight handover completed" });
    expect(completed.timesheet.worked_minutes).toBe(480);
    expect((await request("/bookings/employer/my", employer)).shifts.find((s: any) => s.id === target.id).status).toBe("in_progress");
    expect((await request("/bookings/activities", employer)).activeCount).toBe(1);
    await request(`/bookings/${target.id}/clock-in`, caregiver, "POST", {}, 409);
    const sheetId = completed.timesheet.id;
    await request(`/bookings/employer/timesheets/${sheetId}`, otherEmployer, "PATCH", { status: "approved" }, 404);
    await request(`/bookings/employer/timesheets/${sheetId}`, employer, "PATCH", { status: "correction_requested" }, 400);
    await request(`/bookings/employer/timesheets/${sheetId}`, employer, "PATCH", { status: "correction_requested", note: "Confirm handover time" });
    await request(`/bookings/caregiver/timesheets/${sheetId}/resubmit`, replacement, "POST", { notes: "Wrong user" }, 404);
    await request(`/bookings/caregiver/timesheets/${sheetId}/resubmit`, caregiver, "POST", { notes: "Handover finished before clock-out" });
    await request(`/bookings/employer/timesheets/${sheetId}`, employer, "PATCH", { status: "approved" });
    const approved = (await request("/bookings/caregiver/timekeeping", caregiver)).timesheets.find((t: any) => t.id === sheetId);
    expect(approved.status).toBe("approved");
    expect(approved.worked_minutes).toBe(480);
    expect((await database.query("SELECT * FROM timesheet_reviews WHERE timesheet_id = $1", [sheetId])).rows).toHaveLength(3);
    const outAttempts = await Promise.all([1, 2].map(() => fetch(`${base}/api/bookings/${target.id}/clock-out`, { method: "POST", headers: { Authorization: `Bearer ${replacement.token}`, "Content-Type": "application/json" }, body: "{}" })));
    expect(outAttempts.map(r => r.status).sort()).toEqual([200, 403]);
    expect((await request("/bookings/employer/my", employer)).shifts.find((s: any) => s.id === target.id).status).toBe("completed");
    expect((await request("/bookings/activities", employer)).activeCount).toBe(0);
  });
  it("keeps remaining review positions available and blocks overlapping assignments", async () => {
    const target = (await request("/bookings", employer, "POST", shift("review", { numberOfCaregivers: 2 }), 201)).shift;
    const one = (await request(`/bookings/${target.id}/apply`, caregiver, "POST", {}, 201)).application;
    const two = (await request(`/bookings/${target.id}/apply`, replacement, "POST", {}, 201)).application;
    await request(`/bookings/employer/applications/${one.id}`, employer, "PATCH", { status: "approved" });
    expect((await request("/bookings/employer/applications", employer)).applications.find((a: any) => a.id === two.id).status).toBe("pending");
    const conflict = (await request("/bookings", employer, "POST", shift("instant"), 201)).shift;
    await request(`/bookings/${conflict.id}/claim`, caregiver, "POST", {}, 409);
    await request(`/bookings/employer/applications/${two.id}`, employer, "PATCH", { status: "approved" });
    await request(`/bookings/${target.id}/callout`, caregiver, "POST", { reason: "other" }, 201);
    expect((await request("/bookings/employer/my", employer)).shifts.find((s: any) => s.id === target.id)).toMatchObject({ assignedCaregivers: 1, remainingPositions: 1 });
    await request(`/bookings/employer/${target.id}/cancel`, employer, "PATCH", {}, 204);
  });
  it("enforces location checks and tenant boundaries, and persists incident review history", async () => {
    await request("/operations/incidents", undefined, "GET", undefined, 401);
    const target = (await request("/bookings", employer, "POST", shift("instant", {startDate:"2027-03-12"}), 201)).shift;
    const fence = {latitude:42.6334,longitude:-71.3162,radiusMeters:150};
    await request(`/operations/shifts/${target.id}/geofence`, otherEmployer,"PUT",fence,409);
    await request(`/operations/shifts/${target.id}/geofence`, caregiver,"PUT",fence,403);
    await request(`/operations/shifts/${target.id}/geofence`, employer,"PUT",fence);
    await request(`/bookings/${target.id}/claim`,caregiver,"POST",{});
    await request(`/bookings/${target.id}/clock-in`,caregiver,"POST",{},422);
    await request(`/bookings/${target.id}/clock-in`,caregiver,"POST",{location:{latitude:0,longitude:0,accuracy:5,capturedAt:new Date().toISOString()}},422);
    await request(`/bookings/${target.id}/clock-in`,caregiver,"POST",{location:{latitude:fence.latitude,longitude:fence.longitude,accuracy:5,capturedAt:new Date(Date.now()-300000).toISOString()}},422);
    await request(`/bookings/${target.id}/clock-in`,caregiver,"POST",{location:{latitude:fence.latitude,longitude:fence.longitude,accuracy:5,capturedAt:new Date().toISOString()}});
    await request(`/operations/shifts/${target.id}/geofence`,employer,"PUT",fence,409);
    await request(`/bookings/${target.id}/clock-out`,caregiver,"POST",{});
    const report={shiftId:target.id,category:"safety",severity:"high",description:"ISOLATED TEST incident narrative",occurredAt:new Date().toISOString()};
    await request("/operations/incidents",replacement,"POST",report,404);
    const created=await request("/operations/incidents",caregiver,"POST",report,201);
    expect(created.employerEmailSent).toBe(true);
    expect((await request("/operations/incidents",otherEmployer)).incidents).toEqual([]);
    expect((await request("/operations/incidents",replacement)).incidents).toEqual([]);
    await request(`/operations/incidents/${created.incident.id}`,otherEmployer,"PATCH",{status:"resolved",note:"Not authorized"},404);
    await request(`/operations/incidents/${created.incident.id}`,caregiver,"PATCH",{status:"resolved",note:"Not authorized"},403);
    await request(`/operations/incidents/${created.incident.id}`,employer,"PATCH",{status:"investigating",note:"Review started"});
    await request(`/operations/incidents/${created.incident.id}`,employer,"PATCH",{status:"resolved",note:"Verified corrective action"});
    const result=(await request("/operations/incidents",caregiver)).incidents[0];
    expect(result.status).toBe("resolved");
    expect(result.updates.map((r:any)=>r.note)).toEqual(["Review started","Verified corrective action"]);
    const sent=outbound.post.mock.calls.filter(([,body])=>body?.subject?.includes("Incident"));
    expect(JSON.stringify(sent)).not.toContain(report.description);
  });
  it("exports only this employer's approved actual hours and reports provider activation truthfully", async () => {
    const records=(await request("/bookings/employer/timesheets",employer)).timesheets;
    const pending=records.find((r:any)=>r.status==="pending_approval");
    await request(`/bookings/employer/timesheets/${pending.id}`,employer,"PATCH",{status:"approved"});
    const day=new Date().toISOString().slice(0,10);
    const exportFor=async(account:any)=>fetch(`${base}/api/payroll/export?from=${day}&to=${day}`,{headers:{Authorization:`Bearer ${account.token}`}});
    const response=await exportFor(employer);
    expect(response.status).toBe(200);
    const csv=await response.text();
    expect(csv).toContain('"approved"');
    expect(csv).not.toContain('pending_approval');
    expect(csv).not.toContain('correction_requested');
    expect((await (await exportFor(otherEmployer)).text()).trim().split("\r\n")).toHaveLength(1);
    await request("/payroll/export?from=2026-02-31&to=2026-03-01",employer,"GET",undefined,400);
    await request("/payroll/export?from=2026-01-01&to=2026-12-01",employer,"GET",undefined,400);
    expect((await request("/payroll/integrations",employer)).integrations.every((p:any)=>p.status==="requires_provider_setup")).toBe(true);
  });
  it("keeps SMS off without configuration and rejects unsigned provider callbacks", async () => {
    expect((await request("/sms/preferences",caregiver)).configured).toBe(false);
    await request("/sms/verify/start",caregiver,"POST",{phone:"+12025550147"},503);
    await request("/sms/status",undefined,"POST",{MessageSid:"forged",MessageStatus:"delivered"},403);
    await request("/sms/inbound",undefined,"POST",{From:"+12025550147",Body:"STOP"},403);
    await request("/sms/preferences",caregiver,"DELETE",undefined,204);
  });
  it("verifies SMS ownership, records consent, deduplicates shift alerts and honors signed STOP callbacks", async () => {
    const { config }=await import("../src/config/env");
    const { sendShiftSms }=await import("../src/services/sms");
    const { getExpectedTwilioSignature }=await import("twilio");
    const old={sid:config.TWILIO_ACCOUNT_SID,token:config.TWILIO_AUTH_TOKEN,phone:config.TWILIO_PHONE_NUMBER};
    config.TWILIO_ACCOUNT_SID="ACisolated";
    config.TWILIO_AUTH_TOKEN="isolated-provider-token";
    config.TWILIO_PHONE_NUMBER="+12025550100";
    vi.stubEnv("SMS_ENABLED","true");
    vi.stubEnv("SMS_WEBHOOK_BASE_URL","https://isolated.example");
    outbound.post.mockResolvedValue({data:{sid:"SMisolated",status:"queued"}});
    try {
      await request("/sms/verify/start",caregiver,"POST",{phone:"+12025550147"});
      await request("/sms/verify/start",caregiver,"POST",{phone:"+12025550147"},429);
      const call=outbound.post.mock.calls.filter(([url])=>url.includes("api.twilio.com")).at(-1)!;
      const text=new URLSearchParams(call[1]).get("Body")!;
      const code=text.match(/code: (\d{6})/)![1];
      await request("/sms/verify/complete",caregiver,"POST",{code:"000000",consent:true},400);
      await request("/sms/verify/complete",caregiver,"POST",{code,consent:false},400);
      await request("/sms/verify/complete",caregiver,"POST",{code,consent:true});
      expect((await request("/sms/preferences",caregiver)).preference).toMatchObject({verified:true,opted_in:true});
      await sendShiftSms([caregiver.user.id],999);
      await sendShiftSms([caregiver.user.id],999);
      expect((await request("/sms/preferences",caregiver)).deliveries).toHaveLength(1);
      const callback=async(path:string,body:any)=>{
        const response=await fetch(base+"/api/sms"+path,{method:"POST",headers:{"Content-Type":"application/json","x-twilio-signature":getExpectedTwilioSignature(config.TWILIO_AUTH_TOKEN!,"https://isolated.example/api/sms"+path,body)},body:JSON.stringify(body)});
        expect(response.status).toBe(path==="/status"?204:200);
      };
      await callback("/status",{MessageSid:"SMisolated",MessageStatus:"delivered"});
      await callback("/status",{MessageSid:"SMisolated",MessageStatus:"sent"});
      expect((await request("/sms/preferences",caregiver)).deliveries[0].status).toBe("delivered");
      await callback("/inbound",{From:"+12025550147",Body:"STOP"});
      expect((await request("/sms/preferences",caregiver)).preference.opted_in).toBe(false);
      await sendShiftSms([caregiver.user.id],1000);
      expect((await request("/sms/preferences",caregiver)).deliveries).toHaveLength(1);
    } finally {
      config.TWILIO_ACCOUNT_SID=old.sid;config.TWILIO_AUTH_TOKEN=old.token;config.TWILIO_PHONE_NUMBER=old.phone;
      vi.stubEnv("SMS_ENABLED","false");
      outbound.post.mockResolvedValue({data:{id:"intercepted-email-id"}});
    }
  });
  it("deletes test accounts and dependent records", async () => {
    for (const account of [caregiver, replacement, employer, otherEmployer]) await request("/auth/account", account, "DELETE", undefined, 204);
    for (const table of ["users", "employer_caregivers", "caregiver_invitations", "shift_posts", "shift_timesheets", "messages"]) {
      expect((await database.query(`SELECT * FROM ${table}`)).rows, table).toEqual([]);
    }
  });
});
