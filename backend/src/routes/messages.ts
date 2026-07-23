import { Router } from "express";
import { z } from "zod";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { messages, users } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

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
      .where(sql`${users.id} IN (${sql.join(contactIds, sql`,`)})`);
      
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
        or(
          and(eq(messages.senderId, userId), eq(messages.recipientId, contactId)),
          and(eq(messages.senderId, contactId), eq(messages.recipientId, userId))
        )
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
      recipientId: z.number(),
      content: z.string().min(1)
    }).parse(req.body);
    
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
