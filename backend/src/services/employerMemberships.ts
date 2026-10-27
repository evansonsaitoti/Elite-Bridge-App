import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { ensureCoreTables } from "../db/bootstrap.js";
import { employers } from "../db/schema.js";
import { AppError } from "../middleware/errorHandler.js";

export type OrganizationRole = "owner" | "admin" | "scheduler" | "billing" | "viewer";

export async function getEmployerMembership(userId: number) {
  await ensureCoreTables();
  const result = await (db as any).$client.query(
    "SELECT employer_id, role FROM employer_memberships WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  const membership = result.rows[0] as { employer_id: number; role: OrganizationRole } | undefined;
  if (!membership) return null;
  const [employer] = await db.select().from(employers).where(eq(employers.id, membership.employer_id)).limit(1);
  if (!employer) return null;
  return { employer, role: membership.role };
}

export async function employerForUser(userId: number) {
  const membership = await getEmployerMembership(userId);
  if (!membership) throw new AppError(404, "Organization membership not found");
  return membership.employer;
}

export async function requireOrganizationRole(userId: number, ...roles: OrganizationRole[]) {
  const membership = await getEmployerMembership(userId);
  if (!membership) throw new AppError(403, "You do not belong to an employer organization.");
  if (!roles.includes(membership.role)) throw new AppError(403, "Your organization role does not allow this action.");
  return membership;
}
