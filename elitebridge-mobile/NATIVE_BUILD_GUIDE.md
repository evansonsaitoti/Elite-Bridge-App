# Elite Bridge - Bare React Native Build Guide

Your app has been successfully converted from Expo to bare React Native. Here's how to build and publish it.

## Prerequisites

### For iOS (Mac Required)
- macOS 12+
- Xcode 14+ (from App Store)
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer Account ($99/year)

### For Android (Any OS)
- Android Studio
- JDK 11+
- Android SDK 31+
- Google Play Developer Account ($25 one-time)

---

## iOS Build Instructions (on your Mac)

### Step 1: Install Dependencies
```bash
cd ios
pod install
cd ..
```

### Step 2: Open in Xcode
```bash
open ios/projecttitle.xcworkspace
```

### Step 3: Configure Signing
1. In Xcode, select "projecttitle" in the left navigator
2. Go to **Signing & Capabilities**
3. Select your team
4. Update Bundle Identifier to: `com.elitebridge.staffing`

### Step 4: Build for Testing
```bash
cd ios
xcodebuild -workspace projecttitle.xcworkspace -scheme projecttitle -configuration Debug -derivedDataPath build
cd ..
```

### Step 5: Build for App Store
```bash
cd ios
xcodebuild -workspace projecttitle.xcworkspace \
  -scheme projecttitle \
  -configuration Release \
  -derivedDataPath build \
  -archivePath build/projecttitle.xcarchive \
  archive
cd ..
```

### Step 6: Export IPA
1. Open Xcode Organizer (Cmd+Shift+2)
2. Select the archive
3. Click "Distribute App"
4. Choose "App Store Connect"
5. Follow the prompts

### Step 7: Submit to App Store
1. Go to App Store Connect (https://appstoreconnect.apple.com)
2. Create a new app
3. Upload the IPA
4. Fill in app details, screenshots, description
5. Submit for review

---

## Android Build Instructions

### Step 1: Generate Signing Key
```bash
keytool -genkey -v -keystore elite-bridge-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias elite-bridge-key
```

### Step 2: Configure Gradle Signing
Edit `android/app/build.gradle`:
```gradle
android {
  ...
  signingConfigs {
    release {
      storeFile file('elite-bridge-key.keystore')
      storePassword 'YOUR_STORE_PASSWORD'
      keyAlias 'elite-bridge-key'
      keyPassword 'YOUR_KEY_PASSWORD'
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
    }
  }
}
```

### Step 3: Build APK
```bash
cd android
./gradlew assembleRelease
cd ..
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Step 4: Build AAB (Recommended for Play Store)
```bash
cd android
./gradlew bundleRelease
cd ..
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 5: Submit to Google Play
1. Go to Google Play Console (https://play.google.com/console)
2. Create a new app
3. Upload the AAB
4. Fill in app details, screenshots, description
5. Submit for review

---

## Project Structure

```
ios/
  projecttitle.xcodeproj/     ← Xcode project
  projecttitle/                ← iOS app source
  Podfile                       ← CocoaPods dependencies

android/
  app/                          ← Android app module
  gradle/                       ← Gradle configuration
  build.gradle                  ← Root build config
  settings.gradle               ← Project settings

app/                            ← React Native code (shared)
server/                         ← Backend API
```

---

## Troubleshooting

### iOS: Pod installation fails
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

### Android: Gradle build fails
```bash
cd android
./gradlew clean
./gradlew assembleRelease
cd ..
```

### App crashes on startup
1. Check Xcode/Android Studio logs
2. Verify all native modules are properly linked
3. Ensure all dependencies are installed

---

## Key Differences from Expo

- **No Expo Go**: App runs as true native app
- **Direct native access**: Can use any native library
- **Manual signing**: You manage certificates and keys
- **Build time**: ~5-10 minutes per platform
- **Size**: Larger app size (~50-100MB)

---

## Next Steps

1. **Test on device**: Build and run on iOS/Android devices
2. **Create app listings**: Set up on App Store Connect and Google Play Console
3. **Prepare screenshots**: Create 5+ screenshots per platform
4. **Write description**: Compelling app description
5. **Set pricing**: Free or paid
6. **Submit for review**: Apple (1-3 days), Google (2-4 hours)

---

## Support

For issues:
- iOS: Check Xcode build logs
- Android: Check Android Studio logcat
- React Native: Check Metro bundler output
- Backend: Check server logs in `server/`

Good luck with your Elite Bridge app launch! 🚀
