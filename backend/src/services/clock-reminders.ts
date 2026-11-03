import { sql } from 'drizzle-orm';
import { db } from '../db';
import { sendPushToUsers } from './notifications';

export async function ensureClockReminders() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS clock_reminder_runs(employer_id INTEGER PRIMARY KEY,last_run_at TIMESTAMP NOT NULL,attempted INTEGER NOT NULL)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS clock_reminder_deliveries (
    id SERIAL PRIMARY KEY, application_id INTEGER NOT NULL, start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL, kind TEXT NOT NULL, user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'attempting', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(application_id,start_time,end_time,kind,user_id))`);
}
export const reminderMessages = {
  starting: ['Shift starts soon', 'Your shift starts in 15 minutes. Open your time clock when you arrive.'],
  late: ['Clock-in reminder', 'Your shift has started. Please clock in, or contact your agency if you cannot attend.'],
  escalation: ['Coverage check needed', 'An assigned caregiver has not clocked in 15 minutes after shift start. Please check coverage.'],
  clock_out: ['Clock-out reminder', 'Still working? Otherwise, please clock out. If you missed a punch, request a correction.'],
} as const;

// Bounded windows prevent a backlog of stale alerts after a scheduler outage.
function dueQuery(employerIds: number[], now: Date, enabledAt: Date) {
  return sql`SELECT a.id application_id,a.caregiver_id,sp.id shift_id,sp.start_time,sp.end_time,
    k.kind,CASE WHEN k.kind='escalation' THEN e.user_id ELSE c.user_id END user_id
    FROM shift_applications a JOIN shift_posts sp ON sp.id=a.shift_id
    JOIN caregivers c ON c.id=a.caregiver_id JOIN users cu ON cu.id=c.user_id
    JOIN employers e ON e.id=sp.employer_id JOIN users eu ON eu.id=e.user_id
    CROSS JOIN (VALUES ('starting'),('late'),('escalation'),('clock_out')) k(kind)
    WHERE sp.employer_id IN (${sql.join(employerIds.map(id=>sql`${id}`),sql`,`)})
    AND a.status='approved' AND cu.is_active=true AND eu.is_active=true
    AND sp.status IN ('open','assigned','in_progress') AND sp.end_time >= ${enabledAt}
    AND NOT EXISTS(SELECT 1 FROM shift_timesheets t WHERE t.shift_id=sp.id AND t.caregiver_id=c.id)
    AND (
      (k.kind='starting' AND ${now}::timestamp >= sp.start_time-INTERVAL '15 minutes' AND ${now}::timestamp < sp.start_time)
      OR (k.kind='late' AND ${now}::timestamp >= sp.start_time+INTERVAL '5 minutes' AND ${now}::timestamp < LEAST(sp.start_time+INTERVAL '15 minutes',sp.end_time))
      OR (k.kind='escalation' AND ${now}::timestamp >= sp.start_time+INTERVAL '15 minutes' AND ${now}::timestamp < sp.end_time)
      OR (k.kind='clock_out' AND ${now}::timestamp >= sp.end_time+INTERVAL '10 minutes' AND ${now}::timestamp < sp.end_time+INTERVAL '24 hours')
    )
    AND ((k.kind<>'clock_out' AND NOT EXISTS(SELECT 1 FROM shift_activities i WHERE i.shift_id=sp.id AND i.caregiver_id=c.id AND i.type='clock_in'))
      OR (k.kind='clock_out' AND EXISTS(SELECT 1 FROM shift_activities i WHERE i.shift_id=sp.id AND i.caregiver_id=c.id AND i.type='clock_in'
        AND NOT EXISTS(SELECT 1 FROM shift_activities o WHERE o.shift_id=i.shift_id AND o.caregiver_id=i.caregiver_id AND o.type='clock_out' AND o.id>i.id))))
    AND NOT EXISTS(SELECT 1 FROM clock_reminder_deliveries d WHERE d.application_id=a.id AND d.start_time=sp.start_time AND d.end_time=sp.end_time
      AND d.kind=k.kind AND d.user_id=CASE WHEN k.kind='escalation' THEN e.user_id ELSE c.user_id END)
    ORDER BY sp.start_time,a.id,k.kind LIMIT 200`;
}
export async function runClockReminders(employerIds: number[], enabledAt: Date, now=new Date()) {
  if (!employerIds.length) return {attempted:0};
  await ensureClockReminders();
  const candidates=(await db.execute(dueQuery(employerIds,now,enabledAt)) as any).rows;
  let attempted=0;
  for(const candidate of candidates) {
    const reminder=await db.transaction(async tx=>{
      // Same lock order as clock-in/out, so a completed punch wins before eligibility is rechecked.
      await tx.execute(sql`SELECT id FROM caregivers WHERE id=${candidate.caregiver_id} FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM shift_posts WHERE id=${candidate.shift_id} FOR UPDATE`);
      const current=(await tx.execute(dueQuery(employerIds,now,enabledAt)) as any).rows.find((r:any)=>r.application_id===candidate.application_id && r.kind===candidate.kind);
      if(!current) return null;
      const claimed=(await tx.execute(sql`INSERT INTO clock_reminder_deliveries(application_id,start_time,end_time,kind,user_id)
        VALUES(${current.application_id},${current.start_time},${current.end_time},${current.kind},${current.user_id}) ON CONFLICT DO NOTHING RETURNING id`) as any).rows[0];
      if(!claimed) return null;
      const [title,body]=reminderMessages[current.kind as keyof typeof reminderMessages];
      const type=current.kind==='escalation'?'attendance_alert':'attendance_reminder';
      await tx.execute(sql`INSERT INTO notifications(user_id,type,title,message,related_id) VALUES(${current.user_id},${type},${title},${body},${current.shift_id})`);
      return {...current,id:claimed.id,title,body,type};
    });
    if(!reminder) continue;
    // Claim before dispatch: never automatically replay an ambiguous provider attempt.
    await sendPushToUsers([reminder.user_id],{title:reminder.title,body:reminder.body,data:{type:reminder.type,shiftId:reminder.shift_id,reminderKind:reminder.kind}});
    await db.execute(sql`UPDATE clock_reminder_deliveries SET status='attempted' WHERE id=${reminder.id}`);
    attempted++;
  }
  for(const id of employerIds) await db.execute(sql`INSERT INTO clock_reminder_runs(employer_id,last_run_at,attempted) VALUES(${id},${now},${attempted}) ON CONFLICT(employer_id) DO UPDATE SET last_run_at=EXCLUDED.last_run_at,attempted=EXCLUDED.attempted`);
  return {attempted};
}
