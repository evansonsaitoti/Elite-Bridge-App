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

Current local result: 30 backend tests passed. Caregiver app: 59 tests passed,
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

## Remaining limits

- Live email delivery needs a configured sender; no SMTP or Resend variables were
  present in the production backend when inspected for this change.
- Payment processing is not implemented. The endpoint returns 501 without changing
  balances or claiming that money moved. Invoice calculation is tested separately.
- Paid Checkr screening and physical-device push receipt are not exercised here.
- These API tests do not replace tapping through the installed TestFlight apps.
- Native dashboard count/text changes require a new app build. Shared API fixes
  take effect for existing clients after the backend deployment.
