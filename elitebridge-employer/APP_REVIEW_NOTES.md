# Elite Bridge Employer — App Review Notes (Build 21)

## Review access

On the sign-in screen, tap **Explore complete demo**. No credentials are required.

Demo mode is visible and available to every user. It is not activated by reviewer identity, email address, device, location, date, IP address, build channel, or remote configuration. A **DEMO WORKSPACE** badge identifies sample data in the app.

## Complete feature map

- **Home:** staffing overview, open shifts, applications, call-outs, Care Radar, and upcoming schedule.
- **Schedule:** view and create shifts and open Coverage Copilot.
- **Ops:** Coverage, Applications, Schedule, Compliance, and Profile.
- **Profile:** agency details, support, privacy policy, sign out, and account deletion.

The following secondary screens are intentionally reached from the documented primary screens rather than displayed as bottom tabs:

- Clients
- Workforce
- Coverage Copilot
- Timesheets
- Applications
- Compliance
- Agency setup

## Build 21 transparency correction

Build 20 contained a reviewer-named demo account and selected sample dashboard data by matching the account email. This was intended only to provide review access, but it created different code behavior for a reviewer-labeled identity. Build 21 removes that behavior completely.

Build 21 uses an explicit `live` or `demo` session mode. Demo mode is selected only through the public **Explore complete demo** button and provides the same documented navigation and features to Apple and all other users.
