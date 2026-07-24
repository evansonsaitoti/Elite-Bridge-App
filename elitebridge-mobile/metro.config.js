const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const isCI =
  process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Xcode and expo-updates run Metro headlessly in CI. Writing the compiled
  // styles to disk avoids the virtual-module timing race during an archive.
  forceWriteFileSystem: isCI,
  // NativeWind types are already included explicitly in tsconfig.json.
  disableTypeScriptGeneration: true,
});
