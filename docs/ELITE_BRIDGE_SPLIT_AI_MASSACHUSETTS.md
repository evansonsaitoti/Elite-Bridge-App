# Elite Bridge — Two-App + AI Massachusetts Strategy

## Product split

### Elite Bridge
Audience: caregivers, companions, HHAs, CNAs, PCAs and other frontline staff.

Core jobs:
- Discover and accept shifts
- See upcoming work
- Clock in/out
- Complete visit notes
- Submit availability, time-off and swap requests
- Review hours, timesheets and estimated earnings
- Keep credentials/profile current

### Elite Bridge Employer
Audience: home-care agencies, staffing agencies, schedulers, owners and operations teams.

Core jobs:
- Manage clients and care/service plans
- Recruit, onboard and manage workers
- Post and fill shifts
- Handle call-outs and replacements
- Approve timesheets
- Track payroll exposure and overtime
- Manage documents, credentials and compliance
- Run operations and reports

Suggested bundle ID: `com.app.elitebridgeemployer`

## Differentiation thesis

Elite Bridge should not become another shift board. The core product advantage should be an AI operations layer that coordinates scheduling, compliance, staffing, communication and timekeeping for Massachusetts care agencies.

Competitors already do basic posting, applications, messaging, documents, scheduling and timesheets. Elite Bridge should win on the work between those screens: what happens when a caregiver calls out, a credential expires, overtime is about to occur, a client prefers a familiar caregiver, a shift is likely to remain open, or an agency is missing a Massachusetts requirement.

## Signature AI features

### 1. Coverage Copilot
A one-tap AI rescue system for uncovered shifts and call-outs.

When a shift becomes uncovered, rank replacement workers by:
- Credentials/role eligibility
- Availability
- Distance/travel time
- Overtime risk
- Client continuity and prior relationship
- Reliability/no-show history
- Requested hours
- Language/preferences when relevant
- Agency pay/margin rules

The system can create an outreach sequence, notify the best candidates first, expand the radius if nobody accepts, and give the scheduler a live explanation of why each worker was ranked.

### 2. Shift Risk Radar
Predict which shifts are likely to go unfilled, be canceled, start late or create overtime.

Display a simple risk label: Low / Medium / High, plus actionable reasons such as:
- Weekend evening shift
- Short notice
- Long travel distance
- Historically hard-to-fill service type
- Worker near weekly overtime
- Repeated client/caregiver mismatch

Then recommend actions before the problem happens.

### 3. Massachusetts Compliance Copilot
A state-aware operations assistant rather than a generic checklist.

Agency onboarding asks how the business operates (direct employer, staffing/placement model, private pay, MassHealth, etc.) and activates only the relevant compliance workflows.

Possible MA modules:
- Staffing/employment/placement agency licensing or registration reminders when applicable
- Temporary Workers Right to Know job-order workflow when applicable
- Earned sick-time accrual tracking
- Worker-rights notice/document acknowledgments
- Home Care Worker Registry workflow where applicable
- EVV readiness for Medicaid-funded services where applicable
- Credential, training and document expiration alerts

The app should clearly label this as operational guidance and not legal advice.

### 4. Smart Job Order Generator
For staffing-agency workflows, create a Massachusetts-ready assignment notice from the shift record, including worksite, hours, pay, role, requirements and other required fields. Store worker acknowledgment in the assignment audit trail.

### 5. Care Continuity Score
Most scheduling apps optimize only for filling the shift. Elite Bridge should optimize for continuity.

For each proposed caregiver/client match, score:
- Previous visits
- Client preference
- Communication/language fit
- Reliability
- Service experience
- Travel burden
- Schedule consistency

Use this score alongside availability rather than replacing human decision-making.

### 6. Voice-to-Visit Note
After a visit, a caregiver can speak a short recap. AI turns it into a structured, professional visit note and asks the caregiver to review and approve it before saving.

Important design rule: AI drafts; the worker confirms. Never silently invent care events.

### 7. Operations Inbox
One AI-curated screen for administrators instead of dozens of alerts.

Examples:
- 2 shifts likely to remain unfilled tomorrow
- 1 employee will cross overtime if assigned Friday
- 3 credentials expire within 14 days
- 1 timesheet has a location/time mismatch
- 2 clients have had 4+ different caregivers this month
- 4 workers have not acknowledged updated policy documents

Each item should have a recommended next action.

### 8. Natural-Language Agency Command Bar
Allow an owner/scheduler to type or say:
- “Who can cover Mary tomorrow from 8 to 2 without overtime?”
- “Show all caregivers whose CPR expires this month.”
- “Create recurring companionship shifts for Robert every Tuesday and Thursday.”
- “Which clients had the most caregiver changes this month?”
- “Draft a message to everyone qualified for tonight’s shift.”

AI should translate the request into a previewed action. Destructive or high-impact actions require confirmation.

### 9. Fair Scheduling Guardrails
Before publishing or assigning a schedule, identify:
- Accidental double booking
- Insufficient travel time
- Excessive consecutive hours
- Overtime exposure
- Repeated undesirable-shift concentration on the same workers

This turns AI into a quality-control layer, not only a chatbot.

### 10. Agency Memory
Create a private operational memory for each agency:
- Client preferences
- Scheduling habits
- Worker strengths
- Recurring staffing issues
- Preferred replacement order
- Agency policies

Over time, Coverage Copilot becomes agency-specific rather than generic.

## Massachusetts-first launch wedge

### Phase 1 — Greater Lowell / Merrimack Valley
Focus on small and mid-size non-medical home-care and staffing agencies that still coordinate work using calls, texts, spreadsheets and payroll tools.

Offer white-glove onboarding:
- Import staff roster
- Import clients
- Configure pay rates
- Build recurring schedules
- Configure compliance reminders
- Train administrator users

### Phase 2 — Eastern Massachusetts
Expand toward Boston, North Shore, MetroWest and Worcester after proving retention and fill-rate improvements.

### Phase 3 — State packs
Make compliance and labor logic modular. Add a “state pack” for each new state so expansion changes rules/configuration rather than rebuilding the product.

## Product metrics that matter

Do not optimize only for downloads. Track:
- Shift fill rate
- Median time to fill
- Call-out recovery time
- Percentage of recurring shifts kept with familiar caregivers
- Overtime prevented
- Credential expirations prevented
- Timesheet approval time
- Admin hours saved per week
- Caregiver retention
- Client continuity

## Monetization direction

Caregiver app: free.

Employer app: subscription by active worker or agency size, with an AI operations tier.

Possible tiers:
- Starter — scheduling, staff, clients, timesheets
- Pro — payroll exports, automation, compliance, messaging
- Intelligence — Coverage Copilot, Risk Radar, command bar, advanced analytics

## Near-term build order

1. Protect the current App Store submission; no changes on `main` solely for the split.
2. Build the new employer app on branch `elitebridge-split-ai-ma`.
3. Convert the existing Elite Bridge app into caregiver-only navigation on the branch.
4. Give both apps separate bundle identifiers and App Store listings.
5. Introduce a shared backend/API so both apps operate on the same agency, shift, staff and client records.
6. Build Coverage Copilot as the first flagship AI feature.
7. Add Massachusetts Compliance Copilot as the local moat.
8. Pilot with Massachusetts agencies before multi-state expansion.
