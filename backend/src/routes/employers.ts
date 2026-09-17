import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import axios from "axios";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { caregivers, employers, users } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { config } from "../config/env";
import { sendTransactionalEmail } from "../services/notifications";

const router = Router();

const invitationSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.string().trim().email(),
  requestBackgroundCheck: z.boolean().default(false),
});

const backgroundCheckSchema = z.object({
  caregiverUserId: z.number().int().positive(),
  package: z.string().trim().min(1).default("basic"),
});

let invitationTableReady = false;
async function ensureInvitationTable() {
  if (invitationTableReady) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS caregiver_invitations (
      id SERIAL PRIMARY KEY,
      employer_id INTEGER NOT NULL REFERENCES employers(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      token VARCHAR(100) NOT NULL UNIQUE,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      background_check_requested BOOLEAN NOT NULL DEFAULT false,
      background_check_status VARCHAR(30) NOT NULL DEFAULT 'not_requested',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      accepted_at TIMESTAMP
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS caregiver_invitations_employer_idx ON caregiver_invitations(employer_id, created_at DESC)`);
  invitationTableReady = true;
}

async function requireEmployer(userId: number) {
  const rows = await db.select().from(employers).where(eq(employers.userId, userId)).limit(1);
  if (!rows[0]) throw new AppError(404, "Employer profile not found");
  return rows[0];
}

router.get("/invitations", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
    await ensureInvitationTable();
    const employer = await requireEmployer(req.user.id);
    const result = await db.execute(sql`
      SELECT id, email, first_name, last_name, status, background_check_requested,
             background_check_status, created_at, expires_at, accepted_at
      FROM caregiver_invitations
      WHERE employer_id = ${employer.id}
      ORDER BY created_at DESC
    `);
    res.json({ invitations: (result as any).rows });
  } catch (error) { next(error); }
});

router.post("/invitations", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
    const data = invitationSchema.parse(req.body);
    await ensureInvitationTable();
    const employer = await requireEmployer(req.user.id);
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const result = await db.execute(sql`
      INSERT INTO caregiver_invitations
        (employer_id, email, first_name, last_name, token, background_check_requested,
         background_check_status, expires_at)
      VALUES
        (${employer.id}, ${data.email.toLowerCase()}, ${data.firstName}, ${data.lastName}, ${token},
         ${data.requestBackgroundCheck}, ${data.requestBackgroundCheck ? "requested" : "not_requested"}, ${expiresAt})
      RETURNING id, email, first_name, last_name, status, background_check_requested,
                background_check_status, created_at, expires_at
    `);
    const signupBase = config.CAREGIVER_APP_URL || "https://elitebridgestaffing.com/signup.html";
    const separator = signupBase.includes("?") ? "&" : "?";
    const inviteUrl = `${signupBase}${separator}role=caregiver&invite=${encodeURIComponent(token)}`;
    const emailDelivered = await sendTransactionalEmail(
      data.email,
      `${employer.companyName} invited you to Elite Care`,
      [
        `Hi ${data.firstName},`, "",
        `${employer.companyName} invited you to join their care team in Elite Care.`,
        data.requestBackgroundCheck ? "They also requested a background check after you create your profile." : "",
        "", `Accept your invitation: ${inviteUrl}`, "",
        "This invitation expires in 14 days.", "", "Elite Bridge Staffing",
      ].filter(Boolean).join("\n"),
    );
    res.status(201).json({ invitation: (result as any).rows[0], inviteUrl, emailDelivered });
  } catch (error) { next(error); }
});

router.post("/background-checks", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
    await requireEmployer(req.user.id);
    const data = backgroundCheckSchema.parse(req.body);
    const caregiverRows = await db.select({
      id: caregivers.id,
      userId: caregivers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    }).from(caregivers).innerJoin(users, eq(caregivers.userId, users.id))
      .where(eq(caregivers.userId, data.caregiverUserId)).limit(1);
    const caregiver = caregiverRows[0];
    if (!caregiver) throw new AppError(404, "Caregiver not found");

    const apiKey = config.CHECKR_API_KEY || config.CHEKR_API_KEY;
    const apiUrl = config.CHECKR_API_URL || config.CHEKR_API_URL || "https://api.checkr.com/v1";
    let providerId: string | null = null;
    let invitationUrl: string | null = null;
    if (apiKey) {
      const auth = { username: apiKey, password: "" };
      const candidateResponse = await axios.post(`${apiUrl}/candidates`, new URLSearchParams({
        first_name: caregiver.firstName,
        last_name: caregiver.lastName,
        email: caregiver.email,
      }), { auth, timeout: 20_000 });
      providerId = candidateResponse.data.id;
      const checkResponse = await axios.post(`${apiUrl}/invitations`, new URLSearchParams({
        candidate_id: providerId || "",
        package: data.package || config.CHECKR_PACKAGE,
      }), { auth, timeout: 20_000 });
      invitationUrl = checkResponse.data.invitation_url || null;
    }

    await db.update(caregivers).set({
      backgroundCheckStatus: "pending",
      backgroundCheckDate: new Date(),
      backgroundCheckProvider: apiKey ? "Checkr" : "manual",
      backgroundCheckId: providerId || `pending-${randomUUID()}`,
      updatedAt: new Date(),
    }).where(eq(caregivers.userId, data.caregiverUserId));

    await sendTransactionalEmail(
      caregiver.email,
      "Elite Work background check request",
      [
        `Hi ${caregiver.firstName},`, "",
        "An employer requested a background check for your Elite Care profile.",
        invitationUrl ? `Complete it securely here: ${invitationUrl}` : "Our team will contact you with the next secure step.",
        "", "Elite Bridge Staffing",
      ].join("\n"),
    );
    res.status(201).json({ status: "pending", provider: apiKey ? "Checkr" : "manual", invitationUrl });
  } catch (error) { next(error); }
});

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
