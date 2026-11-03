import { sql } from 'drizzle-orm';
import { db } from '../db';
import { sendPushToUsers } from './notifications';

export async function ensureShiftFollowup() {
  await db.execute(sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS coverage_alerts (
    shift_id INTEGER NOT NULL,start_time TIMESTAMP NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(shift_id,start_time))`);
}

export async function runCoverageAlerts(employerIds:number[],enabledAt:Date,now=new Date()) {
  if(!employerIds.length)return 0;
  await ensureShiftFollowup();
  // One warning per shift start, only within two hours before an uncovered shift.
  const rows=(await db.execute(sql`SELECT sp.id,sp.start_time,e.user_id FROM shift_posts sp JOIN employers e ON e.id=sp.employer_id
    WHERE sp.employer_id IN (${sql.join(employerIds.map(id=>sql`${id}`),sql`,`)})
    AND sp.status IN ('open','assigned') AND sp.start_time>${now} AND sp.start_time>=${enabledAt}
    AND sp.start_time<=${now}::timestamp+INTERVAL '2 hours'
    AND (SELECT COUNT(*) FROM shift_applications a WHERE a.shift_id=sp.id AND a.status='approved')<sp.number_of_caregivers
    AND NOT EXISTS(SELECT 1 FROM coverage_alerts c WHERE c.shift_id=sp.id AND c.start_time=sp.start_time) LIMIT 100`) as any).rows;
  let attempted=0;
  for(const row of rows) {
    const claimed=await db.transaction(async tx=>{
      const shift=(await tx.execute(sql`SELECT * FROM shift_posts WHERE id=${row.id} FOR UPDATE`) as any).rows[0];
      if(!['open','assigned'].includes(shift.status)||new Date(shift.start_time).getTime()!==new Date(row.start_time).getTime())return false;
      const count=(await tx.execute(sql`SELECT COUNT(*)::int n FROM shift_applications WHERE shift_id=${row.id} AND status='approved'`) as any).rows[0].n;
      if(count>=shift.number_of_caregivers)return false;
      const added=(await tx.execute(sql`INSERT INTO coverage_alerts(shift_id,start_time) VALUES(${row.id},${row.start_time}) ON CONFLICT DO NOTHING RETURNING shift_id`) as any).rows[0];
      if(!added)return false;
      await tx.execute(sql`INSERT INTO notifications(user_id,type,title,message,related_id) VALUES(${row.user_id},'coverage_warning','Shift needs coverage','A shift starts within two hours and still has unfilled positions. Review the schedule.',${row.id})`);
      return true;
    });
    if(claimed){await sendPushToUsers([row.user_id],{title:'Shift needs coverage',body:'A shift starts within two hours and still has unfilled positions.',data:{type:'coverage_warning',shiftId:row.id}});attempted++;}
  }
  return attempted;
}
