import { Router } from "express";
import { createHash } from "crypto";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { ensureShiftPostsTable } from "./bookings";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { sendPushToUsers } from "../services/notifications";

/**
 * Caregiver-to-caregiver handoffs are non-clinical operational records.
 * Only an employer or a caregiver assigned to the selected client's shift
 * can read the entries. No public/anonymous access, cross-employer sharing
 * or medical record features are enabled here.
 */
const router = Router();
router.use(authMiddleware);
const rows = (result: any): any[] => result.rows || [];
const positiveId = z.coerce.number().int().positive();
const itemInput = z.object({
  kind: z.enum(["note", "task"]),
  content: z.string().trim().min(4).max(700),
}).strict();

let ready: Promise<void> | undefined;
async function ensureHandoffs() {
  if (ready) return ready;
  ready = (async () => {
    await ensureShiftPostsTable();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS care_handoff_items (
      id BIGSERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      client_key VARCHAR(64) NOT NULL,
      source_shift_id INTEGER NOT NULL REFERENCES shift_posts(id) ON DELETE CASCADE,
      author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind VARCHAR(8) NOT NULL CHECK(kind IN ('note','task')),
      content VARCHAR(700) NOT NULL,
      status VARCHAR(8) NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
      completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS handoff_client_recent_idx
      ON care_handoff_items(employer_id, client_key, created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS handoff_shift_idx
      ON care_handoff_items(source_shift_id)`);
  })().catch(error => {ready = undefined;throw error;});
  return ready;
}

function clean(v: unknown): string {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function fingerprint(shift: any): string {
  const name = clean(shift.care_recipient_name);
  const address = clean(shift.address);
  if (!name || !address) {
    throw new AppError(409, "This shift needs both a care recipient and a service address for secure handoffs.");
  }
  return createHash("sha256").update([name, address, clean(shift.city), clean(shift.state), clean(shift.zip_code)].join("|")).digest("hex");
}

async function access(req: AuthRequest, shiftId: number) {
  if (!req.user) throw new AppError(401, "Sign in to continue.");
  if (req.user.role !== "caregiver" && req.user.role !== "employer") {
    throw new AppError(403, "Care-team access required.");
  }
  const shift = rows(await db.execute(sql`SELECT s.id,s.employer_id,s.title,s.care_recipient_name,
      s.address,s.city,s.state,s.zip_code,s.status,s.start_time,s.end_time
      FROM shift_posts s
      WHERE s.id=${shiftId} AND (
        (${req.user.role}='employer' AND EXISTS (
          SELECT 1 FROM employers e WHERE e.id=s.employer_id AND e.user_id=${req.user.id}
        ))
        OR
        (${req.user.role}='caregiver' AND EXISTS (
          SELECT 1 FROM shift_applications sa
          JOIN caregivers c ON c.id=sa.caregiver_id
          JOIN employer_caregivers ec ON ec.employer_id=s.employer_id
            AND ec.caregiver_user_id=c.user_id AND ec.status='active'
          WHERE sa.shift_id=s.id AND sa.status='approved'
            AND c.user_id=${req.user.id}
            AND s.end_time >= CURRENT_TIMESTAMP - INTERVAL '45 days'
        ))
      ) LIMIT 1`))[0];
  if (!shift) throw new AppError(404, "Assigned client shift not found.");
  return { shift, key: fingerprint(shift) };
}

function mapItem(row: any) {
  return {
    id: Number(row.id),
    kind: row.kind,
    content: row.content,
    status: row.status,
    authorName: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Care team",
    createdAt: row.created_at,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
  };
}

router.get("/shifts", async(req: AuthRequest,res,next) => {
  try {
    await ensureHandoffs();
    if (!req.user || !["caregiver","employer"].includes(req.user.role)) {
      throw new AppError(403, "Care-team access required.");
    }
    const shifts = rows(await db.execute(sql`SELECT s.id,s.title,s.care_recipient_name,
      s.address,s.city,s.state,s.zip_code,s.start_time,s.end_time,s.status,
      e.company_name
      FROM shift_posts s
      JOIN employers e ON e.id=s.employer_id
      WHERE s.end_time >= CURRENT_TIMESTAMP - INTERVAL '45 days'
        AND s.start_time < CURRENT_TIMESTAMP + INTERVAL '180 days'
        AND s.care_recipient_name IS NOT NULL AND trim(s.care_recipient_name)<>''
        AND trim(s.address)<>''
        AND (
          (${req.user.role}='employer' AND e.user_id=${req.user.id})
          OR
          (${req.user.role}='caregiver' AND EXISTS (
            SELECT 1 FROM shift_applications sa
            JOIN caregivers c ON c.id=sa.caregiver_id
            JOIN employer_caregivers ec ON ec.employer_id=s.employer_id
             AND ec.caregiver_user_id=c.user_id AND ec.status='active'
            WHERE sa.shift_id=s.id AND sa.status='approved' AND c.user_id=${req.user.id}
          ))
        )
      ORDER BY
        CASE WHEN s.start_time >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END,
        CASE WHEN s.start_time >= CURRENT_TIMESTAMP THEN s.start_time END ASC,
        s.start_time DESC
      LIMIT 160`));
    const unique = new Map<string, any>();
    for (const s of shifts) {
      const key = fingerprint(s);
      if (!unique.has(key)) {
        unique.set(key, {
          shiftId: s.id,
          clientName: s.care_recipient_name,
          agency: s.company_name,
          location: [s.city, s.state].filter(Boolean).join(", "),
          shiftStart: s.start_time,
          shiftStatus: s.status,
        });
      }
    }
    res.setHeader("Cache-Control","no-store");
    res.json({ clients: Array.from(unique.values()), instructions: "Non-medical handoff notes and tasks only." });
  } catch(error) { next(error); }
});

router.get("/shifts/:shiftId/items", async(req: AuthRequest,res,next) => {
  try {
    await ensureHandoffs();
    const {shift,key}=await access(req,positiveId.parse(req.params.shiftId));
    const items=rows(await db.execute(sql`SELECT h.*,u.first_name,u.last_name
      FROM care_handoff_items h
      JOIN users u ON u.id=h.author_user_id
      WHERE h.employer_id=${shift.employer_id} AND h.client_key=${key}
        AND (h.status='open' OR h.created_at >= CURRENT_TIMESTAMP - INTERVAL '45 days')
      ORDER BY CASE WHEN h.kind='task' AND h.status='open' THEN 0 ELSE 1 END,
        h.created_at DESC
      LIMIT 150`));
    res.setHeader("Cache-Control","no-store");
    res.json({ clientName:shift.care_recipient_name, items:items.map(mapItem) });
  } catch(error) {next(error);}
});

router.post("/shifts/:shiftId/items", async(req:AuthRequest,res,next)=>{
  try {
    await ensureHandoffs();
    const {shift,key}=await access(req,positiveId.parse(req.params.shiftId));
    if (shift.status==="cancelled" || shift.status==="closed") {
      throw new AppError(409,"This shift is closed. Choose an active care-team shift.");
    }
    const input=itemInput.parse(req.body);
    const saved=rows(await db.execute(sql`INSERT INTO care_handoff_items
      (employer_id,client_key,source_shift_id,author_user_id,kind,content)
      VALUES (${shift.employer_id},${key},${shift.id},${req.user!.id},
        ${input.kind},${input.content})
      RETURNING *`))[0];
    // Notify only currently assigned caregivers for the same client at the
    // same agency. Push payloads contain NO note text or client name.
    const recipients=rows(await db.execute(sql`SELECT DISTINCT c.user_id AS id
      FROM shift_posts s
      JOIN shift_applications sa ON sa.shift_id=s.id AND sa.status='approved'
      JOIN caregivers c ON c.id=sa.caregiver_id
      JOIN employer_caregivers ec ON ec.employer_id=s.employer_id
       AND ec.caregiver_user_id=c.user_id AND ec.status='active'
      WHERE s.employer_id=${shift.employer_id}
        AND s.status NOT IN ('cancelled','closed')
        AND s.end_time >= CURRENT_TIMESTAMP
        AND s.start_time < CURRENT_TIMESTAMP + INTERVAL '45 days'
        AND LOWER(TRIM(s.care_recipient_name))=LOWER(TRIM(${shift.care_recipient_name}))
        AND LOWER(TRIM(s.address))=LOWER(TRIM(${shift.address}))
        AND LOWER(TRIM(s.city))=LOWER(TRIM(${shift.city}))
        AND LOWER(TRIM(s.state))=LOWER(TRIM(${shift.state}))
        AND LOWER(TRIM(s.zip_code))=LOWER(TRIM(${shift.zip_code}))
        AND c.user_id <> ${req.user!.id}
      LIMIT 35`));
    const manager=rows(await db.execute(sql`SELECT user_id FROM employers
      WHERE id=${shift.employer_id} LIMIT 1`))[0];
    const recipientIds=[...new Set([
      ...recipients.map(x=>Number(x.id)),
      ...(manager?.user_id && Number(manager.user_id)!==req.user!.id?[Number(manager.user_id)]:[]),
    ])];
    if (recipientIds.length) {
      // No PHI/notes in push previews; detailed entries are behind auth.
      try {
        await db.execute(sql`INSERT INTO notifications (user_id,type,title,message,related_id)
          SELECT u.id,'care_handoff','New care handoff',
            'A new care-team handoff is ready. Open your secure workspace to review it.',
            ${Number(saved.id)}
          FROM users u WHERE u.id IN (${sql.join(recipientIds.map(id=>sql`${id}`),sql`,`)})`);
        await sendPushToUsers(recipientIds,{
          title:"New care handoff",
          body:"A care-team handoff is ready in Elite Bridge.",
          data:{type:"care_handoff",shiftId:Number(shift.id)},
        });
      } catch (noticeError) {
        console.error("Handoff saved; caregiver notification could not be confirmed");
      }
    }
    res.setHeader("Cache-Control","no-store");
    const author=rows(await db.execute(sql`SELECT first_name,last_name FROM users
      WHERE id=${req.user!.id} LIMIT 1`))[0] || {};
    res.status(201).json({item:mapItem({...saved,first_name:author.first_name,last_name:author.last_name})});
  }catch(error){next(error);}
});

router.patch("/shifts/:shiftId/items/:itemId/complete",async(req:AuthRequest,res,next)=>{
  try {
    await ensureHandoffs();
    const {shift,key}=await access(req,positiveId.parse(req.params.shiftId));
    const itemId=positiveId.parse(req.params.itemId);
    const item=rows(await db.execute(sql`UPDATE care_handoff_items
      SET status='done',completed_by=${req.user!.id},completed_at=CURRENT_TIMESTAMP,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=${itemId} AND employer_id=${shift.employer_id} AND client_key=${key}
        AND kind='task' AND status='open'
      RETURNING id,status,completed_at,completed_by`))[0];
    if(!item)throw new AppError(404,"This task is unavailable or already completed.");
    res.setHeader("Cache-Control","no-store");
    res.json({item:{id:Number(item.id),status:item.status,completedAt:item.completed_at,completedBy:item.completed_by}});
  }catch(error){next(error);}
});

export default router;
