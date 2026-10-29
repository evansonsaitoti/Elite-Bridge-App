# Mobile security and Elite Care notification rollout

Source branch: `security/secure-session-storage-and-log-redaction`; review: PR #97.

## Changes

- Move both apps' active API session tokens to native SecureStore. Preserve separate employer token namespaces and serialize migration with logout. Web storage behavior is unchanged.
- Remove sensitive auth/API logging. Update mobile dependency lockfiles.
- Re-register caregiver push tokens on foreground after transient failures; serialize duplicate registrations; create the Android channel before asking permission; retain a device token for removal after OS permission is revoked.
- Handle notification taps after authentication, including cold starts and cancelled shifts.
- Await backend push submissions before returning responses. Send the marketplace Android channel and log provider error codes without request payloads.
- Notify only the posting employer's active invited team or previously assigned caregivers, rather than broadcasting new shift alerts across organizations.
- Send generic caregiver shift emails with the existing business signature, an account-specific opt-out, and a unique per-user/per-shift delivery claim. Record provider acceptance separately from delivery. Do not automatically replay uncertain outcomes.
- Trigger consent-based SMS and shift emails when an existing shift is opened for pickup as well as when first created. Existing verified-phone consent and STOP handling remain required.

## Deployment prerequisites and outstanding verification

1. Review and merge the code; deploy the shared backend before releasing the updated apps because the new email-preference API is required by the updated Care profile screen.
2. Configure Apple push credentials for Expo project `15715728-ffc5-4ea1-9da8-5158f1e539ef` and bundle `com.app.elitebridgemobile`. The saved October 27 diagnostic reports no attached push key and no reusable account push keys. Recheck live credentials before generating any replacement.
3. The production project `elite-bridge-shared-api-evans` has Resend and SMTP environment entries. Its environment listing on October 29 has no `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SMS_ENABLED`, or `SMS_WEBHOOK_BASE_URL`. Supply the existing authorized Twilio sender and credentials securely; validate provider activation and signed inbound/status callbacks before enabling SMS. Never opt caregivers in automatically.
4. Elite Care's primary App Store category was saved as **Business** in App Store Connect on October 29, 2026. Apple required a new version draft: 1.3.4 is now Prepare for Submission, with no build selected or submitted. Version 1.3.3 remains Ready for Distribution. The category change will be released with the next approved app version; it is not yet a change to the public listing.
5. Create new builds after checking the existing store version/build history. No versions or build numbers were changed, and no binary was built or submitted by this change.
6. Verify actual push receipt on a physical iPhone, email delivery, and consented SMS delivery using an explicitly approved test recipient. Local tests intercept all provider traffic. Provider acceptance alone is not proof of device or inbox delivery.
7. A broader backend authorization/session revocation review remains outside this focused change. Full push receipt polling and durable retries for provider outages also remain follow-up work.
