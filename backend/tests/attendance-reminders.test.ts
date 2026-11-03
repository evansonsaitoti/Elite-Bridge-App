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
  app.use("/api", (await import("../src/middleware/organizationAuthorization")).organizationAuthorization);
  for (const route of ["auth", "employers", "caregivers", "bookings", "messages", "notifications", "payroll", "operations", "sms", "clockReminders"]) {
    app.use(`/api/${route}`, (await import(`../src/routes/${route}.ts`)).default);
  }
  app.use("/api/contract-documents", (await import("../src/routes/contractDocuments")).default);
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

let employerId:number,caregiverId:number;
beforeAll(async()=>{
 employer=await signup('employer','clock-owner@example.com');otherEmployer=await signup('employer','clock-other@example.com');const invite=async(email:string)=>{const i=await request('/employers/invitations',employer,'POST',{firstName:'Test',email},201);return signup('caregiver',email,{inviteToken:new URL(i.inviteUrl).searchParams.get('invite')});}; caregiver=await invite('clock-staff@example.com');replacement=await invite('clock-stranger@example.com');
 employerId=Number((await database.query<any>('SELECT id FROM employers WHERE user_id=$1',[employer.user.id])).rows[0].id);
 caregiverId=Number((await database.query<any>('SELECT id FROM caregivers WHERE user_id=$1',[caregiver.user.id])).rows[0].id);
},60000);
async function fixture(start:Date,end:Date,status='assigned'){
 const {shift:s}=await request('/bookings',employer,'POST',shift(),201);
 await database.query('UPDATE shift_posts SET start_time=$1,end_time=$2,status=$3 WHERE id=$4',[start.toISOString(),end.toISOString(),status,s.id]);
 await database.query("INSERT INTO shift_applications(shift_id,caregiver_id,status,caregiver_pay_rate) VALUES($1,$2,'approved',30)",[s.id,caregiverId]);return s.id as number;
}
const date=(base:Date,minutes:number)=>new Date(base.getTime()+minutes*60000);
async function punch(id:number,type:string,at:Date){await database.query('INSERT INTO shift_activities(shift_id,caregiver_id,type,timestamp) VALUES($1,$2,$3,$4)',[id,caregiverId,type,at.toISOString()]);}
describe.sequential('Attendance reminders and corrections',()=>{
 it('requires scheduler authentication and an explicit organization allowlist',async()=>{
 await request('/clockReminders',undefined,'GET',undefined,401);vi.stubEnv('CRON_SECRET','isolated-cron-secret');expect((await request('/clockReminders',{token:'isolated-cron-secret'})).enabled).toBe(false);
 });
 it('uses the exact reminder windows, deduplicates and stops after punches',async()=>{
 const {runClockReminders}=await import('../src/services/clock-reminders');const start=new Date('2030-01-03T14:00:00Z'),end=date(start,240),id=await fixture(start,end),enabled=date(start,-60);
 for(const [minutes,expected] of [[-16,0],[-15,1],[-14,0],[4,0],[5,1],[6,0],[15,1],[16,0]]) expect((await runClockReminders([employerId],enabled,date(start,minutes))).attempted).toBe(expected);
 expect((await database.query<any>("SELECT user_id FROM notifications WHERE related_id=$1 AND type='attendance_alert'",[id])).rows.map(r=>r.user_id)).toEqual([employer.user.id]);
 await punch(id,'clock_in',date(start,17));expect((await runClockReminders([employerId],enabled,date(end,9))).attempted).toBe(0);expect((await runClockReminders([employerId],enabled,date(end,10))).attempted).toBe(1);await punch(id,'clock_out',date(end,11));expect((await runClockReminders([employerId],enabled,date(end,12))).attempted).toBe(0);
 });
 it('skips canceled, unassigned, clocked-in, out-of-scope and stale work',async()=>{
 const {runClockReminders}=await import('../src/services/clock-reminders');const start=new Date('2030-02-03T14:00:00Z'),end=date(start,240),enabled=date(start,-60);
 await fixture(start,end,'cancelled');const unassigned=await fixture(start,end);await database.query("UPDATE shift_applications SET status='rejected' WHERE shift_id=$1",[unassigned]);const clocked=await fixture(start,end);await punch(clocked,'clock_in',start);
 expect((await runClockReminders([employerId],enabled,date(start,16))).attempted).toBe(0);expect((await runClockReminders([999999],enabled,date(end,11))).attempted).toBe(0);expect((await runClockReminders([employerId],enabled,date(end,1440))).attempted).toBe(0);
 });
 it('preserves original punches until an authorized employer approves once',async()=>{
 await database.exec("UPDATE shift_posts SET status='cancelled'; DELETE FROM shift_activities");const now=new Date(),start=date(now,-180),end=date(now,-60),id=await fixture(start,end);
 const payload={shiftId:id,clockInAt:start.toISOString(),clockOutAt:end.toISOString(),reason:'Forgot to clock in and out'};
 await request('/bookings/caregiver/timesheets/corrections',replacement,'POST',payload,403);await request('/bookings/caregiver/timesheets/corrections',caregiver,'POST',{...payload,clockOutAt:date(now,5).toISOString()},400);
 const {request:r}=await request('/bookings/caregiver/timesheets/corrections',caregiver,'POST',payload,201);await request('/bookings/caregiver/timesheets/corrections',caregiver,'POST',payload,409);
 expect((await database.query('SELECT * FROM shift_timesheets WHERE shift_id=$1',[id])).rows).toHaveLength(0);await request('/bookings/employer/timesheets/corrections/'+r.id,otherEmployer,'PATCH',{decision:'approved',note:'Verified'},404);
 await request('/bookings/employer/timesheets/corrections/'+r.id,employer,'PATCH',{decision:'approved',note:'Confirmed with caregiver'});
 const sheet=(await database.query<any>('SELECT * FROM shift_timesheets WHERE shift_id=$1',[id])).rows[0];expect(sheet.status).toBe('approved');expect(sheet.worked_minutes).toBe(120);expect(Number(sheet.total_amount)).toBe(60);expect((await database.query('SELECT * FROM timesheet_reviews WHERE timesheet_id=$1',[sheet.id])).rows).toHaveLength(1);
 await request('/bookings/employer/timesheets/corrections/'+r.id,employer,'PATCH',{decision:'approved',note:'Verified'},409);await request('/bookings/caregiver/timesheets/corrections',caregiver,'POST',payload,409);
 });
 it('rejects stale approvals without overwriting new evidence',async()=>{
 const now=new Date(),start=date(now,-50),end=date(now,-10),id=await fixture(start,end);await punch(id,'clock_in',start);
 const {request:r}=await request('/bookings/caregiver/timesheets/corrections',caregiver,'POST',{shiftId:id,clockInAt:start.toISOString(),clockOutAt:end.toISOString(),reason:'Missed clock out'},201);await punch(id,'clock_out',end);
 await request('/bookings/employer/timesheets/corrections/'+r.id,employer,'PATCH',{decision:'approved',note:'Verified'},409);await request('/bookings/employer/timesheets/corrections/'+r.id,employer,'PATCH',{decision:'rejected',note:'New punch recorded; please submit updated times'});expect((await database.query('SELECT * FROM shift_timesheets WHERE shift_id=$1',[id])).rows).toHaveLength(0);
 });
 it('warns only for uncovered upcoming shifts and deduplicates warnings',async()=>{
   await database.exec("UPDATE shift_posts SET status='cancelled'");
   const {runCoverageAlerts}=await import('../src/services/shift-followup');
   const now=new Date(),start=date(now,120),id=await fixture(start,date(start,240));
   expect(await runCoverageAlerts([employerId],date(now,-1),now)).toBe(0);
   await database.query("UPDATE shift_applications SET status='rejected' WHERE shift_id=$1",[id]);
   expect(await runCoverageAlerts([otherEmployer.user.id],date(now,-1),now)).toBe(0);
   expect(await runCoverageAlerts([employerId],date(now,-1),date(now,-1))).toBe(0);
   expect(await runCoverageAlerts([employerId],date(now,-1),now)).toBe(1);
   expect(await runCoverageAlerts([employerId],date(now,-1),date(now,1))).toBe(0);
   expect((await database.query<any>("SELECT user_id FROM notifications WHERE related_id=$1 AND type='coverage_warning'",[id])).rows.map(r=>r.user_id)).toEqual([employer.user.id]);
 });
 it('reschedules authorized upcoming work and distinguishes read from acknowledgment',async()=>{
   await database.exec("UPDATE shift_posts SET status='cancelled'");
   const now=new Date(),start=date(now,300),id=await fixture(start,date(start,240));
   const payload={start:date(start,60).toISOString(),end:date(start,300).toISOString()};
   await request('/bookings/employer/'+id+'/schedule',otherEmployer,'PATCH',payload,404);
   await request('/bookings/employer/'+id+'/schedule',employer,'PATCH',payload);
   const alerts=await request('/notifications',caregiver);const notice=alerts.notifications.find((n:any)=>n.related_id===id&&n.type==='shift_update');expect(notice).toBeTruthy();
   await request('/notifications/'+notice.id+'/read',caregiver,'PATCH',undefined,204);
   expect((await request('/notifications',caregiver)).notifications.find((n:any)=>n.id===notice.id).acknowledged_at).toBeNull();
   await request('/notifications/'+notice.id+'/acknowledge',replacement,'PATCH',undefined,404);
   await request('/notifications/'+notice.id+'/acknowledge',caregiver,'PATCH');
   const day={start:date(now,-1).toISOString(),end:date(now,1440).toISOString()};
   const overview=await request('/bookings/employer/daily-overview?'+new URLSearchParams(day),employer);
   expect(overview.shifts.find((s:any)=>s.id===id).caregivers[0].state).toBe('scheduled');
   expect(overview.updates.find((n:any)=>n.id===notice.id).acknowledged_at).toBeTruthy();
   expect(overview.deliveries.find((d:any)=>d.shift_id===id).status).toBe('no_device');
   expect((await request('/bookings/employer/daily-overview?'+new URLSearchParams(day),otherEmployer)).shifts).toHaveLength(0);
   await request('/bookings/employer/'+id+'/schedule',employer,'PATCH',payload,409);
   const conflict=await fixture(date(start,600),date(start,840));
   await request('/bookings/employer/'+id+'/schedule',employer,'PATCH',{start:date(start,650).toISOString(),end:date(start,850).toISOString()},409);
   await request('/bookings/employer/'+id+'/cancel',employer,'PATCH',undefined,204);
   const cancelled=(await request('/notifications',caregiver)).notifications.find((n:any)=>n.related_id===id&&n.type==='shift_cancelled');expect(cancelled).toBeTruthy();
   await request('/notifications/'+cancelled.id+'/acknowledge',caregiver,'PATCH');
 });
 it('records provider rejection and unknown attempts without claiming delivery',async()=>{
   const {sendPushToUsers}=await import('../src/services/notifications');
   await database.query("INSERT INTO push_tokens(user_id,expo_push_token,platform,app) VALUES($1,'ExpoPushToken[isolated-test]','ios','caregiver')",[caregiver.user.id]);
   outbound.post.mockResolvedValueOnce({data:{data:[{status:'error',details:{error:'InvalidCredentials'}}]}});
   await sendPushToUsers([caregiver.user.id],{title:'Test',body:'Test',data:{type:'test'}});
   expect((await database.query<any>('SELECT status FROM push_delivery_attempts ORDER BY id DESC LIMIT 1')).rows[0].status).toBe('rejected');
   outbound.post.mockRejectedValueOnce(new Error('simulated timeout'));
   await sendPushToUsers([caregiver.user.id],{title:'Test',body:'Test',data:{type:'test'}});
   expect((await database.query<any>('SELECT status FROM push_delivery_attempts ORDER BY id DESC LIMIT 1')).rows[0].status).toBe('unknown');
 });
});
