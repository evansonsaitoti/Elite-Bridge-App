import type { ExpoConfig } from "expo/config";

const env = {
  appName: "Elite Bridge Admin",
  appSlug: "elitebridge-mobile",
  scheme: "elitebridge-admin",
  iosBundleId: "com.app.elitebridgeadmin",
  androidPackage: "com.app.elitebridgeadmin",
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
      backgroundColor: "#E6F4FE",
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
