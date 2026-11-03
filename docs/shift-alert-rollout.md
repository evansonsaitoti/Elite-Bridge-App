# Caregiver shift alerts and app links

The Apple push credential was attached to Expo for com.app.elitebridgemobile on November 3, 2026. The owner confirmed receipt of team-message push test 3. This is evidence for message push delivery, not yet shift-alert delivery.

## Changes

- Caregiver shift email shows service, facility-local date/time, city/state, and a View shift link. Client name, street address, care notes and billing rates stay out of email.
- Notifications retain their shift ID. New native route and login handoff open the selected eligible shift with existing Apply/Claim behavior; reading a link never applies or claims.
- The employer's Send shift alert action reuses existing eligibility rules and does not change review/instant mode. Email delivery remains once per caregiver per shift; push submission is reported as attempted, not delivered.
- HTTPS /view-shift falls back to an explicit Open Elite Care button and App Store link. Older installed versions may open the available-shifts list. The associated-domain file authorizes only /view-shift for the known Apple team and caregiver bundle.

## Release order

1. Publish reviewed branch fix/caregiver-shift-alert-links to evansonsaitoti/Elite-Bridge-App and review the diff.
2. Deploy web project elite-bridge-web (prj_R62WEdLn2sAppdW65CJGmhNW9kQM), repo root; verify /view-shift?shiftId=34 and /.well-known/apple-app-site-association return correct HTML/JSON without authentication or redirects.
3. Deploy backend elite-bridge-shared-api-evans (prj_XgLen7hbJEA0Vzq5aCqoPTtwdwYO), backend directory. Confirm WEB_APP_URL is the HTTPS app.elitebridgestaffing.com origin. Do not print secrets.
4. Run Send shift alert on shift 34 (Barry, Nov 4 2026, 9 AM–1 PM America/New_York) only if it is still upcoming. Confirm matched recipients before interpreting results. An existing email delivery record intentionally prevents replay; do not delete that record just to force a test.
5. Build and release a new Elite Care binary with the associated-domain entitlement and link-handling changes. Version/build number must be checked against App Store Connect first; this branch does not increment them or submit a binary.
6. On a physical iPhone verify shift push, notification tap, email button, signed-out login return, app cold start, unavailable/filled shift, and employer approval. Universal links cannot be certified by local tests.

## Verification

Backend TypeScript build and 51 email, workflow, push tests passed. Mobile TypeScript check and six navigation/session tests passed. Tests use an isolated database and mocked providers, never real recipients. dashboard.js passes the Node syntax check. Publishing and live deployment are pending explicit approval after automatic review blocked the repository push.
