import { Router } from "express";
import { z } from "zod";
import axios from "axios";
import { createHash, randomBytes, randomUUID } from "crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { caregiverInvitations, caregivers, employers, users } from "../db/schema.js";
import { ensureCoreTables } from "../db/bootstrap.js";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { config } from "../config/env.js";
import { sendEmail, escapeEmailHtml } from "../services/email.js";

const router = Router();

const updateProfileSchema = z.object({
  companyName: z.string().min(2).optional(),
  companyDescription: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  teamSize: z.number().int().positive().optional(),
  servicesOffered: z.array(z.string()).optional(),
});

const invitationSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().max(100).optional(),
    email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
    phone: z.string().trim().min(7).max(20).optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "Enter an email address or phone number",
  });

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const backgroundCheckSchema = z.object({
  caregiverUserId: z.number().int().positive(),
  package: z.string().trim().min(1).default("basic"),
});

async function employerForUser(userId: number) {
  const result = await db.select().from(employers).where(eq(employers.userId, userId)).limit(1);
  if (!result[0]) throw new AppError(404, "Employer profile not found");
  return result[0];
}

router.get("/invitations/:token", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const result = await db
      .select({
        firstName: caregiverInvitations.firstName,
        lastName: caregiverInvitations.lastName,
        email: caregiverInvitations.email,
        phone: caregiverInvitations.phone,
        status: caregiverInvitations.status,
        expiresAt: caregiverInvitations.expiresAt,
        companyName: employers.companyName,
      })
      .from(caregiverInvitations)
      .innerJoin(employers, eq(caregiverInvitations.employerId, employers.id))
      .where(eq(caregiverInvitations.tokenHash, hashToken(req.params.token)))
      .limit(1);
    const invitation = result[0];
    if (!invitation || invitation.status !== "pending" || invitation.expiresAt <= new Date()) {
      throw new AppError(404, "Invitation not found or expired");
    }
    res.json({ invitation });
  } catch (error) {
    next(error);
  }
});

router.get("/invitations", authMiddleware, requireRole("employer", "admin"), async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    const employer = await employerForUser(req.user!.id);
    const invitations = await db
      .select({
        id: caregiverInvitations.id,
        firstName: caregiverInvitations.firstName,
        lastName: caregiverInvitations.lastName,
        email: caregiverInvitations.email,
        phone: caregiverInvitations.phone,
        status: caregiverInvitations.status,
        expiresAt: caregiverInvitations.expiresAt,
        createdAt: caregiverInvitations.createdAt,
        acceptedAt: caregiverInvitations.acceptedAt,
      })
      .from(caregiverInvitations)
      .where(eq(caregiverInvitations.employerId, employer.id))
      .orderBy(desc(caregiverInvitations.createdAt));
    res.json({ invitations });
  } catch (error) {
    next(error);
  }
});

router.post("/invitations", authMiddleware, requireRole("employer", "admin"), async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    const data = invitationSchema.parse(req.body);
    const employer = await employerForUser(req.user!.id);
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inserted = await db
      .insert(caregiverInvitations)
      .values({
        employerId: employer.id,
        tokenHash: hashToken(token),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        expiresAt,
      })
      .returning({ id: caregiverInvitations.id });
    const inviteUrl = `${config.WEB_APP_URL.replace(/\/$/, "")}/signup?role=caregiver&invite=${encodeURIComponent(token)}`;
    let emailSent = false;
    if (data.email) {
      try {
        emailSent = await sendEmail({
          to: data.email,
          subject: `${employer.companyName} invited you to Elite Care`,
          text: `${employer.companyName} invited you to join their care team on Elite Care. Accept within 7 days: ${inviteUrl}`,
          html: `<p>Hello ${escapeEmailHtml(data.firstName)},</p><p><strong>${escapeEmailHtml(employer.companyName)}</strong> invited you to join their care team on Elite Care.</p><p><a href="${escapeEmailHtml(inviteUrl)}">Accept caregiver invitation</a></p><p>This secure invitation expires in 7 days.</p>`,
        });
      } catch {
        console.error("Invitation email could not be delivered; check the email provider log");
      }
    }
    res.status(201).json({
      invitation: { id: inserted[0].id, status: "pending", expiresAt },
      inviteUrl,
      emailSent,
    });
  } catch (error) {
    next(error);
  }
});

function mapEmployerProfile(employer: any, user: any) {
  return {
    id: employer.id,
    userId: employer.userId,
    companyName: employer.companyName,
    companyDescription: employer.companyDescription ?? "",
    website: employer.website ?? "",
    industry: employer.industry ?? "",
    teamSize: employer.teamSize ?? null,
    servicesOffered: employer.serviceArea ?? [],
    billingAddress: employer.billingAddress ?? {},
    verificationStatus: employer.verificationStatus,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
  };
}

router.get("/me", authMiddleware, requireRole("employer", "admin"), async (req: AuthRequest, res, next) => {
  try {
    const employer = await employerForUser(req.user!.id);
    const user = (await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1))[0];
    if (!user) throw new AppError(404, "Employer account not found");
    res.json({ profile: mapEmployerProfile(employer, user) });
  } catch (error) { next(error); }
});

router.put("/me", authMiddleware, requireRole("employer", "admin"), async (req: AuthRequest, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    if (data.phone !== undefined) {
      await db.update(users).set({ phone: data.phone, updatedAt: new Date() }).where(eq(users.id, req.user!.id));
    }
    const employerData: any = { updatedAt: new Date() };
    if (data.companyName !== undefined) employerData.companyName = data.companyName;
    if (data.companyDescription !== undefined) employerData.companyDescription = data.companyDescription;
    if (data.website !== undefined) employerData.website = data.website;
    if (data.industry !== undefined) employerData.industry = data.industry;
    if (data.teamSize !== undefined) employerData.teamSize = data.teamSize;
    if (data.servicesOffered !== undefined) employerData.serviceArea = data.servicesOffered;
    if (data.address !== undefined || data.city !== undefined || data.state !== undefined || data.zipCode !== undefined) {
      employerData.billingAddress = { address: data.address ?? "", city: data.city ?? "", state: data.state ?? "", zipCode: data.zipCode ?? "" };
    }
    await db.update(employers).set(employerData).where(eq(employers.userId, req.user!.id));
    const employer = await employerForUser(req.user!.id);
    const user = (await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1))[0];
    res.json({ profile: mapEmployerProfile(employer, user) });
  } catch (error) { next(error); }
});

router.post("/background-checks", authMiddleware, requireRole("employer", "admin"), async (req: AuthRequest, res, next) => {
  try {
    const employer = await employerForUser(req.user!.id);
    const data = backgroundCheckSchema.parse(req.body);
    const linked = await db.execute(sql`
      SELECT 1 FROM employer_caregivers
      WHERE employer_id = ${employer.id} AND caregiver_user_id = ${data.caregiverUserId} AND status = 'active'
      UNION ALL
      SELECT 1 FROM shift_applications sa JOIN shift_posts sp ON sp.id = sa.shift_id
      JOIN caregivers c ON c.id = sa.caregiver_id
      WHERE sp.employer_id = ${employer.id} AND c.user_id = ${data.caregiverUserId} AND sa.status = 'approved'
      LIMIT 1
    `);
    if (!(linked as any).rows.length) throw new AppError(403, "Only caregivers on your team can be screened");
    const caregiver = (await db.select({
      userId: caregivers.userId,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
    }).from(caregivers).innerJoin(users, eq(caregivers.userId, users.id))
      .where(eq(caregivers.userId, data.caregiverUserId)).limit(1))[0];
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
        package: data.package,
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
    if (invitationUrl) {
      await sendEmail({
        to: caregiver.email,
        subject: "Elite Work background check request",
        text: `Complete your background check securely: ${invitationUrl}`,
        html: `<p>Hello ${caregiver.firstName},</p><p>An employer requested a background check for your Elite Care profile.</p><p><a href="${invitationUrl}">Complete background check</a></p>`,
      });
    }
    res.status(201).json({ status: "pending", provider: apiKey ? "Checkr" : "manual", invitationUrl });
  } catch (error) { next(error); }
});

// Get employer profile
router.get("/:id", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const employerId = parseInt(req.params.id);
    if (isNaN(employerId)) {
      throw new AppError(400, "Invalid employer ID");
    }

    if (req.user?.id !== employerId && req.user?.role !== "admin") {
      throw new AppError(403, "Not authorized to view this profile");
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
    if (data.companyName) employerData.companyName = data.companyName;
    if (data.companyDescription) employerData.companyDescription = data.companyDescription;
    if (data.website) employerData.website = data.website;
    if (data.industry) employerData.industry = data.industry;
    if (data.teamSize) employerData.teamSize = data.teamSize;
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
