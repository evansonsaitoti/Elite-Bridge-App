const { getDefaultConfig } = require("expo/metro-config");
const { mergeConfig } = require("@react-native/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = mergeConfig(config, {
  // Add any custom Metro configuration here
});
