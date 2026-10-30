# Organization workflow readiness review

Scope: organization onboarding through approved timesheet export, with two isolated organizations and production authorization middleware. This is a targeted engineering review, not a full security or regulatory certification.

## Changes

- Scope legacy caregiver directory/profile reads to the signed-in caregiver, platform admin, or associated organization. Private contact and screening details are no longer a global directory.
- Scope legacy messaging to active organization relationships and allow caregivers to reply to invited managers through team messaging.
- Normalize authorization paths to match Express case-insensitive routing, preventing mixed-case finance-route bypasses.
- Require the organization owner when granting administrator access.
- Allow all manager roles to manage their own notification devices, preferences and read state while retaining organization write restrictions.
- Require signed credentials for Socket.IO, join only the authenticated user's room, and remove client-controlled room selection and message/notification broadcasts. Messaging writes remain on authorized REST routes.

## Verification

Run from backend: `npm run build` and `npx vitest run --maxWorkers=2`.

The test suite uses disposable PGlite databases. Email and push providers are intercepted; no real client records, shifts or outbound messages are created.

Added coverage checks owner/admin/scheduler/billing/viewer roles, invitations, client/document separation, private directory access, cross-organization messaging, notification ownership, revoked memberships, and a shift application through approval, clock-in/out, timesheet approval and payroll CSV. Existing workflow tests now mount the production organization authorization middleware. Realtime tests reject missing/invalid/expired credentials and verify private room assignment without client broadcast handlers.

## Pilot checks still required

- Verify the complete workflow on a real phone using an authorized pilot organization, including push receipt and installed-app API configuration.
- Verify mobile layout and native application builds/releases separately; this change is to the shared backend.
- Verify AI provider configuration and responses separately. This review does not establish AI availability.
- Confirm each promised package feature against the delivered product before contracting. Medical credential verification, clinical workflows and regulatory readiness are not established by this review.
- Caregiver discovery outside an organization needs an explicit, consent-based public profile flow before exposing private contact or screening records.

Production observability and external notification delivery are not covered by the isolated tests.
