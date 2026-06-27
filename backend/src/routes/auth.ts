import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
import { users, employers } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateToken, AuthRequest, authMiddleware } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

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

export default router;
