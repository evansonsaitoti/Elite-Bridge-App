import type { ExpoConfig } from "expo/config";

const env = {
  appName: "Elite Bridge",
  appSlug: "elitebridge-mobile",
  scheme: "elitebridge",
  iosBundleId: "com.app.elitebridgemobile",
  androidPackage: "com.app.elitebridgemobile",
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    buildNumber: "18",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSMicrophoneUsageDescription: "Elite Bridge needs microphone access for voice communication.",
      NSLocationWhenInUseUsageDescription:
        "Elite Bridge records your location only when you clock in or out of a scheduled visit.",
    },
  },
  android: {
    package: env.androidPackage,
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: "./assets/images/elitebridge-logo.png",
        imageWidth: 210,
        resizeMode: "contain",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
  ],
};

export default config;
