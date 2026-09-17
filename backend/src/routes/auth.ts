import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { db } from "../db/index.js";
import { ensureCoreTables } from "../db/bootstrap.js";
import {
  users,
  caregivers,
  employers,
  caregiverInvitations,
  employerCaregivers,
  passwordResetTokens,
} from "../db/schema.js";
import { and, eq, gt, isNull } from "drizzle-orm";
import { generateToken, AuthRequest, authMiddleware } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { config } from "../config/env.js";
import { sendEmail, escapeEmailHtml } from "../services/email.js";
import { sendSignupAlert, sendWelcomeEmail } from "../services/notifications";

const router = Router();

const registerSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(["caregiver", "employer"]),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  inviteToken: z.string().min(20).optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

router.post("/register", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const data = registerSchema.parse(req.body);
    let invitation: typeof caregiverInvitations.$inferSelect | undefined;

    if (data.inviteToken) {
      if (data.role !== "caregiver") {
        throw new AppError(400, "Caregiver invitations can only create caregiver accounts");
      }
      const invitationList = await db
        .select()
        .from(caregiverInvitations)
        .where(
          and(
            eq(caregiverInvitations.tokenHash, hashToken(data.inviteToken)),
            eq(caregiverInvitations.status, "pending"),
            gt(caregiverInvitations.expiresAt, new Date())
          )
        )
        .limit(1);
      invitation = invitationList[0];
      if (!invitation) {
        throw new AppError(400, "This invitation is invalid or has expired");
      }
      if (invitation.email && invitation.email.toLowerCase() !== data.email) {
        throw new AppError(400, "Use the email address that received this invitation");
      }
    }

    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);

    if (existingUser.length > 0) {
      throw new AppError(409, "User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await db
      .insert(users)
      .values({
        email: data.email,
        verificationStatus: "pending",
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        phone: data.phone,
      })
      .returning();

    const user = newUser[0];

    if (user.role === "employer") {
      await db.insert(employers).values({
        verificationStatus: "pending",
        userId: user.id,
        companyName: data.companyName || `${user.firstName} ${user.lastName}`,
      });
    } else {
      await db.insert(caregivers).values({ userId: user.id, hourlyRate: "0", specialties: [], certifications: [] });
    }

    if (invitation) {
      await db
        .insert(employerCaregivers)
        .values({
          employerId: invitation.employerId,
          caregiverUserId: user.id,
          invitationId: invitation.id,
          status: "active",
        })
        .onConflictDoNothing();
      await db
        .update(caregiverInvitations)
        .set({
          status: "accepted",
          acceptedByUserId: user.id,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(caregiverInvitations.id, invitation.id));
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    const [officeAlertSent, welcomeSent] = await Promise.all([sendSignupAlert(data), sendWelcomeEmail(data)]);

    res.status(201).json({
      message: "User registered successfully",
      token,
      emailNotifications: { officeAlertSent, welcomeSent },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        companyName: data.companyName,
        verificationStatus: user.verificationStatus,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const data = forgotPasswordSchema.parse(req.body);
    const userList = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    const user = userList[0];

    if (user) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
      const token = randomBytes(32).toString("hex");
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      const resetUrl = `${config.WEB_APP_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        await sendEmail({
          to: user.email,
          subject: "Reset your Elite Bridge password",
          text: `Reset your Elite Bridge password within 30 minutes: ${resetUrl}`,
          html: `<p>Hello ${escapeEmailHtml(user.firstName)},</p><p>Use the secure link below to reset your Elite Bridge password. It expires in 30 minutes.</p><p><a href="${escapeEmailHtml(resetUrl)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
        });
      } catch {
        console.error("Password reset email could not be delivered; check the email provider log");
      }
    }

    res.json({ message: "If that account exists, a password reset email has been sent." });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const data = resetPasswordSchema.parse(req.body);
    const tokenList = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(data.token)),
          gt(passwordResetTokens.expiresAt, new Date()),
          isNull(passwordResetTokens.usedAt)
        )
      )
      .limit(1);
    const resetToken = tokenList[0];
    if (!resetToken) {
      throw new AppError(400, "This password reset link is invalid or has expired");
    }

    await db
      .update(users)
      .set({ password: await bcrypt.hash(data.password, 10), updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    res.json({ message: "Your password has been updated. You can now sign in." });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const data = loginSchema.parse(req.body);

    const userList = await db.select().from(users).where(eq(users.email, data.email)).limit(1);

    if (userList.length === 0) {
      throw new AppError(401, "Invalid email or password");
    }

    const user = userList[0];
    const passwordMatch = await bcrypt.compare(data.password, user.password);

    if (!passwordMatch) {
      throw new AppError(401, "Invalid email or password");
    }

    if (!user.isActive) {
      throw new AppError(403, "User account is disabled");
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        verificationStatus: user.verificationStatus,
        emailVerified: user.emailVerified,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();

    if (!req.user) {
      throw new AppError(401, "User not authenticated");
    }

    const userList = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);

    if (userList.length === 0) {
      throw new AppError(404, "User not found");
    }

    const user = userList[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        verificationStatus: user.verificationStatus,
        emailVerified: user.emailVerified,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/account", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user) throw new AppError(401, "User not authenticated");
    const userList = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!userList[0]) throw new AppError(404, "User not found");
    if (userList[0].role !== "caregiver" && userList[0].role !== "employer") {
      throw new AppError(403, "This account cannot be deleted from the mobile app");
    }
    await db.delete(users).where(eq(users.id, req.user.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
