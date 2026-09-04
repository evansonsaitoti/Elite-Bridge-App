import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { users, employers } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { generateToken, AuthRequest, authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { sendEmailVerification, sendSignupAlert } from "../services/notifications";
import { config } from "../config/env";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum(["caregiver", "employer"]),
  phone: z.string().optional(),
  companyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verificationPayloadSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  purpose: z.literal("verify-email"),
});

function createVerificationUrl(user: { id: number; email: string }) {
  const token = jwt.sign(
    { id: user.id, email: user.email, purpose: "verify-email" },
    config.JWT_SECRET,
    { expiresIn: "24h" },
  );
  const publicApiUrl = config.NODE_ENV === "production"
    ? "https://elite-bridge-shared-api.onrender.com"
    : `http://localhost:${config.PORT}`;
  return `${publicApiUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

router.post("/register", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const data = registerSchema.parse(req.body);

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
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({
      message: "User registered successfully",
      token,
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

    // Administrative email delivery must never hold the new user on the
    // registration spinner. Send it after the account response is complete.
    void sendSignupAlert({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: data.role,
      phone: data.phone,
      companyName: data.companyName,
    });
    void sendEmailVerification({
      email: user.email,
      firstName: user.firstName,
      verificationUrl: createVerificationUrl(user),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    await ensureCoreTables();
    const token = z.string().min(1).parse(req.query.token);
    const payload = verificationPayloadSchema.parse(jwt.verify(token, config.JWT_SECRET));

    await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(and(eq(users.id, payload.id), eq(users.email, payload.email)));

    res.type("html").send("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Email confirmed</title></head><body><main><h1>Email confirmed</h1><p>Your Elite Bridge email has been verified. You may return to the app and sign in.</p></main></body></html>");
  } catch {
    res.status(400).type("html").send("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Link unavailable</title></head><body><main><h1>This link is invalid or expired</h1><p>Please request a new verification email from Elite Bridge support.</p></main></body></html>");
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

    if (!req.user) {
      throw new AppError(401, "User not authenticated");
    }

    const userList = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (userList.length === 0) {
      throw new AppError(404, "User not found");
    }
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
