# Elite Bridge Employer — App Review Notes (Version 1.2.0, Build 24)

## Purpose and companion-app relationship

Elite Bridge is a two-sided care staffing marketplace delivered through two distinct companion apps:

- **Elite Bridge Employer** is exclusively for care organizations. Employers register, maintain an organization profile, publish matched shift offers, manage postings, review applications when approval is required, and receive staffing notifications.
- **Elite Bridge Caregiver** is separately listed for care professionals. Caregivers maintain their matching preferences, receive eligible shift offers, claim instant shifts or request approval, and manage assigned work.

The apps use the same production service so an employer action in this app can produce a corresponding opportunity in the Caregiver app. The two apps have different users, permissions, workflows, navigation, and bundle identifiers. A caregiver account is rejected by Employer authentication.

### Distinct functionality

| Elite Bridge Employer | Elite Bridge Caregiver |
| --- | --- |
| Organization account and employer registration | Individual caregiver profile and onboarding |
| Creates and publishes matched care Shift Offers | Receives eligible Shift Offers based on the caregiver profile |
| Selects instant claim or employer approval per shift | Claims an instant shift or requests employer approval |
| Approves or declines approval-required applicants | Tracks application decisions and confirmed assignments |
| Receives application and call-out push alerts | Receives new-shift, decision, and urgent-offer push alerts |
| Manages the organization’s postings | Manages the caregiver’s workday, visits, and earnings |

The apps are intentionally intertwined, not duplicates: actions performed by one audience create the work items used by the other audience. This is the core two-sided marketplace function.

## Complete review access

Before submission, create a normal employer account in the production service and enter its current credentials in **App Store Connect → App Review Information**. The review account must use the same authentication endpoint, authorization checks, and data store as every other employer.

Do not add review credentials, email recognition, password bypasses, device checks, secret gestures, local sessions, remote feature flags, or reviewer-specific data to the application binary.

Reviewers may also select **Create employer account** on the first screen. Registration is public and creates a real employer account using the same process available to every care organization.

## Preloaded cross-app verification

The production review accounts listed privately in App Store Connect contain a connected scenario:

1. Sign in to **Elite Bridge Employer** and open **Shifts**. The employer account contains a connected care shift.
2. Open **Applicants** to view any approval-required requests attached to that shift.
3. Sign in to the separately listed **Elite Bridge Caregiver** app (App Store Connect ID `6770962152`) using the caregiver credentials supplied privately in the Notes field.
4. The caregiver Work screen displays opportunities published by Employer that match the caregiver profile.
5. For **Instant claim**, the first eligible caregiver who accepts is assigned and Employer receives a notification. For **Review first**, the caregiver sends a request and Employer approves or declines it.

These are ordinary production accounts. They do not activate different code, screens, data sources, or functionality based on identity.

## Visible feature map

1. **Welcome:** explains the employer-only purpose and the separately listed Caregiver companion app.
2. **Create employer account:** public employer registration.
3. **Employer sign in:** accepts only employer accounts. An organization’s authorized administrator uses an employer account to manage its workspace.
4. **Home:** displays open shifts, assigned shifts, applicant totals, a visible notification entry point, and the primary Publish Shift action.
5. **Shifts:** displays opportunities created by the signed-in employer, their assignment method and status, and a functional cancellation action.
6. **Post a shift:** publishes through the production API, targets active/available caregivers whose profile matches the role or service, and reports the number matched. Employers visibly choose **Instant claim** or **Review first**.
7. **Applicants:** displays approval-required caregiver requests and allows the employer to approve or decline them.
8. **Notifications:** displays persistent application, claim, call-out, and account activity and supports read/unread state.
9. **Organization profile:** edits the employer’s real production organization name, contact information, services and service address.
10. **Account:** visibly exposes organization profile, notifications, push settings, support, Privacy Policy, Terms of Use, sign out, and permanent in-app account deletion.

After a normal sign-in or registration, the app requests notification permission. Permission is optional; declining it does not hide or change any feature. If granted, Employer receives application and call-out updates generated by activity in the Caregiver companion app.

## Rebuild disclosure

Build 24 is a complete employer-only companion app. It contains no demonstration session, local sample workspace, dormant feature, reviewer-specific code path, or caregiver interface. Every displayed staffing and account action uses the production Elite Bridge service.

No purchase or subscription is required to review the app.
