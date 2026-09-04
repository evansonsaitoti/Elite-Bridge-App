import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { employers, users } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  companyName: z.string().min(2).optional(),
  companyDescription: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  servicesOffered: z.array(z.string()).optional(),
});

function mapEmployerProfile(employer: any, user: any) {
  return {
    id: employer.id,
    userId: employer.userId ?? employer.user_id,
    companyName: employer.companyName ?? employer.company_name,
    companyDescription: employer.companyDescription ?? employer.company_description ?? "",
    website: employer.website ?? "",
    servicesOffered: employer.serviceArea ?? employer.service_area ?? [],
    billingAddress: employer.billingAddress ?? employer.billing_address ?? {},
    verificationStatus: employer.verificationStatus ?? employer.verification_status,
    firstName: user.firstName ?? user.first_name,
    lastName: user.lastName ?? user.last_name,
    email: user.email,
    phone: user.phone ?? "",
  };
}

// The signed-in employer's own organization profile. Keeping this route explicit
// avoids asking the mobile client to discover internal employer IDs.
router.get("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
    const employerList = await db.select().from(employers).where(eq(employers.userId, req.user.id)).limit(1);
    const userList = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    if (!employerList[0] || !userList[0]) throw new AppError(404, "Employer profile not found");
    res.json({ profile: mapEmployerProfile(employerList[0], userList[0]) });
  } catch (error) { next(error); }
});

router.put("/me", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
    const data = updateProfileSchema.parse(req.body);
    const userUpdate: any = { updatedAt: new Date() };
    if (data.firstName !== undefined) userUpdate.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdate.lastName = data.lastName;
    if (data.phone !== undefined) userUpdate.phone = data.phone;
    await db.update(users).set(userUpdate).where(eq(users.id, req.user.id));

    const employerUpdate: any = { updatedAt: new Date() };
    if (data.companyName !== undefined) employerUpdate.companyName = data.companyName;
    if (data.companyDescription !== undefined) employerUpdate.companyDescription = data.companyDescription;
    if (data.website !== undefined) employerUpdate.website = data.website;
    if (data.servicesOffered !== undefined) employerUpdate.serviceArea = data.servicesOffered;
    if (data.address !== undefined || data.city !== undefined || data.state !== undefined || data.zipCode !== undefined) {
      employerUpdate.billingAddress = { address: data.address || "", city: data.city || "", state: data.state || "", zipCode: data.zipCode || "" };
    }
    await db.update(employers).set(employerUpdate).where(eq(employers.userId, req.user.id));

    const employerList = await db.select().from(employers).where(eq(employers.userId, req.user.id)).limit(1);
    const userList = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
    res.json({ profile: mapEmployerProfile(employerList[0], userList[0]) });
  } catch (error) { next(error); }
});

// Get employer profile
router.get("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const employerId = parseInt(req.params.id);
    if (isNaN(employerId)) {
      throw new AppError(400, "Invalid employer ID");
    }

    const employerList = await db
      .select()
      .from(employers)
      .where(eq(employers.userId, employerId))
      .limit(1);

    if (employerList.length === 0) {
      throw new AppError(404, "Employer profile not found");
    }

    const userList = await db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(eq(users.id, employerId))
      .limit(1);

    res.json({
      ...employerList[0],
      user: userList[0],
    });
  } catch (error) {
    next(error);
  }
});

// Update employer profile
router.put("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw new AppError(400, "Invalid user ID");
    }

    if (req.user?.id !== userId && req.user?.role !== "admin") {
      throw new AppError(403, "Not authorized to update this profile");
    }

    const data = updateProfileSchema.parse(req.body);

    // Update user table for phone
    if (data.phone) {
      await db
        .update(users)
        .set({ phone: data.phone })
        .where(eq(users.id, userId));
    }

    // Prepare employer update data
    const employerData: any = {};
    if (data.companyDescription) employerData.companyDescription = data.companyDescription;
    if (data.website) employerData.website = data.website;
    if (data.servicesOffered) employerData.serviceArea = data.servicesOffered;
    
    if (data.address || data.city || data.state || data.zipCode) {
      employerData.billingAddress = {
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
      };
    }

    // Update employer table
    if (Object.keys(employerData).length > 0) {
      const employerList = await db
        .select()
        .from(employers)
        .where(eq(employers.userId, userId))
        .limit(1);

      if (employerList.length === 0) {
        throw new AppError(404, "Employer profile not found");
      }

      await db
        .update(employers)
        .set({
          ...employerData,
          updatedAt: new Date(),
        })
        .where(eq(employers.userId, userId));
    }

    res.json({ message: "Profile updated successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
