import { randomBytes } from "node:crypto";
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { config } from "../config/env";

let ready: Promise<unknown> | undefined;
function ensureFeeds() {
  return ready ||= db.execute(sql`CREATE TABLE IF NOT EXISTS caregiver_calendar_feeds (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, token TEXT NOT NULL UNIQUE
  )`).catch(error => { ready = undefined; throw error; });
}
export async function calendarLink(userId: number) {
  await ensureFeeds();
  const result = await db.execute(sql`INSERT INTO caregiver_calendar_feeds(user_id,token)
    VALUES (${userId},${randomBytes(32).toString("hex")}) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING token`);
  return new URL("/api/calendar/" + result.rows[0].token + "/subscribe", config.WEB_APP_URL).href;
}
const router = Router();
router.get("/:token/:action",async (req,res,next) => {
  try {
    const {token,action} = req.params;
    if (!/^[a-f0-9]{64}$/.test(token) || !["subscribe","open.ics"].includes(action)) { res.sendStatus(404); return; }
    await ensureFeeds();
    const account = (await db.execute(sql`SELECT u.id FROM caregiver_calendar_feeds f JOIN users u ON u.id=f.user_id
      WHERE f.token=${token} AND u.is_active AND u.role='caregiver'`)).rows[0];
    if (!account) { res.sendStatus(404); return; }
    res.set("Cache-Control","private, no-store").set("Referrer-Policy","no-referrer");
    if (action === "subscribe") {
      const feed = new URL("/api/calendar/"+token+"/open.ics",config.WEB_APP_URL);
      const subscription = feed.href.replace(/^https:/,"webcal:");
      res.type("html").send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Elite Care calendar</title><main style="max-width:420px;margin:12vh auto;padding:20px;font:16px/1.5 Arial;color:#16382c"><h1>Available shifts</h1><p>Subscribe to see upcoming openings in your calendar. Select shifts in Elite Care. Your calendar app controls how often it refreshes.</p><a style="background:#0a4a35;color:white;padding:12px 16px;border-radius:6px" href="'+subscription+'">Subscribe in Calendar</a></main>');
      return;
    }
    const shifts = (await db.execute(sql`SELECT s.id,to_char(s.start_time,'YYYYMMDD"T"HH24MISS"Z"') starts,
      to_char(s.end_time,'YYYYMMDD"T"HH24MISS"Z"') ends,to_char(s.updated_at,'YYYYMMDD"T"HH24MISS"Z"') stamp,s.city,s.state
      FROM shift_posts s JOIN shift_email_deliveries d ON d.shift_id=s.id AND d.user_id=${account.id} JOIN caregivers c ON c.user_id=d.user_id
      WHERE c.is_available AND s.status IN ('open','assigned') AND s.start_time>CURRENT_TIMESTAMP AND
      (EXISTS(SELECT 1 FROM employer_caregivers ec WHERE ec.employer_id=s.employer_id AND ec.caregiver_user_id=c.user_id AND ec.status='active')
      OR EXISTS(SELECT 1 FROM shift_applications sa JOIN shift_posts prior ON prior.id=sa.shift_id WHERE sa.caregiver_id=c.id AND sa.status='approved' AND prior.employer_id=s.employer_id))
      AND (SELECT count(*) FROM shift_applications a WHERE a.shift_id=s.id AND a.status='approved') < s.number_of_caregivers
      AND NOT EXISTS(SELECT 1 FROM shift_applications a WHERE a.shift_id=s.id AND a.caregiver_id=c.id AND a.status IN ('approved','pending'))
      ORDER BY s.start_time LIMIT 250`)).rows;
    const esc = (value: string) => value.replace(/\\/g,"\\\\").replace(/\r\n|\r|\n/g,"\\n").replace(/[,;]/g,m=>"\\"+m);
    const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Elite Bridge Staffing//Open shifts//EN","X-WR-CALNAME:Elite Care available shifts"];
    for (const s of shifts) lines.push("BEGIN:VEVENT","UID:shift-"+s.id+"@elitebridgestaffing.com","DTSTAMP:"+s.stamp,
      "DTSTART:"+s.starts,"DTEND:"+s.ends,"SUMMARY:Available Elite Care shift","LOCATION:"+esc([s.city,s.state].filter(Boolean).join(", ")),
      "URL:"+new URL("/opportunities?shiftId="+s.id,config.WEB_APP_URL).href,"TRANSP:TRANSPARENT","END:VEVENT");
    res.type("text/calendar").send([...lines,"END:VCALENDAR",""].join("\r\n"));
  } catch(error) { next(error); }
});
export default router;
