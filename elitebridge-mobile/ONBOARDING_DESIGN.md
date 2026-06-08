# Staff Onboarding Flow Design

## Overview
A 5-step guided onboarding experience for new staff members to complete profile setup, background check submission, and bank account configuration before accessing the full app.

## Onboarding Steps

### Step 1: Welcome & Personal Information
- **Screen**: `onboarding/welcome.tsx`
- **Fields**: 
  - Full Name
  - Phone Number
  - Date of Birth
  - Address
  - City, State, ZIP
- **Validation**: All fields required
- **Progress**: 20% complete
- **Action**: Next button to proceed

### Step 2: Work Experience & Skills
- **Screen**: `onboarding/experience.tsx`
- **Fields**:
  - Years of caregiving experience (dropdown)
  - Certifications (multi-select checkboxes):
    - CPR/AED
    - First Aid
    - Dementia Care
    - Medication Management
    - Mobility Assistance
  - Languages spoken (multi-select)
  - Availability preferences (days/times)
- **Validation**: At least 1 certification required
- **Progress**: 40% complete
- **Action**: Next/Back buttons

### Step 3: Background Check Submission
- **Screen**: `onboarding/background-check.tsx`
- **Content**:
  - Explanation of Checkr background check requirement
  - Required documents checklist
  - Consent agreement (checkbox)
  - Submit button triggers Checkr API
- **Integration**: Checkr API to create candidate and send invitation
- **Progress**: 60% complete
- **Status**: "Pending" after submission
- **Action**: Proceed to next step (background check runs in background)

### Step 4: Bank Account Setup
- **Screen**: `onboarding/bank-account.tsx`
- **Fields**:
  - Bank name
  - Account holder name
  - Account type (Checking/Savings)
  - Routing number
  - Account number
  - Confirm account number
- **Integration**: Stripe API for bank account validation
- **Validation**: Stripe validation of routing/account numbers
- **Progress**: 80% complete
- **Action**: Verify account, then proceed

### Step 5: Review & Complete
- **Screen**: `onboarding/review.tsx`
- **Content**:
  - Summary of all entered information
  - Background check status
  - Bank account status
  - Confirmation message
  - "Start Working" button
- **Progress**: 100% complete
- **Action**: Complete onboarding and route to staff home

## Navigation Flow

```
Welcome (Step 1)
    ↓
Experience (Step 2)
    ↓
Background Check (Step 3)
    ↓
Bank Account (Step 4)
    ↓
Review (Step 5)
    ↓
Staff Home (Onboarding Complete)
```

## State Management

**OnboardingContext** will track:
- Current step (1-5)
- Form data for all steps
- Background check status
- Bank account verification status
- Onboarding completion flag

## UI Components

All screens will use:
- Progress bar at top showing current step
- Consistent Forest Green (#1B5E3F) branding
- Form validation with error messages
- Loading states during API calls
- Accessibility-friendly form inputs

## Data Storage

After completion, store in database:
- User profile information
- Certifications and skills
- Background check candidate ID (from Checkr)
- Bank account (encrypted)
- Onboarding completion timestamp
- Ready-to-work flag
