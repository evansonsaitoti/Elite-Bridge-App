# Attendance reminders and corrections

The production runner checks every minute. Enable explicitly with CRON_SECRET, CLOCK_REMINDER_EMPLOYER_IDS (comma-separated numeric IDs), and CLOCK_REMINDERS_ENABLED_AT (UTC ISO timestamp). Missing configuration fails closed. Only Elite Bridge organization 20 is enabled in this rollout. No SMS or email reminders are added.

Assigned caregivers receive a reminder 15 minutes before start, 5 minutes after start if no clock-in exists, and 10 minutes after end if still clocked in. At 15 minutes late, the owning employer receives a coverage alert. Canceled/closed/completed or unassigned work is excluded; eligibility is rechecked under the same locks used by punches. Comparisons use UTC instants, including overnight and daylight-saving changes. Delivery can occur up to a minute after the threshold plus provider delay. Late alerts stop at shift end; clock-out alerts expire 24 hours after end.

A database unique key prevents repeat reminders across runs. In-app notices are stored atomically with the dispatch claim. Push status is attempted, not delivered. Unknown provider outcomes are not automatically retried. The dashboard shows the last completed scheduler check. Disable via an empty organization allowlist. Reminders never change attendance.

Caregivers submit actual start/end times and a reason from the web time clock or new native clock screen. Employer review shows requested versus original hours. Approval retains original punches and a snapshot, writes an audit review, updates payable minutes/totals using the existing rate, and marks the timesheet approved. Missing events are labeled approved corrections with no fabricated location. No payment is sent. Approval rejects changed records, overlapping work, other active visits, or already approved timesheets. Previously approved payroll adjustments require office handling. Rejection records the reviewer and note without changing hours.

Native clock routing, correction UI, hidden opportunity pay and Universal Links require the next Elite Care release. Employer attendance-alert routing requires the next Elite Work release. Installed apps can receive pushes and view notifications; web correction submission/review is available after deployment.

Validation uses isolated PostgreSQL with mocked providers: exact timing, deduplication, cancellation, assignment, ownership, employer scope, stale alerts, future/invalid corrections, duplicate requests, approval audit and stale-review rejection. No production attendance or payroll records are created for tests.
