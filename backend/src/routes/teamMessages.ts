import { Router } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { sendPushToUsers } from "../services/notifications";

const router=Router();
router.use(authMiddleware);
const rows=(result:any):any[]=>result.rows||[];
const idSchema=z.coerce.number().int().positive();
const sendSchema=z.object({content:z.string().trim().min(1).max(2000)}).strict();

function ensureRole(req:AuthRequest) {
  if (!req.user || !["caregiver","employer"].includes(req.user.role)) {
    throw new AppError(403,"Care team access required.");
  }
}

async function canCommunicate(req:AuthRequest,peerId:number) {
  ensureRole(req);
  if(peerId===req.user!.id)throw new AppError(400,"Choose another team member.");
  const allowed=rows(await db.execute(sql`SELECT 1 FROM users p
    WHERE p.id=${peerId} AND p.is_active=true AND (
      (${req.user!.role}='employer' AND p.role='caregiver' AND EXISTS(
        SELECT 1 FROM employers e
        JOIN employer_caregivers ec ON ec.employer_id=e.id AND ec.status='active'
        WHERE e.user_id=${req.user!.id} AND ec.caregiver_user_id=p.id
      ))
      OR
      (${req.user!.role}='caregiver' AND p.role='employer' AND EXISTS(
        SELECT 1 FROM employer_caregivers ec
        JOIN employers e ON e.id=ec.employer_id
        WHERE ec.caregiver_user_id=${req.user!.id}
        AND ec.status='active' AND e.user_id=p.id
      ))
    ) LIMIT 1`));
  if (!allowed.length) throw new AppError(404,"Active care-team contact not found.");
}

function output(r:any){
  return {
    id:r.id,senderId:r.sender_id,recipientId:r.recipient_id,
    content:r.content,isRead:!!r.is_read,createdAt:r.created_at,
  };
}

router.get("/contacts",async(req:AuthRequest,res,next)=>{
  try {
    await ensureCoreTables();ensureRole(req);
    const result=req.user!.role==="employer"
      ? await db.execute(sql`SELECT DISTINCT u.id,u.first_name,u.last_name,u.role,
          e.company_name
        FROM employers e
        JOIN employer_caregivers ec ON ec.employer_id=e.id AND ec.status='active'
        JOIN users u ON u.id=ec.caregiver_user_id AND u.role='caregiver' AND u.is_active=true
        WHERE e.user_id=${req.user!.id}
        ORDER BY u.first_name,u.last_name LIMIT 100`)
      : await db.execute(sql`SELECT DISTINCT u.id,u.first_name,u.last_name,u.role,
          e.company_name
        FROM employer_caregivers ec
        JOIN employers e ON e.id=ec.employer_id
        JOIN users u ON u.id=e.user_id AND u.role='employer' AND u.is_active=true
        WHERE ec.caregiver_user_id=${req.user!.id} AND ec.status='active'
        ORDER BY u.first_name,u.last_name LIMIT 25`);
    const ids=rows(result);
    const contacts=ids.map(u=>({
      id:u.id,name:req.user!.role==="caregiver"
        ? u.company_name || [u.first_name,u.last_name].filter(Boolean).join(" ")
        : [u.first_name,u.last_name].filter(Boolean).join(" "),
      role:u.role,
    }));
    res.setHeader("Cache-Control","no-store");
    res.json({contacts});
  }catch(e){next(e);}
});

router.get("/:peerId",async(req:AuthRequest,res,next)=>{
  try {
    await ensureCoreTables();
    const peerId=idSchema.parse(req.params.peerId);
    await canCommunicate(req,peerId);
    const result=rows(await db.execute(sql`SELECT id,sender_id,recipient_id,content,
      is_read,created_at FROM messages
      WHERE (sender_id=${req.user!.id} AND recipient_id=${peerId})
        OR (sender_id=${peerId} AND recipient_id=${req.user!.id})
      ORDER BY created_at DESC,id DESC LIMIT 100`));
    res.setHeader("Cache-Control","no-store");
    res.json({messages:result.reverse().map(output)});
  }catch(e){next(e);}
});

router.post("/:peerId",async(req:AuthRequest,res,next)=>{
  try {
    await ensureCoreTables();
    const peerId=idSchema.parse(req.params.peerId);
    await canCommunicate(req,peerId);
    const {content}=sendSchema.parse(req.body);
    const result=await db.transaction(async tx=>{
      const saved=rows(await tx.execute(sql`INSERT INTO messages(sender_id,recipient_id,content)
        VALUES(${req.user!.id},${peerId},${content})
        RETURNING id,sender_id,recipient_id,content,is_read,created_at`))[0];
      await tx.execute(sql`INSERT INTO notifications(user_id,type,title,message,related_id)
        VALUES(${peerId},'team_message','New team message',
        'A secure message from your care team is ready to read.',${saved.id})`);
      return saved;
    });
    // A failed push does not undo the saved message. Nothing sensitive is
    // included in the lock screen preview.
    await sendPushToUsers([peerId],{
      title:"New Elite Bridge message",
      body:"Open your care-team chat to read the message.",
      data:{type:"team_message",senderId:req.user!.id},
    });
    res.setHeader("Cache-Control","no-store");
    res.status(201).json({message:output(result),pushAttempted:true});
  }catch(e){next(e);}
});

router.post("/:peerId/read",async(req:AuthRequest,res,next)=>{
  try {
    await ensureCoreTables();
    const peerId=idSchema.parse(req.params.peerId);
    await canCommunicate(req,peerId);
    await db.execute(sql`UPDATE messages SET is_read=true,read_at=CURRENT_TIMESTAMP
      WHERE sender_id=${peerId} AND recipient_id=${req.user!.id} AND is_read=false`);
    res.status(204).send();
  }catch(e){next(e);}
});

export default router;
