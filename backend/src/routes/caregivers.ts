import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { caregivers, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  hourlyRate: z.number().min(0),
  yearsExperience: z.number().min(0).optional(),
  specialties: z.array(z.string()).min(1),
  certifications: z.array(z.string()).optional(),
});

// List all caregivers (for employer discovery)
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const allCaregivers = await db
      .select({
        id: caregivers.id,
        userId: caregivers.userId,
        bio: caregivers.bio,
        hourlyRate: caregivers.hourlyRate,
        specialties: caregivers.specialties,
        certifications: caregivers.certifications,
        yearsExperience: caregivers.yearsExperience,
        rating: caregivers.rating,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImage: users.profileImage,
      })
      .from(caregivers)
      .innerJoin(users, eq(caregivers.userId, users.id));

    res.json({ caregivers: allCaregivers });
  } catch (error) {
    next(error);
  }
});

// Update caregiver profile
router.put("/:userId", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      throw new AppError(400, "Invalid user ID");
    }

    if (req.user?.role !== "admin" && req.user?.id !== userId) {
      throw new AppError(403, "Not authorized to update this profile");
    }

    const data = updateProfileSchema.parse(req.body);

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      throw new AppError(404, "User not found");
    }
    if (user[0].role !== "caregiver") {
      throw new AppError(400, "User is not a caregiver");
    }

    const existingProfile = await db
      .select()
      .from(caregivers)
      .where(eq(caregivers.userId, userId))
      .limit(1);

    if (existingProfile.length > 0) {
      await db
        .update(caregivers)
        .set({
          bio: data.bio,
          hourlyRate: data.hourlyRate.toString(),
          yearsExperience: data.yearsExperience,
          specialties: data.specialties,
          certifications: data.certifications,
          updatedAt: new Date(),
        })
        .where(eq(caregivers.userId, userId));
    } else {
      await db.insert(caregivers).values({
        userId: userId,
        bio: data.bio,
        hourlyRate: data.hourlyRate.toString(),
        yearsExperience: data.yearsExperience,
        specialties: data.specialties,
        certifications: data.certifications,
      });
    }

    await db
      .update(users)
      .set({ verificationStatus: "pending", updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({ message: "Caregiver profile updated successfully" });
  } catch (error) {
    next(error);
  }
});

// Get caregiver profile
router.get("/:userId", authMiddleware, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      throw new AppError(400, "Invalid user ID");
    }

    const profile = await db
      .select({
        id: caregivers.id,
        userId: caregivers.userId,
        bio: caregivers.bio,
        hourlyRate: caregivers.hourlyRate,
        specialties: caregivers.specialties,
        certifications: caregivers.certifications,
        yearsExperience: caregivers.yearsExperience,
        rating: caregivers.rating,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImage: users.profileImage,
        email: users.email,
        phone: users.phone
      })
      .from(caregivers)
      .innerJoin(users, eq(caregivers.userId, users.id))
      .where(eq(caregivers.userId, userId))
      .limit(1);

    if (profile.length === 0) {
      throw new AppError(404, "Caregiver profile not found");
    }

    res.json({ profile: profile[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
