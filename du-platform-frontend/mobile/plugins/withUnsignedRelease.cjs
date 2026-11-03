const { withAppBuildGradle } = require("expo/config-plugins");

// The Expo template signs release builds with the public debug key. Keep
// release output unsigned until real store credentials are configured.
module.exports = function withUnsignedRelease(config) {
  return withAppBuildGradle(config, next => {
    const pattern = /(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!pattern.test(next.modResults.contents)) {
      throw new Error("Cannot locate the template's release signing configuration.");
    }
    next.modResults.contents = next.modResults.contents.replace(pattern, "$1// Release signing must be configured with store credentials.");
    return next;
  });
};
