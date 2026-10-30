import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import express from "express";
import type { Server } from "node:http";
import * as schema from "../src/db/schema";

// Disposable database and intercepted providers; never send to real people.
const outbound = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("axios", () => ({ default: { post: outbound.post } }));
const database = new PGlite();
const db = drizzle(database, { schema });
vi.doMock("../src/db/index", () => ({ db, checkDatabaseConnection: async () => true }));
let server: Server;
let base: string;
let owner: any, other: any, staff: any, otherStaff: any;
const members: Record<string, any> = {};
const password = "Isolated-readiness-password-9284";
async function request(path: string, account?: any, method = "GET", body?: unknown, status = 200) {
  const response = await fetch(`${base}/api${path}`, {
    method, headers: { "Content-Type": "application/json", ...(account ? { Authorization: `Bearer ${account.token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  expect(response.status, `${method} ${path}: ${text}`).toBe(status);
  return text ? JSON.parse(text) : null;
}
const signup = (email: string, extra = {}) => request("/auth/register", undefined, "POST", {
  email, password, firstName: "Isolated", lastName: "QA", role: "employer", companyName: email, ...extra,
}, 201);

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://unused:unused@localhost/isolated_test");
  vi.stubEnv("JWT_SECRET", "isolated-readiness-secret-at-least-32-characters");
  vi.stubEnv("RESEND_API_KEY", "intercepted-test-key");
  vi.stubEnv("RESEND_FROM", "QA <qa@example.com>");
  outbound.post.mockResolvedValue({ data: { id: "intercepted", data: [{ status: "ok", id: "test-ticket" }] } });
  await (await import("../src/db/bootstrap")).ensureCoreTables();
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use("/api", (await import("../src/middleware/organizationAuthorization")).organizationAuthorization);
  for (const [prefix, file] of [
    ["auth", "auth"], ["employers", "employers"], ["caregivers", "caregivers"],
    ["bookings", "bookings"], ["clients", "clients"], ["notifications", "notifications"],
    ["payroll", "payroll"], ["contract-documents", "contractDocuments"],
    ["messages", "messages"], ["team-messages", "teamMessages"],
  ]) app.use(`/api/${prefix}`, (await import(`../src/routes/${file}.ts`)).default);
  app.use((await import("../src/middleware/errorHandler")).errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
  owner = await signup("organization-a@example.com");
  other = await signup("organization-b@example.com");
  for (const role of ["admin", "scheduler", "billing", "viewer"]) {
    const email = `${role}@example.com`;
    const invite = await request("/employers/team/invitations", owner, "POST", { email, role }, 201);
    members[role] = await signup(email, { organizationInviteToken: new URL(invite.invitationUrl).searchParams.get("teamInvite") });
  }
  async function addStaff(account: any, email: string) {
    const invite = await request("/employers/invitations", account, "POST", { firstName: "QA", email }, 201);
    return signup(email, { role: "caregiver", inviteToken: new URL(invite.inviteUrl).searchParams.get("invite") });
  }
  staff = await addStaff(owner, "staff-a@example.com");
  otherStaff = await addStaff(other, "staff-b@example.com");
  await request(`/caregivers/${staff.user.id}`, staff, "PUT", { hourlyRate: 30, specialties: ["personal_care"], certifications: ["caregiver"] });
  await request("/bookings/employer/my", owner); // Initialize shift tables as production does.
}, 60000);
afterAll(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
  await database.close(); vi.unstubAllEnvs();
});

describe.sequential("Organization readiness with production authorization", () => {
  it("joins invited managers to the existing organization with the selected role", async () => {
    for (const [role, account] of Object.entries(members)) {
      const profile = (await request("/employers/me", account)).profile;
      expect(profile.companyName).toBe("organization-a@example.com");
      expect(profile.organizationRole).toBe(role);
      expect((await request("/bookings/employer/team", account)).team.map((s: any) => s.user_id)).toEqual([staff.user.id]);
    }
    expect((await request("/bookings/employer/team", other)).team.map((s: any) => s.user_id)).toEqual([otherStaff.user.id]);
  });

  it("scopes the legacy caregiver directory and private profiles to the organization", async () => {
    expect((await request("/caregivers", owner)).caregivers.map((s: any) => s.userId)).toEqual([staff.user.id]);
    expect((await request("/caregivers", other)).caregivers.map((s: any) => s.userId)).toEqual([otherStaff.user.id]);
    expect((await request("/caregivers", staff)).caregivers.map((s: any) => s.userId)).toEqual([staff.user.id]);
    await request(`/caregivers/${staff.user.id}`, owner);
    await request(`/caregivers/${staff.user.id}`, other, "GET", undefined, 404);
    await request(`/caregivers/${staff.user.id}`, otherStaff, "GET", undefined, 404);
  });

  it("isolates client records and private contract PDFs", async () => {
    await request("/clients/employer", owner, "POST", { clientName: "QA client", locationName: "QA site", city: "Lowell", state: "MA", billingRate: 40, caregiverRate: 30 }, 201);
    expect((await request("/clients/employer", other)).clients).toEqual([]);
    expect((await request("/clients/employer", members.scheduler)).clients).toHaveLength(1);
    const pdfBase64 = Buffer.from("%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF\n").toString("base64");
    const { document } = await request("/contract-documents/employer", owner, "POST", { clientName: "QA", title: "QA", category: "contract", pdfBase64 }, 201);
    await request(`/contract-documents/employer/${document.id}`, other, "GET", undefined, 404);
    expect((await request("/contract-documents/employer", other)).documents).toEqual([]);
    await request(`/contract-documents/employer/${document.id}`, members.viewer, "GET", undefined, 403);
  });

  it("denies restricted finance reads regardless of URL letter case", async () => {
    for (const account of [members.scheduler, members.viewer]) {
      for (const path of ["/payroll/employer/overview", "/PAYROLL/employer/overview", "/bookings/employer/timesheets", "/BOOKINGS/employer/TimeSheets", "/CONTRACT-DOCUMENTS/employer"]) {
        await request(path, account, "GET", undefined, 403);
      }
    }
    await request("/payroll/employer/overview", members.billing);
  });

  it("allows only the owner to grant admin access and rejects cross-organization changes", async () => {
    const team = (await request("/employers/team", owner)).members;
    const target = team.find((m: any) => m.user_id === members.viewer.user.id);
    await request(`/employers/team/${target.id}`, members.admin, "PATCH", { role: "admin" }, 403);
    await request(`/employers/team/${target.id}`, other, "PATCH", { role: "admin" }, 404);
    await request(`/employers/team/${target.id}`, owner, "PATCH", { role: "admin" });
    await request(`/employers/team/${target.id}`, owner, "PATCH", { role: "viewer" });
    await request("/employers/me", members.scheduler, "PUT", { companyName: "Unauthorized" }, 403);
    await request("/employers/team/invitations", members.viewer, "POST", { email: "blocked@example.com", role: "admin" }, 403);
  });

  it("lets every organization role manage only its own notifications and push device", async () => {
    for (const [role, account] of Object.entries(members)) {
      const token = `ExpoPushToken[isolated-${role}]`;
      await request("/notifications/device", account, "POST", { token, platform: "ios", app: "employer" }, 204);
      await request("/notifications/preferences", account, "PUT", { emailShiftAlerts: false });
      expect((await request("/notifications/preferences", account)).emailShiftAlerts).toBe(false);
      const result = await database.query("INSERT INTO notifications(user_id,type,title,message) VALUES ($1,'qa','QA','QA') RETURNING id", [account.user.id]);
      await request(`/notifications/${(result.rows[0] as any).id}/read`, other, "PATCH", {}, 404);
      await request(`/notifications/${(result.rows[0] as any).id}/read`, account, "PATCH", {}, 204);
      await request("/notifications/device", account, "DELETE", { token }, 204);
    }
  });

  it("restricts legacy message sending to related team members", async () => {
    await request("/messages", owner, "POST", { recipientId: otherStaff.user.id, content: "Blocked QA" }, 404);
    await request("/messages", staff, "POST", { recipientId: other.user.id, content: "Blocked QA" }, 404);
    await request("/messages", members.scheduler, "POST", { recipientId: staff.user.id, content: "QA schedule" }, 201);
    expect((await request(`/messages/${members.scheduler.user.id}`, staff)).messages).toHaveLength(1);
    await request(`/team-messages/${members.scheduler.user.id}`, staff, "POST", { content: "QA reply" }, 201);
    expect((await request("/team-messages/contacts", staff)).contacts.map((c: any) => c.id)).toContain(members.scheduler.user.id);
  });

  it("completes scheduling, staff timekeeping, billing approval and an isolated payroll export", async () => {
    const input = { title: "ISOLATED READINESS SHIFT", serviceType: "personal_care", caregiverType: "caregiver", startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), startTime: "09:00", endTime: "13:00", location: { type: "facility", address: "Test only", city: "Lowell", state: "MA", zipCode: "01852" }, pay: { hourlyRate: 30 }, responsibilities: "QA only", contact: { name: "QA", phone: "2025550147" }, assignmentMode: "review" };
    await request("/bookings", members.viewer, "POST", input, 403);
    await request("/bookings", members.billing, "POST", input, 403);
    const { shift } = await request("/bookings", members.scheduler, "POST", input, 201);
    expect((await request("/bookings/available", staff)).shifts).toEqual((await request("/bookings/open", staff)).shifts);
    const { application } = await request(`/bookings/${shift.id}/apply`, staff, "POST", {}, 201);
    await request(`/bookings/employer/applications/${application.id}`, other, "PATCH", { status: "approved" }, 404);
    await request(`/bookings/employer/applications/${application.id}`, members.scheduler, "PATCH", { status: "approved" });
    await request(`/bookings/${shift.id}/clock-in`, staff, "POST", {});
    await database.query("UPDATE shift_activities SET timestamp=CURRENT_TIMESTAMP-INTERVAL '2 hours' WHERE shift_id=$1 AND type='clock_in'", [shift.id]);
    const clocked = await request(`/bookings/${shift.id}/clock-out`, staff, "POST", {});
    expect(clocked.timesheet.worked_minutes).toBe(120);
    const sheet = (await request("/bookings/employer/timesheets", members.billing)).timesheets[0];
    await request(`/bookings/employer/timesheets/${sheet.id}`, members.scheduler, "PATCH", { status: "approved" }, 403);
    await request(`/bookings/employer/timesheets/${sheet.id}`, other, "PATCH", { status: "approved" }, 404);
    await request(`/bookings/employer/timesheets/${sheet.id}`, members.billing, "PATCH", { status: "approved" });
    const day = new Date(sheet.clock_in_at).toISOString().slice(0, 10);
    const exported = await fetch(`${base}/api/payroll/export?from=${day}&to=${day}`, { headers: { Authorization: `Bearer ${members.billing.token}` } });
    expect(exported.status).toBe(200);
    expect(await exported.text()).toContain('"approved"');
    expect((await request("/bookings/employer/timesheets", other)).timesheets).toEqual([]);
  });

  it("revokes organization access for an existing signed-in manager", async () => {
    const team = (await request("/employers/team", owner)).members;
    const target = team.find((m: any) => m.user_id === members.viewer.user.id);
    await request(`/employers/team/${target.id}`, owner, "DELETE");
    await request("/bookings/employer/my", members.viewer, "GET", undefined, 403);
  });
});
