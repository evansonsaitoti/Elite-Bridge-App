import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { db } from "../db";
import { employers } from "../db/schema";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";

const router = Router();
const askSchema = z.object({ command: z.string().trim().min(2).max(500) });

type AskRoute = "/coverage" | "/compliance" | "/schedule" | "/workforce" | "/timesheets" | "/applications" | undefined;

async function getEmployer(req: AuthRequest) {
  if (!req.user || req.user.role !== "employer") throw new AppError(403, "Employer access required");
  const existing = await db.select().from(employers).where(eq(employers.userId, req.user.id)).limit(1);
  if (existing[0]) return existing[0];
  const created = await db.insert(employers).values({ userId: req.user.id, companyName: req.user.email }).returning();
  return created[0];
}

router.post("/ask", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { command } = askSchema.parse(req.body);
    const employer = await getEmployer(req);

    const [shiftResult, applicationResult, calloutResult, bookingResult, workforceResult] = await Promise.all([
      db.execute(sql`
        SELECT id, title, service_type, care_recipient_name, start_time, city, state, urgency, status
        FROM shift_posts
        WHERE employer_id = ${employer.id} AND start_time >= CURRENT_TIMESTAMP - INTERVAL '12 hours'
        ORDER BY CASE WHEN status = 'open' AND urgency = 'urgent' THEN 0 WHEN status = 'open' THEN 1 ELSE 2 END,
                 start_time ASC
        LIMIT 30
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS pending
        FROM shift_applications sa
        JOIN shift_posts sp ON sp.id = sa.shift_id
        WHERE sp.employer_id = ${employer.id} AND sa.status = 'pending'
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS open_callouts
        FROM shift_callouts sc
        JOIN shift_posts sp ON sp.id = sc.shift_id
        WHERE sp.employer_id = ${employer.id} AND sc.status = 'open'
      `),
      db.execute(sql`
        SELECT COUNT(*)::int AS upcoming_assignments,
               COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending','confirmed','in_progress')), 0) AS scheduled_value
        FROM bookings
        WHERE employer_id = ${employer.id}
          AND end_time >= CURRENT_TIMESTAMP
          AND start_time < CURRENT_TIMESTAMP + INTERVAL '7 days'
      `),
      db.execute(sql`
        SELECT COUNT(*) FILTER (WHERE is_available = true)::int AS available,
               COUNT(*) FILTER (WHERE CAST(COALESCE(total_hours, 0) AS numeric) >= 36)::int AS near_overtime
        FROM caregivers
      `),
    ]);

    const shifts = (shiftResult as any).rows as Array<any>;
    const openShifts = shifts.filter((item) => item.status === "open");
    const urgentShifts = openShifts.filter((item) => item.urgency === "urgent");
    const nextOpen = urgentShifts[0] || openShifts[0];
    const pendingApplications = Number((applicationResult as any).rows[0]?.pending || 0);
    const openCallouts = Number((calloutResult as any).rows[0]?.open_callouts || 0);
    const upcomingAssignments = Number((bookingResult as any).rows[0]?.upcoming_assignments || 0);
    const scheduledValue = Number((bookingResult as any).rows[0]?.scheduled_value || 0);
    const availableCaregivers = Number((workforceResult as any).rows[0]?.available || 0);
    const nearOvertime = Number((workforceResult as any).rows[0]?.near_overtime || 0);

    const q = command.toLowerCase();
    let intent = "Operations briefing";
    let answer = "Your live operations are synchronized. Elite reviewed current coverage, applications, call-outs and upcoming assignments and prepared the priorities below.";
    let route: AskRoute = "/schedule";
    let actionLabel = "Open schedule";

    if (q.includes("cover") || q.includes("fill") || q.includes("call-out") || q.includes("callout") || q.includes("coverage")) {
      intent = "Coverage request";
      route = openCallouts > 0 ? "/coverage" : pendingApplications > 0 ? "/applications" : "/schedule";
      actionLabel = openCallouts > 0 ? "Open Coverage Copilot" : pendingApplications > 0 ? "Review applications" : "Open schedule";
      answer = openCallouts > 0
        ? `${openCallouts} active call-out${openCallouts === 1 ? " needs" : "s need"} replacement coverage. Coverage Copilot can rank available caregivers and send priority offers, but your scheduler keeps final approval.`
        : nextOpen
          ? `${urgentShifts.length > 0 ? "An urgent" : "An open"} ${nextOpen.service_type} shift${nextOpen.care_recipient_name ? ` for ${nextOpen.care_recipient_name}` : ""} is the next coverage priority. ${pendingApplications > 0 ? `${pendingApplications} application${pendingApplications === 1 ? " is" : "s are"} waiting for review.` : "There are no pending applications yet."}`
          : "There are no open shifts or active call-outs requiring coverage right now.";
    } else if (q.includes("overtime") || q.includes("hours") || q.includes("payroll") || q.includes("cost")) {
      intent = "Labor-cost review";
      route = "/timesheets";
      actionLabel = "Review timesheets";
      answer = `${nearOvertime} available caregiver${nearOvertime === 1 ? " is" : "s are"} at or above the 36-hour early-warning threshold in the shared workforce pool. Your next seven days contain ${upcomingAssignments} scheduled assignment${upcomingAssignments === 1 ? "" : "s"} with an estimated scheduled value of $${scheduledValue.toFixed(2)}.`;
    } else if (q.includes("credential") || q.includes("compliance") || q.includes("massachusetts") || q.includes("evv")) {
      intent = "Compliance review";
      route = "/compliance";
      actionLabel = "Open Compliance Copilot";
      answer = "Open the Massachusetts-aware Compliance Copilot to review the rules that apply to your agency profile. Elite keeps compliance guidance separate from automatic staffing actions and flags items for human review.";
    } else if (q.includes("application") || q.includes("applicant") || q.includes("hire") || q.includes("candidate")) {
      intent = "Applicant review";
      route = "/applications";
      actionLabel = "Review applications";
      answer = `${pendingApplications} caregiver application${pendingApplications === 1 ? " is" : "s are"} waiting for an agency decision. Approval is always a human-confirmed action.`;
    } else if (q.includes("staff") || q.includes("workforce") || q.includes("available")) {
      intent = "Workforce readiness";
      route = "/workforce";
      actionLabel = "Open workforce";
      answer = `${availableCaregivers} caregiver${availableCaregivers === 1 ? " is" : "s are"} currently marked available in the shared workforce pool; ${nearOvertime} are at or above the early overtime-warning threshold.`;
    } else if (q.includes("tomorrow") || q.includes("attention") || q.includes("risk") || q.includes("priority")) {
      intent = "Priority briefing";
      route = openCallouts > 0 ? "/coverage" : pendingApplications > 0 ? "/applications" : "/schedule";
      actionLabel = openCallouts > 0 ? "Resolve coverage" : pendingApplications > 0 ? "Review applications" : "Open schedule";
      answer = `Current priorities: ${openCallouts} open call-out${openCallouts === 1 ? "" : "s"}, ${urgentShifts.length} urgent open shift${urgentShifts.length === 1 ? "" : "s"}, ${pendingApplications} pending application${pendingApplications === 1 ? "" : "s"}, and ${upcomingAssignments} assignment${upcomingAssignments === 1 ? "" : "s"} scheduled in the next seven days.`;
    }

    const evidence = [
      `${openShifts.length} open shift${openShifts.length === 1 ? "" : "s"} · ${urgentShifts.length} urgent`,
      `${openCallouts} active call-out${openCallouts === 1 ? "" : "s"}`,
      `${pendingApplications} pending caregiver application${pendingApplications === 1 ? "" : "s"}`,
      `${upcomingAssignments} upcoming assignment${upcomingAssignments === 1 ? "" : "s"} in the next 7 days`,
      `${availableCaregivers} caregivers marked available in the shared pool`,
    ];

    res.json({
      intent,
      answer,
      evidence,
      actionLabel,
      route,
      confirmation: "Elite prepares recommendations from live operational signals. It does not assign caregivers, approve applicants, change payroll or make compliance decisions without an authorized person taking the action.",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
