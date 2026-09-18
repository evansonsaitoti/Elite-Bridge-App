# Workflow verification

Run `npm install`, `npm run build`, and `npm test` from `backend`.

The backend suite runs the real Express routes and SQL against a disposable,
in-memory PostgreSQL database using PGlite. It never uses the production database.
Email and push HTTP requests are intercepted; no test shifts, messages, charges,
or background-check requests reach real caregivers or external providers.

## Covered

- Registration, login, persistent profiles, welcome emails and office signup alerts.
- Invitations, email matching, one-time acceptance, immediate team membership,
  and employer isolation.
- Shift validation, posting, matching, identical web/mobile feeds, applications,
  approval, concurrent approval protection, retries, and instant claiming.
- Clock ownership, duplicate clock-in prevention, worked time, timesheet totals,
  call-outs, replacement offers, employer approval, and cancellation.
- Messaging, notification ownership, read state, push token validation and removal.
- Background-check team authorization and manual pending status.
- Payroll ownership, completed-work invoicing and refusal to simulate settlement.
- Password-reset token consumption and account deletion with dependent cleanup.
- Resend acknowledgements, SMTP recipient acceptance, missing configuration,
  provider failures and HTML escaping.
- Overnight shifts, explicit end dates, facility time zones, DST transition duration,
  and rejection of nonexistent or ambiguous local times.
- Multi-caregiver capacity, partial coverage, overlap prevention, concurrent clock
  attempts, shared paid-break records, and independent completion of each position.
- Employer timesheet approval, clarification/resubmission, review history, and
  access isolation across caregiver/employer accounts.
- Existing web dashboards exercised in JSDOM: schedule submission, shared attendance
  counts, clock actions, notes across breaks, review forms, and API failure states.

Current local result: 38 backend/web tests passed. Caregiver app: 59 tests passed,
6 pre-existing tests skipped. Both app TypeScript checks, backend build, web
JavaScript syntax and both app release audits passed.

## Email configuration

`SIGNUP_ALERT_EMAIL=info@elitebridgestaffing.com` is the office recipient.
Set either `RESEND_API_KEY` and a verified `RESEND_FROM`, or all of `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`, on the backend deployment.
Secrets belong in deployment settings, never in source control.

Office alerts cover signups, shift posting/claiming/cancellation, applications,
approval/rejection, call-outs and completed timesheets. New users receive a welcome
email. Invitations and password resets use the same provider. Provider acceptance
is not proof of inbox delivery; check delivery logs and the destination mailbox.

## Attendance rollout

Deploy the shared backend before releasing the updated web/native clients. New
columns and the review-history table are additive; existing accounts and shift
records are retained. No historical local sample records are imported as worked
time. The caregiver Time Clock now uses the same API as the existing Home screen,
and Home opens that clock rather than offering a separate clock workflow.

New clients send a facility time zone (Massachusetts defaults to America/New_York).
Clients that omit it retain the previous UTC scheduling convention. An omitted end
date rolls into the following day only when the end time is earlier than the start.
Stored timestamps are read/written as UTC; historical rows are not shifted.

Breaks are recorded as paid time in this increment. GPS evidence is optional and
shown as captured/missing, never as proof of being inside a facility. The former
synthetic EVV score has been removed from the caregiver clock. No offline action
is reported as saved until the shared API acknowledges it. Timesheet approval does
not transfer money; clarification adds an audited note without changing hours.

## Remaining limits

- Verpex SMTP was configured and a production office signup alert was received in
  info@elitebridgestaffing.com on September 17, 2026. Automated tests still intercept
  outbound delivery and do not create production shifts or notify real caregivers.
- Payment processing is not implemented. The endpoint returns 501 without changing
  balances or claiming that money moved. Invoice calculation is tested separately.
- Paid Checkr screening and physical-device push receipt are not exercised here.
- These API tests do not replace tapping through the installed TestFlight apps.
- The local browser preview could not be opened by the available cloud browser;
  JSDOM interaction checks do not substitute for visual/device acceptance testing.
- Native Time Clock and employer review changes require new app binaries. This
  increment does not itself submit TestFlight or Google Play releases.
- Multi-home roles, configured geofences, offline queues, unpaid-break policies,
  adjustments to recorded hours, payroll exports, SMS delivery, and approved payroll
  provider integrations remain separate roadmap increments.
