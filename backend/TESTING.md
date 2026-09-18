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
- Native Time Clock and employer review changes require the new caregiver 58 and
  employer 35 binaries. Both platforms built successfully and both iOS uploads
  succeeded; store processing and physical-device acceptance are separate checks.
- Multi-home roles, configured geofences, offline queues, unpaid-break policies,
  adjustments to recorded hours, payroll exports, SMS delivery, and approved payroll
  provider integrations remain separate roadmap increments.

## September 18 release evidence

- PR #37 merged as `764b91f`; backend and web Vercel deployments are ready.
- The production backend health check returned 200 with database status `ok`.
- Production `dashboard.js` matched the tested file byte-for-byte (SHA-256
  `3c7022512251b73964e98ea62539861eb46a85150da297760201b177b599d1c9`).
- The shared timekeeping route returned 401 without authentication, as expected.
- A read-only audit found one future open legacy shift, labeled for App Review.
  Historical schedules were not rewritten.
- PR #38 increments both platforms to caregiver 58 and employer 35. PR #39 fixes
  obsolete Android validation identities and stops the duplicate legacy iOS trigger.
- Registered Play package names were checked in Play Console:
  `com.elitebridgestaffing.caregiver` and `com.elitebridgestaffing.employer`.
- Android release workflow: https://github.com/evansonsaitoti/Elite-Bridge-App/actions/runs/35302475854
- TestFlight release workflow: https://github.com/evansonsaitoti/Elite-Bridge-App/actions/runs/35302215318
- Both iOS jobs succeeded. Their logs confirm App Store Connect upload of employer
  1.3.3 (35) at 03:18 UTC and caregiver 1.2.5 (58) at 03:23 UTC. Apple processing
  and actual device installation are not established by an upload acknowledgement.
- Both signed Android builds succeeded. The workflow retains `elite-work-35-aab`
  and `elite-care-58-aab` artifacts for 30 days. Both new builds are confirmed
  available to internal testers in Play Console. The existing production builds
  57/34 remain in review; the new binaries were released on the internal tracks.
- Play accepted both bundles with non-blocking warnings about missing optional
  deobfuscation files, plus increased caregiver download size relative to the old
  internal release. No supported devices were lost in either release comparison.
- All PR #38 quality checks passed, including the iOS simulator compile.

## Device acceptance after installation

Use dedicated test accounts in an isolated test environment for shift posting;
production shift broadcasts can reach real caregivers. Automated tests above use
an isolated database and intercept outbound notifications.

1. Invite a caregiver, accept with the matching email, and confirm team membership
   on both employer web and the employer app.
2. Post an overnight shift with an explicit facility timezone and two positions.
   Confirm the dates, local times and available positions agree across clients.
3. Approve two caregivers. Verify a third approval cannot overfill the shift and
   an overlapping assignment is refused for an already-booked caregiver.
4. Clock in on a device and refresh employer web. Verify attendance appears once.
   Try a repeated clock-in; it must not create a second active session.
5. Start/end a paid break, retain a note, and clock out. Confirm actual duration,
   notes and the resulting timesheet agree across web and mobile.
6. Request clarification as the employer, resubmit a caregiver note, then approve.
   Confirm status and history agree without changing the original worked hours.
7. Confirm the second caregiver remains active after the first finishes, and the
   shift completes only after all filled positions finish.
8. Exercise missing location permission and loss of connectivity. Missing GPS must
   remain visible, and an unacknowledged clock action must not appear as saved.
9. Check actual email and push receipt separately from provider acceptance. A
   configured geofence, payroll settlement and SMS delivery are not claimed by
   this release.
