import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { sendPushToUsers } from "../services/notifications";

/**
 * Location-based operational checklists. Caregivers must have an active
 * relationship with the owning agency; employers must own the site.
 * Never store clinical observations, access codes or medications here.
 */
const router = Router();
router.use(authMiddleware);
const rows = (r: any): any[] => r.rows || [];
const idSchema = z.coerce.number().int().positive();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const periodSchema = z.enum(["morning", "evening", "other"]);
const checkSchema = z.object({
  visitDate: dateSchema,
  visitPeriod: periodSchema,
  status: z.enum(["done", "not_needed", "pending"]),
}).strict();
const signoffSchema = z.object({
  visitDate: dateSchema,
  visitPeriod: periodSchema,
  note: z.string().trim().max(300).optional().default(""),
}).strict();
let ready: Promise<void> | undefined;

async function ensureChecklist() {
  if (ready) return ready;
  ready = (async () => {
    await ensureCoreTables();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS care_site_checklists (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      site_key VARCHAR(90) NOT NULL,
      client_name VARCHAR(180) NOT NULL,
      location_name VARCHAR(160) NOT NULL,
      address VARCHAR(350) NOT NULL,
      city VARCHAR(120) NOT NULL,
      state VARCHAR(2) NOT NULL,
      zip_code VARCHAR(20) NOT NULL DEFAULT '',
      is_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employer_id,site_key)
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS care_site_checklist_tasks (
      id SERIAL PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES care_site_checklists(id) ON DELETE CASCADE,
      task_key VARCHAR(90) NOT NULL,
      title VARCHAR(200) NOT NULL,
      instructions VARCHAR(500) NOT NULL DEFAULT '',
      frequency VARCHAR(20) NOT NULL DEFAULT 'as_needed'
        CHECK(frequency IN ('each_visit','as_needed','monday','scheduled')),
      rank INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(site_id,task_key)
    )`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS care_site_checklist_actions (
      id BIGSERIAL PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES care_site_checklists(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES care_site_checklist_tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      visit_date DATE NOT NULL,
      visit_period VARCHAR(8) NOT NULL CHECK(visit_period IN ('morning','evening','other')),
      status VARCHAR(12) NOT NULL CHECK(status IN ('done','not_needed','pending')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS care_site_actions_current
      ON care_site_checklist_actions(site_id,visit_date,visit_period,task_id,id DESC)`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS care_site_visit_signoffs (
      id BIGSERIAL PRIMARY KEY,
      site_id INTEGER NOT NULL REFERENCES care_site_checklists(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      visit_date DATE NOT NULL,
      visit_period VARCHAR(8) NOT NULL CHECK(visit_period IN ('morning','evening','other')),
      note VARCHAR(300) NOT NULL DEFAULT '',
      signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(site_id,user_id,visit_date,visit_period)
    )`);
  })().catch(e => { ready = undefined; throw e; });
  return ready;
}
function nyToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(new Date());
  const find = (type: string) => parts.find(p => p.type === type)?.value || "";
  return [find("year"),find("month"),find("day")].join("-");
}
function validateDate(date: string) {
  const ms=Date.parse(date + "T12:00:00Z");
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0,10)!==date)
    throw new AppError(400, "Enter a valid service date.");
  const now=Date.parse(nyToday()+"T12:00:00Z");
  if (Math.abs(now-ms)>14*86400000)
    throw new AppError(400,"Care visit checkoffs must be within 14 days of today.");
}
function dateAndPeriod(query: any) {
  const visitDate=dateSchema.parse(query?.visitDate || nyToday());
  const visitPeriod=periodSchema.parse(query?.visitPeriod || "morning");
  validateDate(visitDate);
  return {visitDate,visitPeriod};
}
function checkRole(req: AuthRequest) {
  if (!req.user || !["employer","caregiver"].includes(req.user.role))
    throw new AppError(403, "Care-team access required.");
}
async function siteFor(req: AuthRequest, siteId: number) {
  checkRole(req);
  const site=rows(await db.execute(sql`SELECT s.id,s.employer_id,s.client_name,s.location_name,
    s.address,s.city,s.state,s.zip_code,s.is_published
    FROM care_site_checklists s
    WHERE s.id=${siteId} AND s.is_published=true
      AND (
        (${req.user!.role}='employer' AND EXISTS (
          SELECT 1 FROM employers e WHERE e.id=s.employer_id AND e.user_id=${req.user!.id}
        ))
        OR
        (${req.user!.role}='caregiver' AND EXISTS (
          SELECT 1 FROM employer_caregivers ec
          WHERE ec.employer_id=s.employer_id AND ec.caregiver_user_id=${req.user!.id}
          AND ec.status='active'
        ))
      ) LIMIT 1`))[0];
  if (!site) throw new AppError(404, "Checklist not available to this care team.");
  return site;
}
function publicSite(row:any){
  return {
    id:Number(row.id),clientName:row.client_name,
    locationName:row.location_name,address:row.address,
    city:row.city,state:row.state,zipCode:row.zip_code,
  };
}
router.get("/sites",async(req:AuthRequest,res,next)=>{
  try{
    await ensureChecklist();checkRole(req);
    const list=rows(await db.execute(sql`SELECT s.*
      FROM care_site_checklists s WHERE s.is_published=true
        AND (
          (${req.user!.role}='employer' AND EXISTS (
            SELECT 1 FROM employers e WHERE e.id=s.employer_id AND e.user_id=${req.user!.id}
          ))
          OR
          (${req.user!.role}='caregiver' AND EXISTS (
            SELECT 1 FROM employer_caregivers ec
            WHERE ec.employer_id=s.employer_id AND ec.caregiver_user_id=${req.user!.id}
              AND ec.status='active'
          ))
        )
      ORDER BY s.client_name ASC LIMIT 100`));
    res.setHeader("Cache-Control","no-store");
    res.json({sites:list.map(publicSite)});
  }catch(e){next(e);}
});

router.get("/sites/:siteId",async(req:AuthRequest,res,next)=>{
  try{
    await ensureChecklist();
    const site=await siteFor(req,idSchema.parse(req.params.siteId));
    const {visitDate,visitPeriod}=dateAndPeriod(req.query);
    const tasks=rows(await db.execute(sql`SELECT t.id,t.task_key,t.title,t.instructions,
      t.frequency,t.rank,
      current_action.status AS current_status,current_action.created_at AS current_at,
      cu.first_name AS current_first,cu.last_name AS current_last,
      last_done.created_at AS last_done_at,
      lu.first_name AS last_done_first,lu.last_name AS last_done_last
    FROM care_site_checklist_tasks t
    LEFT JOIN LATERAL (
      SELECT a.status,a.created_at,a.user_id
      FROM care_site_checklist_actions a WHERE a.site_id=t.site_id
        AND a.task_id=t.id AND a.visit_date=${visitDate}::date
        AND a.visit_period=${visitPeriod}
      ORDER BY a.id DESC LIMIT 1
    ) current_action ON true
    LEFT JOIN users cu ON cu.id=current_action.user_id
    LEFT JOIN LATERAL (
      SELECT a.created_at,a.user_id
      FROM care_site_checklist_actions a WHERE a.site_id=t.site_id
        AND a.task_id=t.id AND a.status='done'
        AND NOT EXISTS (
          SELECT 1 FROM care_site_checklist_actions corrected
          WHERE corrected.site_id=a.site_id AND corrected.task_id=a.task_id
            AND corrected.visit_date=a.visit_date AND corrected.visit_period=a.visit_period
            AND corrected.id>a.id
        )
      ORDER BY a.id DESC LIMIT 1
    ) last_done ON true
    LEFT JOIN users lu ON lu.id=last_done.user_id
    WHERE t.site_id=${site.id} AND t.is_active=true
    ORDER BY t.rank,t.id`));
    const recent=rows(await db.execute(sql`SELECT v.id,v.visit_date,v.visit_period,
      v.note,v.signed_at,u.first_name,u.last_name
      FROM care_site_visit_signoffs v JOIN users u ON u.id=v.user_id
      WHERE v.site_id=${site.id}
      ORDER BY v.signed_at DESC LIMIT 8`));
    res.setHeader("Cache-Control","no-store");
    res.json({
      site:publicSite(site),visitDate,visitPeriod,
      tasks:tasks.map(t=>({
        id:Number(t.id),key:t.task_key,title:t.title,instructions:t.instructions,
        frequency:t.frequency,
        status:t.current_status || "pending",checkedAt:t.current_at || null,
        checkedBy:[t.current_first,t.current_last].filter(Boolean).join(" ") || null,
        lastDoneAt:t.last_done_at || null,
        lastDoneBy:[t.last_done_first,t.last_done_last].filter(Boolean).join(" ") || null,
      })),
      recentSignoffs:recent.map(v=>({
        id:Number(v.id),visitDate:String(v.visit_date).slice(0,10),
        visitPeriod:v.visit_period,note:v.note,signedAt:v.signed_at,
        caregiver:[v.first_name,v.last_name].filter(Boolean).join(" "),
      })),
      lastReadOnly:true,
    });
  }catch(e){next(e);}
});

router.post("/sites/:siteId/tasks/:taskId/check",async(req:AuthRequest,res,next)=>{
  try{
    await ensureChecklist();
    const site=await siteFor(req,idSchema.parse(req.params.siteId));
    const taskId=idSchema.parse(req.params.taskId);
    const input=checkSchema.parse(req.body);
    validateDate(input.visitDate);
    const exists=rows(await db.execute(sql`SELECT id,frequency FROM care_site_checklist_tasks
      WHERE id=${taskId} AND site_id=${site.id} AND is_active=true LIMIT 1`))[0];
    if(!exists)throw new AppError(404,"Checklist task not found.");
    if(exists.frequency==="monday" && input.status==="done"){
      const day=new Date(input.visitDate+"T12:00:00Z").getUTCDay();
      if(day!==1)throw new AppError(409,"The trash-bin task is scheduled for Mondays.");
    }
    const saved=rows(await db.execute(sql`INSERT INTO care_site_checklist_actions
      (site_id,task_id,user_id,visit_date,visit_period,status)
      VALUES(${site.id},${taskId},${req.user!.id},${input.visitDate}::date,
        ${input.visitPeriod},${input.status})
      RETURNING id,status,created_at`))[0];
    res.setHeader("Cache-Control","no-store");
    res.status(201).json({action:{
      id:Number(saved.id),status:saved.status,checkedAt:saved.created_at,
    }});
  }catch(e){next(e);}
});

router.post("/sites/:siteId/signoff",async(req:AuthRequest,res,next)=>{
  try {
    await ensureChecklist();
    const site=await siteFor(req,idSchema.parse(req.params.siteId));
    const input=signoffSchema.parse(req.body);
    validateDate(input.visitDate);
    const count=rows(await db.execute(sql`SELECT COUNT(*) AS total FROM (
      SELECT DISTINCT ON(task_id) task_id,status
      FROM care_site_checklist_actions
      WHERE site_id=${site.id} AND visit_date=${input.visitDate}::date
        AND visit_period=${input.visitPeriod}
      ORDER BY task_id,id DESC
    ) latest WHERE status IN('done','not_needed')`))[0];
    if(Number(count?.total || 0)<1)
      throw new AppError(409,"Check off at least one completed or not-needed task before finishing the visit.");
    const signed=rows(await db.execute(sql`INSERT INTO care_site_visit_signoffs
      (site_id,user_id,visit_date,visit_period,note)
      VALUES(${site.id},${req.user!.id},${input.visitDate}::date,
        ${input.visitPeriod},${input.note})
      ON CONFLICT(site_id,user_id,visit_date,visit_period)
      DO UPDATE SET note=EXCLUDED.note,signed_at=CURRENT_TIMESTAMP
      RETURNING id,signed_at`))[0];
    // Notify the linked care team without client identity or checklist content
    // on lock screens; access to records still requires authentication.
    const team=rows(await db.execute(sql`SELECT ec.caregiver_user_id AS id
      FROM employer_caregivers ec WHERE ec.employer_id=${site.employer_id}
        AND ec.status='active' AND ec.caregiver_user_id<>${req.user!.id}
      UNION
      SELECT e.user_id AS id FROM employers e WHERE e.id=${site.employer_id}
        AND e.user_id<>${req.user!.id} LIMIT 100`));
    const ids=team.map(x=>Number(x.id)).filter(Number.isInteger);
    if(ids.length){
      try{
        await db.execute(sql`INSERT INTO notifications(user_id,type,title,message,related_id)
          SELECT u.id,'care_checklist','Care visit handoff completed',
            'A team member completed a care-site checklist. Sign in to see the details.',
            ${Number(signed.id)}
          FROM users u WHERE u.id IN(${sql.join(ids.map(id=>sql`${id}`),sql`,`)})`);
        await sendPushToUsers(ids,{
          title:"Care visit handoff",
          body:"The previous caregiver finished a checklist. Review the care site in Elite Care.",
          data:{type:"care_checklist",siteId:Number(site.id)},
        });
      }catch(e){console.error("Checklist saved; push status unknown.");}
    }
    res.setHeader("Cache-Control","no-store");
    res.json({id:Number(signed.id),signedAt:signed.signed_at});
  }catch(e){next(e);}
});

export default router;
