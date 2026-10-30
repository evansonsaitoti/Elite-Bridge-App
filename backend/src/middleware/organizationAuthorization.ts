import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { ensureCoreTables } from "../db/bootstrap.js";
import { db } from "../db/index.js";

type OrgRole = "owner" | "admin" | "scheduler" | "billing" | "viewer";

const schedulerWrites = [
  "/api/bookings",
  "/api/clients",
  "/api/team-messages",
  "/api/messages",
  "/api/care-workspace",
  "/api/care-handoffs",
  "/api/care-site-checklists",
];
const billingWrites = [
  "/api/client-invoices",
  "/api/expenses",
  "/api/manual-timesheets",
  "/api/payroll",
  "/api/contract-documents",
];
const financialReads = [
  "/api/client-invoices",
  "/api/expenses",
  "/api/manual-timesheets",
  "/api/payroll",
  "/api/contract-documents",
];

function startsWithRoute(path: string, prefixes: string[]) {
  return prefixes.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}

export async function organizationAuthorization(req: Request, res: Response, next: NextFunction) {
  try {
    // Express routes are case-insensitive and accept a trailing slash by default.
    // Apply the same normalization before evaluating permissions.
    const path = req.originalUrl.split("?")[0].toLowerCase().replace(/\/+$/, "");
    if (path.startsWith("/api/auth/") || path.startsWith("/api/mcp") || path === "/api/employers/team-invitations/accept") return next();
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next();
    let session: any;
    try { session = jwt.verify(token, config.JWT_SECRET); } catch { return next(); }
    if (session.role !== "employer" || !Number.isInteger(Number(session.id))) return next();

    await ensureCoreTables();
    const client = (db as any).$client;
    let result = await client.query(
      "SELECT employer_id, role FROM employer_memberships WHERE user_id = $1 LIMIT 1",
      [Number(session.id)]
    );
    let membership = result.rows[0] as { employer_id: number; role: OrgRole } | undefined;
    if (!membership) {
      const legacy = await client.query("SELECT id FROM employers WHERE user_id = $1 LIMIT 1", [Number(session.id)]);
      if (legacy.rows[0]) {
        await client.query(
          "INSERT INTO employer_memberships (employer_id,user_id,role) VALUES ($1,$2,'owner') ON CONFLICT (user_id) DO NOTHING",
          [legacy.rows[0].id, Number(session.id)]
        );
        result = await client.query("SELECT employer_id, role FROM employer_memberships WHERE user_id = $1 LIMIT 1", [Number(session.id)]);
        membership = result.rows[0];
      }
    }
    if (!membership) return res.status(403).json({ message: "Your account is not a member of an employer organization." });

    const method = req.method.toUpperCase();
    const write = !["GET", "HEAD", "OPTIONS"].includes(method);
    // These handlers scope every operation to the authenticated user's ID.
    // Read-only organization access must still support personal push settings.
    const ownNotificationWrite =
      (path === "/api/notifications/device" && ["POST", "DELETE"].includes(method)) ||
      (path === "/api/notifications/preferences" && method === "PUT") ||
      (path === "/api/notifications/read-all" && method === "POST") ||
      (/^\/api\/notifications\/\d+\/read$/.test(path) && method === "PATCH");
    if (ownNotificationWrite) return next();
    if (!write) {
      if ((membership.role === "scheduler" || membership.role === "viewer")
        && (startsWithRoute(path, financialReads) || (path.startsWith("/api/bookings/") && path.includes("/timesheets")))) {
        return res.status(403).json({ message: `Your organization role (${membership.role}) does not include finance and timesheet records.` });
      }
      return next();
    }
    if (membership.role === "owner" || membership.role === "admin") {
      if (path.startsWith("/api/employers/team") && membership.role !== "owner" && path.includes("/owner")) {
        return res.status(403).json({ message: "Only the organization owner can change ownership." });
      }
      return next();
    }
    if (path.startsWith("/api/employers/team") || path.startsWith("/api/employers/me") || path.startsWith("/api/employers/")) {
      if (membership.role === "scheduler" && path.startsWith("/api/employers/invitations")) return next();
      return res.status(403).json({ message: "Only organization owners and admins can manage organization settings or team access." });
    }
    if (membership.role === "scheduler" && startsWithRoute(path, schedulerWrites) && !path.includes("/timesheets")) return next();
    if (membership.role === "billing" && (startsWithRoute(path, billingWrites) || (path.startsWith("/api/bookings/") && path.includes("/timesheets")))) return next();
    return res.status(403).json({ message: `Your organization role (${membership.role}) does not allow this change.` });
  } catch (error) {
    next(error);
  }
}

