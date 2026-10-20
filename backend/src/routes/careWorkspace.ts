import { Router } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

/**
 * Non-clinical operations data only. Do not use this intake for diagnoses,
 * medication lists, Social Security numbers, medical history, or access codes.
 * All client records are scoped to the authenticated employer.
 */
const router = Router();
router.use(authMiddleware);

const TASKS = ["companionship", "meal_preparation", "personal_care", "mobility_support",
 "light_housekeeping", "transportation", "respite", "daily_reminders"] as const;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const intakeSchema = z.object({
  clientName: z.string().trim().min(2).max(160),
  clientEmail: z.union([z.string().trim().email().max(254), z.literal("")]).default(""),
  contactName: z.string().trim().max(160).default(""),
  contactPhone: z.string().trim().max(40).default(""),
  serviceAddress: z.string().trim().max(350).default(""),
  preferredDays: z.array(z.enum(DAYS)).max(7).default([]).transform(v => [...new Set(v)]),
  serviceTasks: z.array(z.enum(TASKS)).max(TASKS.length).default([]).transform(v => [...new Set(v)]),
  preferredWindow: z.enum(["flexible", "morning", "afternoon", "evening"]).default("flexible"),
  plannedStartDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).default(""),
  intakeStatus: z.enum(["draft", "ready"]).default("draft"),
  coordinationNotes: z.string().trim().max(600).default(""),
}).strict();

export const TRAINING_MODULES = [
  { key:"shift-readiness",version:"2026-10",title:"Starting and finishing a care shift",minutes:5,
    summary:"Arrival, attendance, coverage and handoff.",
    topics:[
      "Check the assigned shift, duties, and authorized time window before arriving.",
      "Clock in and out accurately. Report missed time entries rather than guessing.",
      "Notify Elite Bridge promptly about delays or staffing changes.",
      "Hand off completed non-medical tasks and any outstanding requests."
    ] },
  { key:"privacy-boundaries",version:"2026-10",title:"Privacy and professional boundaries",minutes:6,
    summary:"Respect confidential information and agency relationships.",
    topics:[
      "Access client details only for your assigned work.",
      "Do not share client information over personal messages, public posts or unapproved apps.",
      "Never accept direct payment for shifts coordinated by Elite Bridge.",
      "Escalate privacy and professional boundary concerns through the agency."
    ] },
  { key:"incident-escalation",version:"2026-10",title:"Safety and incident escalation",minutes:7,
    summary:"Respond responsibly to emergencies or safety problems.",
    topics:[
      "Call 911 for immediate life-threatening emergencies, then alert Elite Bridge when safe.",
      "Document observed facts promptly in the approved incident workflow.",
      "Do not perform clinical procedures outside authorized responsibilities.",
      "Report unsafe conditions, falls, missed coverage and urgent concerns."
    ] },
  { key:"care-documentation",version:"2026-10",title:"Accurate non-medical care records",minutes:5,
    summary:"Record care tasks and time without assumptions.",
    topics:[
      "Document only tasks performed and time actually worked.",
      "Separate observed facts from assumptions; never invent visits or tasks.",
      "Do not enter diagnoses, medication details or clinical records in general notes.",
      "Use approved reporting workflows for concerns requiring a supervisor."
    ] }
] as const;

let tablePromise: Promise<void> | undefined;
function ensureWorkspace() {
  return (tablePromise ||= setup().catch(error => { tablePromise=undefined; throw error; }));
}
async function setup() {
  await ensureCoreTables();
  await db.execute(sql`CREATE TABLE IF NOT EXISTS care_workspace_intakes (
    id SERIAL PRIMARY KEY,
    employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    client_name VARCHAR(160) NOT NULL,
    client_email VARCHAR(254),
    contact_name VARCHAR(160) NOT NULL DEFAULT '',
    contact_phone VARCHAR(40) NOT NULL DEFAULT '',
    service_address TEXT NOT NULL DEFAULT '',
    preferred_days JSONB NOT NULL DEFAULT '[]'::jsonb,
    service_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_window VARCHAR(20) NOT NULL DEFAULT 'flexible',
    planned_start_date DATE,
    intake_status VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK(intake_status IN ('draft','ready')),
    coordination_notes VARCHAR(600) NOT NULL DEFAULT '',
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS care_workspace_intakes_employer
    ON care_workspace_intakes(employer_id,updated_at DESC)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS care_workspace_audit (
    id BIGSERIAL PRIMARY KEY,
    employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
    intake_id INTEGER NOT NULL REFERENCES care_workspace_intakes(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(30) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS care_training_reviews (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_key VARCHAR(64) NOT NULL,
    module_version VARCHAR(20) NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id,module_key,module_version)
  )`);
}
const rows = (r:any):any[] => r.rows || [];
async function employerId(req:AuthRequest):Promise<number> {
  if (req.user?.role !== "employer") throw new AppError(403,"Employer access required.");
  const row=rows(await db.execute(sql`SELECT id FROM employers WHERE user_id=${req.user.id} LIMIT 1`))[0];
  if(!row) throw new AppError(404,"Complete your employer profile before saving intakes.");
  return Number(row.id);
}
function output(r:any) {
  return {
    id:r.id,clientName:r.client_name,clientEmail:r.client_email||"",
    contactName:r.contact_name||"",contactPhone:r.contact_phone||"",
    serviceAddress:r.service_address||"",preferredDays:r.preferred_days||[],
    serviceTasks:r.service_tasks||[],preferredWindow:r.preferred_window,
    plannedStartDate:r.planned_start_date?(r.planned_start_date instanceof Date?r.planned_start_date.toISOString().slice(0,10):String(r.planned_start_date).slice(0,10)):"",
    intakeStatus:r.intake_status,coordinationNotes:r.coordination_notes||"",
    createdAt:r.created_at,updatedAt:r.updated_at
  };
}
function validate(value:unknown) {
  const d=intakeSchema.parse(value);
  if(d.intakeStatus==="ready" && (!d.serviceTasks.length||!d.preferredDays.length)) {
    throw new AppError(400,"Select at least one day and one service before marking ready.");
  }
  if(d.plannedStartDate) {
    const date=new Date(d.plannedStartDate+"T12:00:00Z");
    if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==d.plannedStartDate)
      throw new AppError(400,"Enter a valid start date.");
  }
  return d;
}
router.get("/employer/intakes",async(req:AuthRequest,res,next)=>{
  try {
    await ensureWorkspace();const employer=await employerId(req);
    const list=rows(await db.execute(sql`SELECT * FROM care_workspace_intakes
      WHERE employer_id=${employer} ORDER BY updated_at DESC,id DESC LIMIT 200`));
    res.setHeader("Cache-Control","no-store");
    res.json({intakes:list.map(output),clinicalRecordsEnabled:false});
  } catch(e){next(e);}
});
router.post("/employer/intakes",async(req:AuthRequest,res,next)=>{
  try {
    await ensureWorkspace();const employer=await employerId(req);const d=validate(req.body);
    const row=await db.transaction(async tx=>{
      const r=rows(await tx.execute(sql`INSERT INTO care_workspace_intakes
        (employer_id,client_name,client_email,contact_name,contact_phone,service_address,
         preferred_days,service_tasks,preferred_window,planned_start_date,intake_status,
         coordination_notes,created_by,updated_by)
        VALUES (${employer},${d.clientName},${d.clientEmail||null},${d.contactName},${d.contactPhone},
         ${d.serviceAddress},${JSON.stringify(d.preferredDays)}::jsonb,${JSON.stringify(d.serviceTasks)}::jsonb,
         ${d.preferredWindow},${d.plannedStartDate||null}::date,${d.intakeStatus},
         ${d.coordinationNotes},${req.user!.id},${req.user!.id})
        RETURNING *`))[0];
      await tx.execute(sql`INSERT INTO care_workspace_audit(employer_id,intake_id,actor_id,action)
        VALUES(${employer},${r.id},${req.user!.id},'intake_created')`);
      return r;
    });
    res.setHeader("Cache-Control","no-store");res.status(201).json({intake:output(row)});
  } catch(e){next(e);}
});
router.put("/employer/intakes/:id",async(req:AuthRequest,res,next)=>{
  try {
    await ensureWorkspace();const employer=await employerId(req);
    const id=z.coerce.number().int().positive().parse(req.params.id);const d=validate(req.body);
    const row=await db.transaction(async tx=>{
      const r=rows(await tx.execute(sql`UPDATE care_workspace_intakes SET
        client_name=${d.clientName},client_email=${d.clientEmail||null},
        contact_name=${d.contactName},contact_phone=${d.contactPhone},
        service_address=${d.serviceAddress},
        preferred_days=${JSON.stringify(d.preferredDays)}::jsonb,
        service_tasks=${JSON.stringify(d.serviceTasks)}::jsonb,
        preferred_window=${d.preferredWindow},
        planned_start_date=${d.plannedStartDate||null}::date,
        intake_status=${d.intakeStatus},
        coordination_notes=${d.coordinationNotes},
        updated_by=${req.user!.id},updated_at=CURRENT_TIMESTAMP
        WHERE id=${id} AND employer_id=${employer} RETURNING *`))[0];
      if(!r)throw new AppError(404,"Intake not found.");
      await tx.execute(sql`INSERT INTO care_workspace_audit(employer_id,intake_id,actor_id,action)
        VALUES(${employer},${id},${req.user!.id},'intake_updated')`);
      return r;
    });
    res.setHeader("Cache-Control","no-store");res.json({intake:output(row)});
  } catch(e){next(e);}
});

const reviewSchema=z.object({moduleKey:z.string().max(64),moduleVersion:z.string().max(20),acknowledged:z.literal(true)}).strict();
router.get("/training",async(req:AuthRequest,res,next)=>{
  try {
    await ensureWorkspace();
    const reviews=rows(await db.execute(sql`SELECT module_key,module_version,reviewed_at
      FROM care_training_reviews WHERE user_id=${req.user!.id}`));
    const map=new Map(reviews.map(r=>[r.module_key+":"+r.module_version,r.reviewed_at]));
    res.setHeader("Cache-Control","no-store");
    res.json({certified:false,modules:TRAINING_MODULES.map(m=>({...m,reviewedAt:map.get(m.key+":"+m.version)||null}))});
  } catch(e){next(e);}
});
router.post("/training/review",async(req:AuthRequest,res,next)=>{
  try {
    await ensureWorkspace();const d=reviewSchema.parse(req.body);
    const module=TRAINING_MODULES.find(m=>m.key===d.moduleKey&&m.version===d.moduleVersion);
    if(!module) throw new AppError(400,"Learning module or version is not available.");
    const row=rows(await db.execute(sql`INSERT INTO care_training_reviews(user_id,module_key,module_version)
      VALUES(${req.user!.id},${module.key},${module.version})
      ON CONFLICT(user_id,module_key,module_version)
      DO UPDATE SET reviewed_at=care_training_reviews.reviewed_at
      RETURNING module_key,module_version,reviewed_at`))[0];
    res.setHeader("Cache-Control","no-store");
    res.json({moduleKey:row.module_key,moduleVersion:row.module_version,reviewedAt:row.reviewed_at,certified:false});
  } catch(e){next(e);}
});
export default router;
