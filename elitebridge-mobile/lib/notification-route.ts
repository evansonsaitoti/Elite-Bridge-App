export function caregiverNotificationRoute(type: unknown) {
  if (type === "team_message") return "/(staff)/chat" as const;
  if (type === "care_handoff" || type === "care_checklist") return "/(staff)/handoff" as const;
  if (type === "timesheet_review" || type === "timesheet_ready") return "/(staff)/timesheets" as const;
  if (["new_shift_offer", "shift_offer", "shift_open"].includes(String(type))) return "/(staff)/opportunities" as const;
  if (["shift_assignment", "direct_shift_assignment", "shift_application", "shift_assigned", "shift_update", "shift_cancelled", "application_approved", "rescue_offer"].includes(String(type))) return "/(staff)/shifts" as const;
  return "/(staff)/notifications" as const;
}
