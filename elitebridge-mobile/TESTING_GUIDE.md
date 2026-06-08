# Elite Bridge Testing Guide - Expo Go

## Quick Start

### Download Expo Go
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Access the App
**Expo Link (works for both admin and staff):**
```
exps://8081-ili0cp8povvpa196rfwal-02ca8abd.us2.manus.computer
```

**Or scan the QR code from the Management UI Preview panel**

---

## Testing Sections

### ADMIN APP
Access by logging in with admin credentials or selecting admin role

#### 1. **Dashboard** (Home Tab)
- [ ] View facility overview and key metrics
- [ ] See total staff, active shifts, and pending applications
- [ ] Check real-time shift status

#### 2. **Staff Management** (Staff Tab)
- [ ] Browse all staff members
- [ ] View staff profiles with certifications
- [ ] Check background check status
- [ ] Monitor availability and ratings

#### 3. **Shift Management** (Shifts Tab)
- [ ] Create new shifts
- [ ] Set shift details (date, time, facility, rate)
- [ ] View shift applications
- [ ] Allocate staff to shifts
- [ ] Edit and delete shifts

#### 4. **Applications** (Applications Tab)
- [ ] Review pending applications
- [ ] Approve or reject applications
- [ ] View applicant details
- [ ] Check application status history

#### 5. **Settings** (Settings Tab)
- [ ] Update facility information
- [ ] Manage admin account
- [ ] Configure notifications
- [ ] View system settings

---

### STAFF APP
Access by logging in with staff credentials or selecting staff role

#### 1. **Onboarding Flow** (First Time Only)
- [ ] **Step 1 - Welcome**: Enter personal information
  - Full name, phone number, date of birth
  - Address, city, state, ZIP code
  - [ ] Proceed to next step

- [ ] **Step 2 - Experience**: Add certifications
  - Select certifications (CNA, RN, LPN, etc.)
  - Add years of experience
  - [ ] Proceed to next step

- [ ] **Step 3 - Background Check**: Submit background check
  - Verify personal information
  - Enter SSN and driver's license
  - [ ] Submit to Checkr
  - [ ] Proceed to next step

- [ ] **Step 4 - Bank Account**: Set up payment
  - Enter bank account details
  - Verify routing and account numbers
  - [ ] Proceed to next step

- [ ] **Step 5 - Review**: Confirm all information
  - Review all entered information
  - [ ] Complete onboarding

#### 2. **Home Screen** (After Onboarding)
- [ ] View today's shift summary
- [ ] See available shifts nearby
- [ ] Check pending shift applications
- [ ] View recent activity

#### 3. **Earnings Tab**
- [ ] View monthly earnings breakdown
- [ ] Check payment history
- [ ] See payout schedule
- [ ] View payment method
- [ ] Download earnings statements

#### 4. **Clock In/Out Tab**
- [ ] Clock in for shift
  - [ ] See elapsed time
  - [ ] View break tracking
  - [ ] Confirm location (if enabled)
- [ ] Clock out from shift
  - [ ] Confirm hours worked
  - [ ] Add notes if needed
- [ ] View recent clock records
- [ ] Check today's shift details

#### 5. **Shift Swap Tab**
- [ ] **Swap Requests** (Incoming)
  - [ ] View swap requests from colleagues
  - [ ] Accept or decline requests
  - [ ] See urgency levels
  - [ ] View swap details

- [ ] **Available Pickups** (Outgoing)
  - [ ] Browse available shifts to pick up
  - [ ] Filter by facility, date, rate
  - [ ] Request to pick up shifts
  - [ ] View pickup status

#### 6. **Profile Tab**
- [ ] View personal information
- [ ] Check background check status
- [ ] View certifications
- [ ] Update profile information
- [ ] Manage account settings
- [ ] View payment method
- [ ] Logout

---

## Key Features to Test

### Authentication
- [ ] Login with admin credentials
- [ ] Login with staff credentials
- [ ] Logout functionality
- [ ] Session persistence
- [ ] Token refresh

### Real-Time Updates
- [ ] Shift notifications appear instantly
- [ ] Application status updates
- [ ] Earnings calculations
- [ ] Clock in/out time tracking

### Data Validation
- [ ] Form validation on all inputs
- [ ] Error messages display correctly
- [ ] Required fields are enforced
- [ ] Phone number formatting
- [ ] Date formatting

### Navigation
- [ ] Tab bar navigation works smoothly
- [ ] Back button functionality
- [ ] Deep linking works
- [ ] Screen transitions are smooth

### Responsive Design
- [ ] App works on different screen sizes
- [ ] Text is readable on all devices
- [ ] Buttons are easily tappable
- [ ] Layouts adapt to portrait/landscape

### Performance
- [ ] App loads quickly
- [ ] Lists scroll smoothly
- [ ] No lag when switching tabs
- [ ] Images load properly
- [ ] No memory leaks

---

## Testing Workflow

### For Admin Testing:
1. Open Expo Go
2. Scan QR code or enter link
3. Wait for app to load
4. Log in as admin (if prompted)
5. Navigate through each section
6. Test create/edit/delete operations
7. Verify all data displays correctly

### For Staff Testing:
1. Open Expo Go
2. Scan QR code or enter link
3. Wait for app to load
4. Complete onboarding (if first time)
5. Navigate through each section
6. Test clock in/out
7. Test shift swap requests
8. Verify earnings display

---

## Troubleshooting

### App Won't Load
- [ ] Check internet connection
- [ ] Restart Expo Go
- [ ] Scan QR code again
- [ ] Clear Expo cache

### Login Issues
- [ ] Verify credentials are correct
- [ ] Check if account exists
- [ ] Try logging out and back in
- [ ] Restart the app

### Performance Issues
- [ ] Close other apps
- [ ] Restart Expo Go
- [ ] Check device storage
- [ ] Update Expo Go to latest version

### Data Not Updating
- [ ] Pull to refresh
- [ ] Switch tabs and back
- [ ] Restart the app
- [ ] Check internet connection

---

## Reporting Issues

When reporting issues, please include:
1. **Device**: iPhone/Android model
2. **OS Version**: iOS/Android version
3. **Expo Go Version**: Latest version number
4. **Steps to Reproduce**: Exact steps to trigger the issue
5. **Expected Behavior**: What should happen
6. **Actual Behavior**: What actually happened
7. **Screenshots**: If applicable

---

## Testing Timeline

- **Week 1**: Admin dashboard and staff management
- **Week 2**: Shift creation and applications
- **Week 3**: Staff onboarding flow
- **Week 4**: Clock in/out and earnings
- **Week 5**: Shift swapping and notifications
- **Week 6**: Final polish and edge cases

---

## Notes

- Both apps share the same backend
- Admin and staff roles are separate
- Data persists across sessions
- Real-time updates use WebSocket connections
- All features are fully functional in Expo Go
