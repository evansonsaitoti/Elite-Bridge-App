import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { ensureCoreTables } from "../db/bootstrap";
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

const matchingProfileSchema = z.object({
  availability: z.array(z.string()).min(1),
  preferredServices: z.array(z.string()).min(1),
  maxDistanceMiles: z.number().positive().max(250),
  instantOffers: z.boolean(),
});

const selfProfileSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(2000).optional(),
  hourlyRate: z.number().min(0).max(500).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  specialties: z.array(z.string().trim().min(1)).max(30).optional(),
  certifications: z.array(z.string().trim().min(1)).max(30).optional(),
});

router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user || req.user.role !== "caregiver") throw new AppError(403, "Caregiver access required");
    const profile = await db.select({
      id: caregivers.id, userId: caregivers.userId, bio: caregivers.bio, hourlyRate: caregivers.hourlyRate,
      specialties: caregivers.specialties, certifications: caregivers.certifications, yearsExperience: caregivers.yearsExperience,
      rating: caregivers.rating, firstName: users.firstName, lastName: users.lastName, email: users.email, phone: users.phone,
      verificationStatus: users.verificationStatus, emailVerified: users.emailVerified,
    }).from(caregivers).innerJoin(users, eq(caregivers.userId, users.id)).where(eq(caregivers.userId, req.user.id)).limit(1);
    if (!profile[0]) throw new AppError(404, "Caregiver profile not found");
    res.json({ profile: profile[0] });
  } catch (error) { next(error); }
});

router.put("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    if (!req.user || req.user.role !== "caregiver") throw new AppError(403, "Caregiver access required");
    const data = selfProfileSchema.parse(req.body || {});
    if (data.phone !== undefined) await db.update(users).set({ phone: data.phone, updatedAt: new Date() }).where(eq(users.id, req.user.id));
    const existing = await db.select().from(caregivers).where(eq(caregivers.userId, req.user.id)).limit(1);
    const values = { bio: data.bio, hourlyRate: data.hourlyRate === undefined ? undefined : data.hourlyRate.toString(), yearsExperience: data.yearsExperience, specialties: data.specialties, certifications: data.certifications, updatedAt: new Date() };
    if (existing[0]) await db.update(caregivers).set(values).where(eq(caregivers.userId, req.user.id));
    else await db.insert(caregivers).values({ userId: req.user.id, hourlyRate: String(data.hourlyRate || 0), specialties: data.specialties || [], certifications: data.certifications || [], bio: data.bio, yearsExperience: data.yearsExperience });
    const refreshed = await db.select({
      id: caregivers.id, userId: caregivers.userId, bio: caregivers.bio, hourlyRate: caregivers.hourlyRate,
      specialties: caregivers.specialties, certifications: caregivers.certifications, yearsExperience: caregivers.yearsExperience,
      rating: caregivers.rating, firstName: users.firstName, lastName: users.lastName, email: users.email, phone: users.phone,
      verificationStatus: users.verificationStatus, emailVerified: users.emailVerified,
    }).from(caregivers).innerJoin(users, eq(caregivers.userId, users.id)).where(eq(caregivers.userId, req.user.id)).limit(1);
    res.json({ profile: refreshed[0] });
  } catch (error) { next(error); }
});

router.put("/me/matching", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "caregiver") throw new AppError(403, "Caregiver access required");
    const data = matchingProfileSchema.parse(req.body);
    const existing = await db.select().from(caregivers).where(eq(caregivers.userId, req.user.id)).limit(1);
    const availability = { windows: data.availability, maxDistanceMiles: [String(data.maxDistanceMiles)], instantOffers: [String(data.instantOffers)] };
    if (existing[0]) {
      await db.update(caregivers).set({ specialties: data.preferredServices, availability, isAvailable: true, updatedAt: new Date() }).where(eq(caregivers.userId, req.user.id));
    } else {
      await db.insert(caregivers).values({ userId: req.user.id, hourlyRate: "0", specialties: data.preferredServices, certifications: [], availability, isAvailable: true });
    }
    res.json({ message: "Matching profile updated" });
  } catch (error) { next(error); }
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
