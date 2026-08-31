# Elite Bridge Employer — App Review Notes (Build 22)

## Complete review access

On the sign-in screen, tap **Explore complete demo**. No credentials or authentication code are required.

This visible demo option is available to every user. It uses clearly identified sample agency data, displays a **DEMO WORKSPACE** badge, and keeps demo actions on the device. It is not activated by identity, email address, device, location, date, IP address, build channel, or remote configuration.

## Feature map

- **Home:** staffing overview, open shifts, applications, call-outs, Care Radar, and upcoming schedule.
- **Schedule:** view and create demo shifts and open Coverage Copilot.
- **Ops:** Coverage, Applications, Schedule, Compliance, and Profile.
- **Profile:** agency details, support, privacy policy, sign out, and account deletion.
- Secondary screens accessible from these areas: Clients, Workforce, Coverage Copilot, Timesheets, Applications, Compliance, and Agency setup.

## Build 22 compliance changes

- Removed all reviewer-labelled sample names and reviewer-specific language from the application.
- Removed the unused embedded demo credential constant.
- Removed the local-only "New agency" action because it could be mistaken for production account registration.
- Retained one public, clearly disclosed demo workspace that is available identically to Apple and all users.
- Live employer accounts use the production sign-in path and backend services.
