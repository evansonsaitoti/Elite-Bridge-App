# Attendance reminders and corrections

The production runner checks every minute. Enable explicitly with CRON_SECRET, CLOCK_REMINDER_EMPLOYER_IDS (comma-separated numeric IDs), and CLOCK_REMINDERS_ENABLED_AT (UTC ISO timestamp). Missing configuration fails closed. Only Elite Bridge organization 20 is enabled in this rollout. No SMS or email reminders are added.

Assigned caregivers receive a reminder 15 minutes before start, 5 minutes after start if no clock-in exists, and 10 minutes after end if still clocked in. At 15 minutes late, the owning employer receives a coverage alert. Canceled/closed/completed or unassigned work is excluded; eligibility is rechecked under the same locks used by punches. Comparisons use UTC instants, including overnight and daylight-saving changes. Delivery can occur up to a minute after the threshold plus provider delay. Late alerts stop at shift end; clock-out alerts expire 24 hours after end.

A database unique key prevents repeat reminders across runs. In-app notices are stored atomically with the dispatch claim. Push status is attempted, not delivered. Unknown provider outcomes are not automatically retried. The dashboard shows the last completed scheduler check. Disable via an empty organization allowlist. Reminders never change attendance.

Caregivers submit actual start/end times and a reason from the web time clock or new native clock screen. Employer review shows requested versus original hours. Approval retains original punches and a snapshot, writes an audit review, updates payable minutes/totals using the existing rate, and marks the timesheet approved. Missing events are labeled approved corrections with no fabricated location. No payment is sent. Approval rejects changed records, overlapping work, other active visits, or already approved timesheets. Previously approved payroll adjustments require office handling. Rejection records the reviewer and note without changing hours.

Native clock routing, correction UI, hidden opportunity pay and Universal Links require the next Elite Care release. Employer attendance-alert routing requires the next Elite Work release. Installed apps can receive pushes and view notifications; web correction submission/review is available after deployment.

Validation uses isolated PostgreSQL with mocked providers: exact timing, deduplication, cancellation, assignment, ownership, employer scope, stale alerts, future/invalid corrections, duplicate requests, approval audit and stale-review rejection. No production attendance or payroll records are created for tests.


## Coverage and shift changes
- Within two hours before an unfilled shift, the same scoped cron creates one employer coverage warning per start time. Fully staffed, cancelled, past and out-of-scope shifts are excluded.
- Employer Attendance includes a local-calendar-day coverage view, recent shift-change acknowledgments, and push attempt history. Native Elite Work Time includes today's coverage and recent history.
- Upcoming shifts can be rescheduled from the web Attendance view. Owner authorization, existing punches, assignment races and overlapping caregiver assignments are checked. Schedule changes and cancellation notices are stored transactionally.
- Caregivers explicitly acknowledge each change in Notifications (mobile) or Timesheets (web). Marking read is separate and never implies acknowledgment.
- Push attempt history reports no_device, attempting, provider_accepted, rejected, partially_accepted or unknown. Acceptance is not a handset delivery receipt. Unknown attempts are not blindly resent. Historical sends before this deployment are not backfilled.
- Mobile 401 recovery clears only the rejected session, preserves a newly signed-in token, and navigates to sign-in. Network errors and authorization failures do not clear sessions. No passwords are stored for silent reauthentication.

## Next mobile release
Elite Care 1.3.4 (70), Elite Work 1.3.10 (44). TestFlight upload and App Store release must be verified separately from the website/backend deployment.
