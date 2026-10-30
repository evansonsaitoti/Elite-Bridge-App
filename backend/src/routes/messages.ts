import { Router } from "express";
import { z } from "zod";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages, users } from "../db/schema.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { ensureCoreTables } from "../db/bootstrap.js";
import { sharedOrganization } from "../services/teamAccess.js";

const router = Router();
router.use(authMiddleware);
router.use(async (_req, _res, next) => {
  try { await ensureCoreTables(); next(); } catch (error) { next(error); }
});

// Get all conversations for the current user
router.get("/conversations", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    
    // Get unique contacts the user has messaged
    const sentTo = await db
      .select({ contactId: messages.recipientId })
      .from(messages)
      .where(eq(messages.senderId, userId));
      
    const receivedFrom = await db
      .select({ contactId: messages.senderId })
      .from(messages)
      .where(eq(messages.recipientId, userId));
      
    const contactIds = Array.from(new Set([...sentTo.map(s => s.contactId), ...receivedFrom.map(r => r.contactId)]));
    
    if (contactIds.length === 0) {
      return res.json({ conversations: [] });
    }
    
    const contacts = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        profileImage: users.profileImage
      })
      .from(users)
      .where(and(sql`${users.id} IN (${sql.join(contactIds, sql`,`)})`,
        eq(users.isActive, true), sharedOrganization(userId, sql`${users.id}`)));
      
    res.json({ conversations: contacts });
  } catch (error) {
    next(error);
  }
});

// Get messages between current user and another user
router.get("/:contactId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const contactId = parseInt(req.params.contactId);
    
    if (isNaN(contactId)) {
      throw new AppError(400, "Invalid contact ID");
    }
    
    const chatMessages = await db
      .select()
      .from(messages)
      .where(
        and(sharedOrganization(userId, contactId), or(
          and(eq(messages.senderId, userId), eq(messages.recipientId, contactId)),
          and(eq(messages.senderId, contactId), eq(messages.recipientId, userId))
        ))
      )
      .orderBy(desc(messages.createdAt));
      
    res.json({ messages: chatMessages });
  } catch (error) {
    next(error);
  }
});

// Send a message
router.post("/", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const senderId = req.user!.id;
    const { recipientId, content } = z.object({
      recipientId: z.number().int().positive(),
      content: z.string().trim().min(1).max(2000)
    }).parse(req.body);

    const peer = await db.select({ id: users.id }).from(users).where(and(
      eq(users.id, recipientId), eq(users.isActive, true), sharedOrganization(senderId, recipientId)
    )).limit(1);
    if (!peer.length) throw new AppError(404, "Active team contact not found.");
    
    const newMessage = await db
      .insert(messages)
      .values({
        senderId,
        recipientId,
        content,
      })
      .returning();
      
    res.status(201).json({ message: newMessage[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
