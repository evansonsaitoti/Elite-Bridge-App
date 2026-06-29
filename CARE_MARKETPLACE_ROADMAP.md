# Elite Bridge Care Marketplace Roadmap

This branch adds an original Elite Bridge experience inspired by modern care marketplaces without copying another platform's design, wording, or layout.

## Public webpage

Location: `public-web/index.html`

The public webpage introduces Elite Bridge as a Massachusetts-focused non-medical home care staffing platform. It includes:

- Hero section for families/agencies and caregivers
- Care categories: companion care, personal care, respite, overnight, meal prep, homemaker support, family support
- How it works for families/agencies
- How it works for caregivers
- Trust and transparency positioning
- Example caregiver profile cards
- Calls to action for requesting care and finding work

## Employer app additions

Locations:

- `employer-app/src/pages/CaregiverSearchPage.tsx`
- `employer-app/src/pages/EmployerDashboardPage.tsx`
- `employer-app/src/App.tsx`

The employer app now supports:

- `/dashboard` with stronger marketplace actions
- `/post-shift` existing shift posting flow
- `/caregivers` caregiver search and comparison page
- Dashboard button for finding caregivers
- Dashboard button for posting shifts

## Caregiver app additions

Locations:

- `caregiver-app/src/pages/CaregiverDashboardPage.tsx`
- `caregiver-app/src/pages/AvailableShiftsPage.tsx`
- `caregiver-app/src/App.tsx`

The caregiver app now supports:

- `/dashboard` real caregiver dashboard instead of placeholder
- `/shifts` available shifts marketplace page
- Profile readiness checklist
- Shift browsing and filtering with fallback sample shifts

## Trust and compliance positioning

Elite Bridge should stay different by emphasizing:

- Real local shift posts
- Clear rates and schedules
- Verified caregiver readiness
- No inflated job counts
- No confusing subscriptions
- Simple cancellation and transparent fees

## Recommended next build steps

1. Add caregiver apply-to-shift backend endpoint.
2. Add employer applications review page.
3. Add real caregiver profiles from database.
4. Add messaging between employer and caregiver.
5. Add booking confirmation and clock-in/clock-out workflow.
6. Add invoices and payment tracking.
7. Deploy public webpage and app previews on Vercel.
