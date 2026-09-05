# Elite Bridge Caregiver — App Review Notes (Version 1.1.0, Build 50)

Production companion workflow verified September 5, 2026.

## Purpose and companion relationship

Elite Bridge is a two-sided care staffing marketplace with two separately listed companion apps. **Elite Bridge Caregiver** is only for care professionals. **Elite Bridge Employer** (App Store Connect ID `6798899931`) is only for organizations that publish and manage work.

The apps use the same production service. Employer shift posts become eligible opportunities in Caregiver; caregiver claims, applications, call-outs and timesheets become live employer work items. They have different bundle IDs, users, permissions and navigation.

## Complete review access

Enter the ordinary production Caregiver credentials from the private App Review Information fields. The account uses the same login endpoint and database as every user and does not activate special behavior. It does not expire.

For the connected scenario, use the separately supplied ordinary Employer credentials in Elite Bridge Employer:

1. Employer publishes a shift using **Instant claim** or **Review first**.
2. Caregiver opens **Work** and claims or applies to the matching opportunity.
3. Employer sees the claim/application and receives an alert.
4. An approved assignment appears under **Clock** in Caregiver.
5. Caregiver clocks in, records breaks and clocks out with optional visit notes.
6. Employer opens **Timesheets**, approves the record or requests a correction, and can generate/share the formatted timesheet.
7. The decision appears in Caregiver **Alerts** and **Timesheet history**.

## Visible feature map

1. **Welcome:** explains the caregiver-only purpose and visibly identifies the separately listed Employer companion app.
2. **Create profile:** public three-step registration with required-field labels, password confirmation and show/hide controls. A 24-hour email activation link is sent.
3. **Sign in:** accepts Caregiver accounts only and rejects Employer accounts.
4. **Work:** live matched shifts, instant claims, approval-required applications, confirmed assignments, call-outs and priority replacement offers.
5. **Care Match:** persists availability, preferred services, travel range and urgent-offer preferences to the production caregiver profile.
6. **Timesheets:** only confirmed assignments can be clocked. Clock-in, breaks, location-at-action, clock-out, notes, employer decisions and corrections are server-backed.
7. **Alerts:** persistent cross-app shift, assignment and timesheet notifications with read state.
8. **Account:** editable synchronized profile, push preference, support, Privacy Policy, Terms, sign out and protected in-app account deletion.

## Version 1.1 rebuild disclosure

Build 50 contains no demonstration login, local sample workspace, mock earnings, simulated chat, dormant user/admin route tree, secret gesture, remote feature flag or reviewer-specific data. All visible staffing, matching, attendance, notification, profile and account actions use the production Elite Bridge service. No purchase or subscription is required for review.
