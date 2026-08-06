import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Elite Bridge Employer",
  slug: "elitebridge-employer",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "elitebridgeemployer",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.app.elitebridgeemployer",
    buildNumber: "1",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.app.elitebridgeemployer",
  },
  web: {
    bundler: "metro",
    output: "static",
  },
};

export default config;
