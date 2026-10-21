import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { caregivers, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { ensureCoreTables } from "../db/bootstrap";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const updateProfileSchema = z.object({
  bio: z.string().optional(),
  hourlyRate: z.number().min(0),
  yearsExperience: z.number().min(0).optional(),
  specialties: z.array(z.string()).min(1),
  certifications: z.array(z.string()).optional(),
  availability: z.record(z.array(z.string())).optional(),
});

const matchingProfileSchema = z.object({
  availability: z.array(z.string()).min(1),
  preferredServices: z.array(z.string()).min(1),
  maxDistanceMiles: z.number().positive().max(250),
  instantOffers: z.boolean(),
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

// Personal contact information is private to the signed-in caregiver.
// The user phone syncs with Elite Work's shared user record; private service-area
// and emergency-contact notes are not exposed in generic agency listing payloads.
async function ensureCaregiverDetailsTable() {
  await ensureCoreTables();
  await db.execute(sql`CREATE TABLE IF NOT EXISTS caregiver_personal_details (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    service_area TEXT NOT NULL DEFAULT '',
    emergency_contact TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}
const detailsSchema = z.object({
  phone: z.string().trim().max(20),
  address: z.string().trim().max(200),
  emergencyContact: z.string().trim().max(200),
}).strict();

router.get("/me/details", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "caregiver") throw new AppError(403, "Caregiver access required");
    await ensureCaregiverDetailsTable();
    const result = await db.execute(sql`
      SELECT u.phone, d.service_area, d.emergency_contact
      FROM users u LEFT JOIN caregiver_personal_details d ON d.user_id = u.id
      WHERE u.id = ${req.user.id}
    `);
    const item = (result as any).rows[0];
    if (!item) throw new AppError(404, "Account not found");
    res.setHeader("Cache-Control", "no-store");
    res.json({ details: {
      phone: item.phone || "", address: item.service_area || "",
      emergencyContact: item.emergency_contact || "",
    } });
  } catch (error) { next(error); }
});

router.put("/me/details", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "caregiver") throw new AppError(403, "Caregiver access required");
    const values = detailsSchema.parse(req.body);
    await ensureCaregiverDetailsTable();
    await db.transaction(async (tx) => {
      const updated = await tx.execute(sql`UPDATE users SET phone = ${values.phone || null},
        updated_at = CURRENT_TIMESTAMP WHERE id = ${req.user!.id} RETURNING id`);
      if (!(updated as any).rows.length) throw new AppError(404, "Account not found");
      await tx.execute(sql`INSERT INTO caregiver_personal_details (user_id, service_area, emergency_contact)
        VALUES (${req.user!.id}, ${values.address}, ${values.emergencyContact})
        ON CONFLICT (user_id) DO UPDATE SET service_area = EXCLUDED.service_area,
          emergency_contact = EXCLUDED.emergency_contact, updated_at = CURRENT_TIMESTAMP`);
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({ details: values, saved: true });
  } catch (error) { next(error); }
});

// Caregiver-owned profile photo, exposed via the existing caregiver profile reads in Elite Work.
// Limit payload size to keep database and employer record responses bounded.
router.get("/me/photo", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "caregiver") throw new AppError(403, "Caregiver access required");
    const result = await db.select({ profileImage: users.profileImage }).from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!result.length) throw new AppError(404, "Account not found");
    res.json({ photo: result[0].profileImage || null });
  } catch (error) { next(error); }
});

router.put("/me/photo", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "caregiver") throw new AppError(403, "Caregiver access required");
    const { photo } = z.object({
      photo: z.string().max(600000).regex(/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/),
    }).parse(req.body);
    // The data URI stores an explicitly selected, compressed image; no device library access is granted to the server.
    const changed = await db.update(users).set({ profileImage: photo, updatedAt: new Date() }).where(eq(users.id, req.user.id)).returning({ id: users.id });
    if (!changed.length) throw new AppError(404, "Account not found");
    res.json({ saved: true });
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
        backgroundCheckStatus: caregivers.backgroundCheckStatus,
        backgroundCheckDate: caregivers.backgroundCheckDate,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
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
          availability: data.availability,
          isAvailable: data.availability ? true : undefined,
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
        availability: data.availability,
        isAvailable: data.availability ? true : undefined,
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
        availability: caregivers.availability,
        yearsExperience: caregivers.yearsExperience,
        rating: caregivers.rating,
        backgroundCheckStatus: caregivers.backgroundCheckStatus,
        backgroundCheckDate: caregivers.backgroundCheckDate,
        backgroundCheckProvider: caregivers.backgroundCheckProvider,
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
