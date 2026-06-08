# Elite Bridge - EAS Build & App Store Submission Guide

This guide covers building and publishing the Elite Bridge app to iOS App Store and Google Play Store using EAS Build (cloud-based builds).

## Prerequisites

- ✅ Expo account with token configured
- ✅ Apple Developer account ($99/year membership)
- ✅ Apple Team ID: `F42HSPN3W4`
- ✅ Google Play Developer account ($25 one-time)
- ✅ Node.js and pnpm installed
- ✅ EAS CLI installed (`pnpm install -g eas-cli`)

---

## Part 1: iOS App Store Submission

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in the form:
   - **Platform**: iOS
   - **Name**: "Elite Bridge"
   - **Primary Language**: English
   - **Bundle ID**: `com.app.elitebridgemobile`
   - **SKU**: `elitebridge-mobile-001` (any unique identifier)
4. Click **"Create"**

### Step 2: Configure App Information

In App Store Connect, fill in:

1. **App Information**:
   - **Subtitle**: "Healthcare Staffing Platform"
   - **Privacy Policy URL**: (if available)
   - **Category**: Medical

2. **Pricing and Availability**:
   - **Pricing Tier**: Free
   - **Availability**: Select countries where you want to distribute

3. **App Privacy**:
   - Answer the privacy questions (data collection, tracking, etc.)

### Step 3: Prepare App Screenshots & Metadata

You'll need:
- **App Icon**: 1024x1024 PNG (already in `assets/images/icon.png`)
- **Screenshots**: 
  - iPhone 6.7-inch: 2796x1290 px (at least 2 screenshots)
  - iPad 12.9-inch: 2048x2732 px (optional)
- **Description**: Write compelling app description
- **Keywords**: healthcare, staffing, caregiving, shifts
- **Support URL**: Your support website
- **Marketing URL**: (optional)

### Step 4: Build for iOS with EAS

Run the build command:

```bash
pnpm eas:build:ios
```

This will:
1. Authenticate with your Expo account
2. Ask for Apple credentials (use evasaitoti@gmail.com)
3. Create/download certificates and provisioning profiles
4. Build the iOS app in the cloud
5. Generate an `.ipa` file

**Build takes 10-15 minutes.** You can monitor progress at https://expo.dev/builds

### Step 5: Download and Upload to App Store Connect

Once the build completes:

1. Download the `.ipa` file from the EAS Build dashboard
2. Go to App Store Connect → Your App → **TestFlight** or **Prepare for Submission**
3. Click **"Build"** → **"+"** → Upload the `.ipa` using **Transporter**:
   ```bash
   xcrun altool --upload-app -f Elite\ Bridge.ipa -t ios -u evasaitoti@gmail.com -p <app-specific-password>
   ```
   
   Or use the GUI **Transporter** app (download from App Store)

### Step 6: Complete App Review Information

1. **Version Information**:
   - **Version Number**: 1.0.0
   - **Build Number**: 1

2. **App Review Information**:
   - **Contact Email**: evasaitoti@gmail.com
   - **Demo Account**: (if needed for testing)
   - **Notes**: Explain app functionality

3. **Advertising Identifier**:
   - Select "No" (unless using ads)

### Step 7: Submit for Review

1. Click **"Add for Review"**
2. Review all information
3. Click **"Submit for Review"**

**Review time**: Typically 24-48 hours

---

## Part 2: Google Play Store Submission

### Step 1: Create App in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **"Create App"**
3. Fill in:
   - **App name**: "Elite Bridge"
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
4. Click **"Create app"**

### Step 2: Configure App Details

In Google Play Console:

1. **App details**:
   - **Short description**: (80 characters max)
   - **Full description**: Detailed app description
   - **Category**: Medical
   - **Content rating**: Complete the questionnaire

2. **Graphics**:
   - **App icon**: 512x512 PNG
   - **Feature graphic**: 1024x500 PNG
   - **Screenshots**: 
     - Phone: 1080x1920 px (at least 2)
     - Tablet: 1440x2560 px (optional)

3. **Pricing & distribution**:
   - **Countries**: Select where to distribute
   - **Content rating**: Complete rating form
   - **Target audience**: Adults

### Step 3: Generate Android Signing Key

If you don't have a signing key, generate one:

```bash
keytool -genkey -v -keystore elite-bridge-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias elite-bridge-key \
  -storepass <password> \
  -keypass <password>
```

**Save this keystore file securely!** You'll need it for future updates.

### Step 4: Build for Android with EAS

```bash
pnpm eas:build:android
```

This will:
1. Ask for keystore password
2. Build the Android app in the cloud
3. Generate an `.aab` (Android App Bundle) file

### Step 5: Upload to Google Play Console

1. Download the `.aab` file from EAS Build dashboard
2. Go to Google Play Console → Your App → **Release** → **Production**
3. Click **"Create new release"**
4. Upload the `.aab` file
5. Review and confirm
6. Click **"Review release"** → **"Start rollout to production"**

---

## Automated Submission with EAS Submit

### iOS Submission

```bash
pnpm eas:submit:ios
```

This automatically:
- Uploads the `.ipa` to App Store Connect
- Submits for review

### Android Submission

```bash
pnpm eas:submit:android
```

This automatically:
- Uploads the `.aab` to Google Play Console
- Starts the rollout

---

## Troubleshooting

### Build Fails with "Certificate Error"

**Solution**: EAS Build will automatically create certificates. If it fails:
1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Revoke any old certificates
3. Retry the build

### "Bundle ID Mismatch"

**Solution**: Ensure bundle ID matches:
- iOS: `com.app.elitebridgemobile` (in app.config.ts)
- Android: `com.app.elitebridgemobile` (in app.config.ts)

### "Provisioning Profile Invalid"

**Solution**: 
1. Go to [Apple Developer Provisioning Profiles](https://developer.apple.com/account/resources/profiles/list)
2. Delete old profiles
3. Retry build (EAS will create new ones)

### "Android Keystore Password Incorrect"

**Solution**: Ensure you use the same password for both `-storepass` and `-keypass`

---

## Version Updates

When releasing a new version:

1. **Update version in app.config.ts**:
   ```ts
   version: "1.1.0"
   ```

2. **iOS**:
   - Version number auto-increments
   - Build number increments in App Store Connect

3. **Android**:
   - Update `versionCode` in `android/app/build.gradle`
   - Update `versionName` to match version in app.config.ts

4. **Rebuild and submit**:
   ```bash
   pnpm eas:build:ios
   pnpm eas:build:android
   pnpm eas:submit:ios
   pnpm eas:submit:android
   ```

---

## Important Notes

- **Keep your Apple Developer credentials secure** - Never commit them to git
- **Backup your Android keystore** - You'll need it for all future Android updates
- **Test thoroughly before submission** - Use TestFlight for iOS, internal testing for Android
- **Monitor app reviews** - Check App Store Connect and Google Play Console for rejection reasons
- **Update privacy policy** - Ensure it matches your app's data collection practices

---

## Support

For issues with EAS Build, visit: https://docs.expo.dev/build/introduction/

For App Store issues: https://developer.apple.com/support/

For Google Play issues: https://support.google.com/googleplay/
