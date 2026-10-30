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
import { sendSms, smsReady } from "../services/sms.js";
import { getEmployerMembership, employerForUser, requireOrganizationRole } from "../services/employerMemberships.js";

const router = Router();

const updateProfileSchema = z.object({
  companyName: z.string().min(2).optional(),
  companyLogo: z.string().max(350_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).nullable().optional(),
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

const webAppUrl = () => config.WEB_APP_URL.replace(/\/$/, "");

function buildCaregiverInviteUrl(token: string) {
  return `${webAppUrl()}/signup?role=caregiver&invite=${encodeURIComponent(token)}`;
}

function buildTeamInviteUrl(token: string) {
  return `${webAppUrl()}/signup?role=employer&teamInvite=${encodeURIComponent(token)}`;
}

// Apple App Store Connect ID from elitebridge-mobile/eas.json (iOS caregiver app).
// A direct Apple listing may not be publicly released in every country yet.
const CAREGIVER_IOS_STORE_URL = "https://apps.apple.com/us/app/id6770962152";
const CAREGIVER_ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=com.elitebridgestaffing.caregiver";
function appDownloadLinks() {
  return {
    caregiver: config.CAREGIVER_APP_URL || CAREGIVER_IOS_STORE_URL,
    ios: config.CAREGIVER_APP_URL || CAREGIVER_IOS_STORE_URL,
    android: CAREGIVER_ANDROID_STORE_URL,
    employer: config.EMPLOYER_APP_URL || webAppUrl(),
  };
}

const backgroundCheckSchema = z.object({
  caregiverUserId: z.number().int().positive(),
  package: z.string().trim().min(1).default("basic"),
});

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

router.get("/team-invitations/:token", async (req, res, next) => {
  try {
    await ensureCoreTables();
    const result = await (db as any).$client.query(
      "SELECT i.email, i.role, i.expires_at, e.company_name FROM employer_team_invitations i JOIN employers e ON e.id=i.employer_id WHERE i.token_hash=$1 AND i.status='pending' AND i.expires_at>NOW() LIMIT 1",
      [hashToken(req.params.token)]
    );
    const invitation = result.rows[0];
    if (!invitation) throw new AppError(404, "Organization invitation not found or expired.");
    res.json({ invitation: { email: invitation.email, role: invitation.role, expiresAt: invitation.expires_at, companyName: invitation.company_name } });
  } catch (error) { next(error); }
});

const teamInvitationSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["admin", "scheduler", "billing", "viewer"]),
});

router.get("/team", authMiddleware, requireRole("employer"), async (req: AuthRequest, res, next) => {
  try {
    const membership = await getEmployerMembership(req.user!.id);
    if (!membership) throw new AppError(403, "You do not belong to an employer organization.");
    const canManage = ["owner", "admin"].includes(membership.role);
    const result = canManage
      ? await (db as any).$client.query(
          "SELECT m.id, m.role, m.created_at, u.id AS user_id, u.email, u.first_name, u.last_name FROM employer_memberships m JOIN users u ON u.id=m.user_id WHERE m.employer_id=$1 ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.first_name",
          [membership.employer.id]
        )
      : await (db as any).$client.query(
          "SELECT m.id, m.role, m.created_at, u.id AS user_id, u.email, u.first_name, u.last_name FROM employer_memberships m JOIN users u ON u.id=m.user_id WHERE m.employer_id=$1 AND m.user_id=$2",
          [membership.employer.id, req.user!.id]
        );
    const pending = canManage
      ? await (db as any).$client.query(
          "SELECT id, email, role, expires_at, created_at FROM employer_team_invitations WHERE employer_id=$1 AND status='pending' AND expires_at>NOW() ORDER BY created_at DESC",
          [membership.employer.id]
        )
      : { rows: [] };
    res.json({ members: result.rows, invitations: pending.rows, yourRole: membership.role });
  } catch (error) { next(error); }
});

router.post("/team/invitations", authMiddleware, requireRole("employer"), async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    const membership = await requireOrganizationRole(req.user!.id, "owner", "admin");
    const data = teamInvitationSchema.parse(req.body);
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser[0]) {
      const account = (await db.select({ role: users.role }).from(users).where(eq(users.id, existingUser[0].id)).limit(1))[0];
      if (account?.role !== "employer") throw new AppError(409, "This email is already registered as a caregiver account.");
      const existingMembership = await getEmployerMembership(existingUser[0].id);
      if (existingMembership) throw new AppError(409, existingMembership.employer.id === membership.employer.id ? "This user already belongs to your organization." : "This user already belongs to another organization.");
    }
    if (membership.role === "admin" && data.role === "admin") throw new AppError(403, "Only the owner can assign the admin role.");
    await (db as any).$client.query(
      "UPDATE employer_team_invitations SET status='revoked' WHERE employer_id=$1 AND email=$2 AND status='pending'",
      [membership.employer.id, data.email]
    );
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inserted = await (db as any).$client.query(
      "INSERT INTO employer_team_invitations (employer_id,email,role,token_hash,invited_by,expires_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [membership.employer.id, data.email, data.role, hashToken(token), req.user!.id, expiresAt]
    );
    const invitationUrl = existingUser[0]
      ? `${webAppUrl()}/dashboard?teamInvite=${encodeURIComponent(token)}`
      : buildTeamInviteUrl(token);
    const safeName = escapeEmailHtml(membership.employer.companyName);
    const safeUrl = escapeEmailHtml(invitationUrl);
    const emailSent = await sendEmail({
      to: data.email,
      subject: `Join ${membership.employer.companyName} on Elite Bridge`,
      text: `${membership.employer.companyName} invited you to join its Elite Bridge organization as ${data.role}. Accept within 7 days: ${invitationUrl}`,
      html: `<p><strong>${safeName}</strong> invited you to join its Elite Bridge workspace as <strong>${data.role}</strong>.</p><p><a href="${safeUrl}">Accept your organization invitation</a></p><p>This invitation expires in 7 days. If you already have an account, sign in and accept the invitation from the invite page.</p>`,
    });
    res.status(201).json({ invitation: { id: inserted.rows[0].id, email: data.email, role: data.role, expiresAt }, invitationUrl, emailSent });
  } catch (error) { next(error); }
});

router.delete("/team/invitations/:invitationId", authMiddleware, requireRole("employer"), async (req: AuthRequest, res, next) => {
  try {
    const membership = await requireOrganizationRole(req.user!.id, "owner", "admin");
    const id = z.coerce.number().int().positive().parse(req.params.invitationId);
    const result = await (db as any).$client.query(
      "UPDATE employer_team_invitations SET status='revoked' WHERE id=$1 AND employer_id=$2 AND status='pending' RETURNING id",
      [id, membership.employer.id]
    );
    if (!result.rowCount) throw new AppError(404, "Pending invitation not found.");
    res.json({ message: "Organization invitation cancelled." });
  } catch (error) { next(error); }
});

router.patch("/team/:membershipId", authMiddleware, requireRole("employer"), async (req: AuthRequest, res, next) => {
  try {
    const membership = await requireOrganizationRole(req.user!.id, "owner", "admin");
    const data = z.object({ role: z.enum(["admin", "scheduler", "billing", "viewer"]) }).parse(req.body);
    const id = z.coerce.number().int().positive().parse(req.params.membershipId);
    const target = await (db as any).$client.query("SELECT id, role, user_id FROM employer_memberships WHERE id=$1 AND employer_id=$2 LIMIT 1", [id, membership.employer.id]);
    if (!target.rows[0]) throw new AppError(404, "Organization member not found.");
    if (target.rows[0].role === "owner") throw new AppError(403, "The organization owner role cannot be changed here.");
    if (membership.role !== "owner" && data.role === "admin") throw new AppError(403, "Only the owner can assign the admin role.");
    if (membership.role === "admin" && target.rows[0].role === "admin") throw new AppError(403, "Only the owner can change an admin's access.");
    await (db as any).$client.query("UPDATE employer_memberships SET role=$1, updated_at=NOW() WHERE id=$2", [data.role, id]);
    res.json({ message: "Organization role updated.", role: data.role });
  } catch (error) { next(error); }
});

router.delete("/team/:membershipId", authMiddleware, requireRole("employer"), async (req: AuthRequest, res, next) => {
  try {
    const membership = await requireOrganizationRole(req.user!.id, "owner", "admin");
    const id = z.coerce.number().int().positive().parse(req.params.membershipId);
    const target = await (db as any).$client.query("SELECT id, role FROM employer_memberships WHERE id=$1 AND employer_id=$2 LIMIT 1", [id, membership.employer.id]);
    if (!target.rows[0]) throw new AppError(404, "Organization member not found.");
    if (target.rows[0].role === "owner") throw new AppError(403, "The organization owner cannot be removed.");
    if (membership.role === "admin" && target.rows[0].role === "admin") throw new AppError(403, "Only the owner can remove an admin.");
    await (db as any).$client.query("DELETE FROM employer_memberships WHERE id=$1", [id]);
    res.json({ message: "Organization access removed." });
  } catch (error) { next(error); }
});

router.post("/team-invitations/accept", authMiddleware, requireRole("employer"), async (req: AuthRequest, res, next) => {
  try {
    await ensureCoreTables();
    const { token } = z.object({ token: z.string().min(20) }).parse(req.body);
    const matches = await (db as any).$client.query(
      "SELECT * FROM employer_team_invitations WHERE token_hash=$1 AND status='pending' AND expires_at>NOW() LIMIT 1",
      [hashToken(token)]
    );
    const invite = matches.rows[0];
    if (!invite || invite.email.toLowerCase() !== req.user!.email.toLowerCase()) throw new AppError(403, "This invitation is invalid, expired, or addressed to another account.");
    if (await getEmployerMembership(req.user!.id)) throw new AppError(409, "This account already belongs to an employer organization.");
    await (db as any).$client.query("INSERT INTO employer_memberships (employer_id,user_id,role) VALUES ($1,$2,$3)", [invite.employer_id, req.user!.id, invite.role]);
    await (db as any).$client.query("UPDATE employer_team_invitations SET status='accepted', accepted_at=NOW() WHERE id=$1", [invite.id]);
    res.json({ message: "You joined the organization.", role: invite.role });
  } catch (error) { next(error); }
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
    const inviteUrl = buildCaregiverInviteUrl(token);
    const appLinks = appDownloadLinks();
    let emailSent = false;
    let smsSent = false;
    if (data.email) {
      try {
        const displayName = escapeEmailHtml(data.firstName);
        const displayAgency = escapeEmailHtml(employer.companyName);
        const signupUrl = escapeEmailHtml(inviteUrl);
        const iosUrl = escapeEmailHtml(appLinks.ios);
        const androidUrl = escapeEmailHtml(appLinks.android);
        emailSent = await sendEmail({
          to: data.email,
          subject: `${employer.companyName} invited you to Elite Bridge`,
          text: [
            `Hello ${data.firstName},`,
            "",
            `${employer.companyName} invited you to join their care team on Elite Bridge.`,
            "Step 1: Accept the secure invitation and create your caregiver account:",
            inviteUrl,
            "",
            "Step 2: Install the caregiver app, then sign in with the same email and password.",
            "iPhone / App Store: " + appLinks.ios,
            "Android / Google Play: " + appLinks.android,
            "",
            "Your invitation expires in 7 days. If your iOS store listing is not yet available, you can still finish registration in your browser.",
          ].join("\n"),
          html: [
            '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
            '<body style="margin:0;padding:0;background:#f3f7f4;font-family:Arial,Helvetica,sans-serif;color:#173b29;">',
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f3f7f4;border-collapse:collapse;"><tr><td align="center" style="padding:22px 10px 30px;">',
            '<table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:580px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e0eae3;">',
            // Host the real Elite Bridge logo on the existing production web app.
            '<tr><td align="center" style="background:#ffffff;padding:24px 24px 17px;border-top:5px solid #c39a42;">',
            '<img src="https://app.elitebridgestaffing.com/logo.png" alt="Elite Bridge Staffing — Staffing you can rely on" width="220" style="display:block;width:220px;max-width:90%;height:auto;border:0;outline:none;text-decoration:none;" />',
            '<div style="font-size:11px;font-weight:bold;letter-spacing:2.4px;color:#a37b2c;margin-top:17px;">CAREGIVER INVITATION</div>',
            '</td></tr>',
            '<tr><td style="padding:8px 32px 27px;">',
            `<p style="margin:10px 0 14px;font-size:15px;line-height:1.55;color:#456354;">Hello ${displayName},</p>`,
            '<h1 style="font-size:28px;line-height:1.17;letter-spacing:-0.6px;color:#0b4028;margin:0 0 16px;font-weight:800;">Your care team is ready to welcome you.</h1>',
            `<p style="font-size:15px;line-height:1.65;color:#4a6254;margin:0 0 22px;"><strong style="color:#0b4028;">${displayAgency}</strong> invited you to join their team on Elite Care. Set up your secure account in a few minutes, then access your shifts and schedule.</p>`,
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#f5f9f6;border:1px solid #dfebe3;border-radius:12px;">',
            '<tr><td style="padding:20px 20px 22px;">',
            '<p style="font-size:11px;font-weight:800;letter-spacing:1.6px;color:#956d23;margin:0 0 9px;">STEP 01 / GET STARTED</p>',
            '<h2 style="font-size:18px;line-height:1.3;color:#0b4028;margin:0 0 7px;">Create your caregiver account</h2>',
            '<p style="font-size:13px;line-height:1.6;color:#536c5c;margin:0 0 18px;">Confirm your details and choose a password. You can complete your profile later.</p>',
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;"><tr><td align="center" bgcolor="#0b492e" style="background:#0b492e;border-radius:9px;padding:0;">',
            `<a href="${signupUrl}" style="display:block;padding:16px 13px;border-radius:9px;color:#ffffff;text-decoration:none;font-size:15px;line-height:1.25;font-weight:800;text-align:center;">Accept invitation &rarr;</a>`,
            '</td></tr></table>',
            '<p style="font-size:12px;line-height:1.5;color:#607166;margin:12px 0 0;text-align:center;">Your secure invitation is valid for 7 days.</p>',
            '</td></tr></table>',
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:25px;">',
            '<tr><td><p style="font-size:11px;font-weight:800;letter-spacing:1.6px;color:#956d23;margin:0 0 8px;">STEP 02 / YOUR MOBILE APP</p>',
            '<h2 style="font-size:18px;line-height:1.3;color:#0b4028;margin:0 0 8px;">Take Elite Care with you</h2>',
            '<p style="font-size:13px;line-height:1.6;color:#536c5c;margin:0 0 16px;">Once registered, download the app and sign in with the same email and password.</p></td></tr></table>',
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;"><tr>',
            '<td align="center" width="50%" style="width:50%;padding:0 5px 0 0;vertical-align:middle;">',
            `<a href="${iosUrl}" aria-label="Download Elite Care on the App Store" style="display:inline-block;text-decoration:none;">`,
            '<img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="163" style="display:block;width:163px;max-width:100%;height:auto;border:0;" />',
            '</a></td>',
            '<td align="center" width="50%" style="width:50%;padding:0 0 0 5px;vertical-align:middle;">',
            `<a href="${androidUrl}" aria-label="Get Elite Care on Google Play" style="display:inline-block;text-decoration:none;">`,
            '<img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" width="177" style="display:block;width:177px;max-width:100%;height:auto;border:0;" />',
            '</a></td></tr></table>',
            `<p style="font-size:12px;line-height:1.55;color:#65786d;margin:15px 0 0;text-align:center;">Store badges not visible? <a href="${iosUrl}" style="color:#0b492e;text-decoration:underline;">App Store</a> &nbsp;·&nbsp; <a href="${androidUrl}" style="color:#0b492e;text-decoration:underline;">Google Play</a></p>`,
            '<p style="font-size:12px;line-height:1.6;color:#66766b;margin:12px 0 0;">If the iPhone listing is unavailable in your region, you can still register and use your account in the web dashboard.</p>',
            '</td></tr>',
            '<tr><td style="background:#f7faf8;border-top:1px solid #e5eee8;padding:21px 24px;text-align:center;">',
            '<strong style="font-size:12px;color:#0b4028;">ELITE BRIDGE STAFFING LLC</strong>',
            '<p style="font-size:12px;line-height:1.7;color:#657669;margin:7px 0 0;">Staffing you can rely on<br /><a href="https://www.elitebridgestaffing.com" style="color:#0b492e;text-decoration:none;">www.elitebridgestaffing.com</a><br />info@elitebridgestaffing.com &nbsp;|&nbsp; (508) 251-9346</p>',
            '</td></tr></table></td></tr></table></body></html>',
          ].join(""),
        });
      } catch {
        console.error("Invitation email could not be delivered; check the email provider log");
      }
    }
    if (data.phone && smsReady()) {
      try {
        await sendSms(data.phone, `${employer.companyName} invited you to Elite Bridge. Create access now and finish your profile later: ${inviteUrl} iPhone: ${appLinks.ios} Android: ${appLinks.android}`);
        smsSent = true;
      } catch {
        console.error("Invitation SMS could not be delivered; check the SMS provider log");
      }
    }
    res.status(201).json({
      invitation: { id: inserted[0].id, status: "pending", expiresAt },
      inviteUrl,
      appLinks,
      emailSent,
      smsSent,
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
    companyLogo: employer.companyLogo ?? "",
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
    const membership = await getEmployerMembership(req.user!.id);
    const user = (await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1))[0];
    if (!user) throw new AppError(404, "Employer account not found");
    res.json({ profile: { ...mapEmployerProfile(employer, user), organizationRole: membership?.role || "owner" } });
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
    if (data.companyLogo !== undefined) employerData.companyLogo = data.companyLogo;
    if (data.companyDescription !== undefined) employerData.companyDescription = data.companyDescription;
    if (data.website !== undefined) employerData.website = data.website;
    if (data.industry !== undefined) employerData.industry = data.industry;
    if (data.teamSize !== undefined) employerData.teamSize = data.teamSize;
    if (data.servicesOffered !== undefined) employerData.serviceArea = data.servicesOffered;
    if (data.address !== undefined || data.city !== undefined || data.state !== undefined || data.zipCode !== undefined) {
      employerData.billingAddress = { address: data.address ?? "", city: data.city ?? "", state: data.state ?? "", zipCode: data.zipCode ?? "" };
    }
    const employer = await employerForUser(req.user!.id);
    await db.update(employers).set(employerData).where(eq(employers.id, employer.id));
    const updatedEmployer = await employerForUser(req.user!.id);
    const membership = await getEmployerMembership(req.user!.id);
    const user = (await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1))[0];
    res.json({ profile: { ...mapEmployerProfile(updatedEmployer, user), organizationRole: membership?.role || "owner" } });
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

