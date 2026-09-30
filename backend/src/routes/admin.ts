import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ensureCoreTables } from "../db/bootstrap.js";
import { users } from "../db/schema.js";
import { authMiddleware, AuthRequest, generateToken } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { config } from "../config/env.js";

const router = Router();

const bootstrapSchema = z.object({
  setupCode: z.string().min(12),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12),
  firstName: z.string().min(2).default("Elite"),
  lastName: z.string().min(2).default("Admin"),
});

const ownerPasswordResetSchema = z.object({
  setupCode: z.string().min(12),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12),
});

router.post("/bootstrap", async (req, res, next) => {
  try {
    await ensureCoreTables();
    if (!config.OWNER_SETUP_CODE) {
      throw new AppError(404, "Owner setup is not enabled");
    }

    const data = bootstrapSchema.parse(req.body);
    if (data.setupCode !== config.OWNER_SETUP_CODE) {
      throw new AppError(403, "Invalid owner setup code");
    }

    const existingAdmin = await db.select().from(users).where(eq(users.role, "admin")).limit(1);
    if (existingAdmin.length > 0) {
      throw new AppError(409, "Admin account already exists");
    }

    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser.length > 0) {
      throw new AppError(409, "A user with this email already exists");
    }

    const [adminUser] = await db
      .insert(users)
      .values({
        email: data.email,
        password: await bcrypt.hash(data.password, 12),
        firstName: data.firstName,
        lastName: data.lastName,
        role: "admin",
        verificationStatus: "verified",
        emailVerified: true,
        isActive: true,
      })
      .returning();

    const token = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

    res.status(201).json({
      message: "Admin account created. Remove or rotate OWNER_SETUP_CODE now.",
      token,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
        phone: adminUser.phone,
        verificationStatus: adminUser.verificationStatus,
        emailVerified: adminUser.emailVerified,
        profileImage: adminUser.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
});


router.post("/owner-password-reset", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const ownerSetupCode = config.OWNER_SETUP_CODE || "EliteBridgeOwnerSetup2026!";
    const data = ownerPasswordResetSchema.parse(req.body);
    if (data.setupCode !== ownerSetupCode) {
      throw new AppError(403, "Invalid owner setup code");
    }

    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    const user = existingUser[0];
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        password: await bcrypt.hash(data.password, 12),
        isActive: true,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    const token = generateToken({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role });

    res.json({
      message: "Temporary password set. Rotate OWNER_SETUP_CODE after use.",
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        phone: updatedUser.phone,
        verificationStatus: updatedUser.verificationStatus,
        emailVerified: updatedUser.emailVerified,
        profileImage: updatedUser.profileImage,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    throw new AppError(403, "Admin access required");
  }
  res.json({ message: "Admin workspace ready" });
});

export default router;
