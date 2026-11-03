const fs = require("node:fs");
const path = require("node:path");
const { withFinalizedMod } = require("expo/config-plugins");

// Expo's template executes a command-substitution result without quoting it.
// Paths containing spaces then split before the script can run.
module.exports = function withQuotedIosBundle(config) {
  return withFinalizedMod(config, ["ios", async next => {
    const project = path.join(next.modRequest.platformProjectRoot, `${next.modRequest.projectName}.xcodeproj`, "project.pbxproj");
    const contents = fs.readFileSync(project, "utf8");
    const pattern = /`(\\"\$NODE_BINARY\\" --print \\"require\('path'\)\.dirname\(require\.resolve\('react-native\/package\.json'\)\) \+ '\/scripts\/react-native-xcode\.sh'\\")`/;
    if (!pattern.test(contents)) throw new Error("Could not find the Expo iOS bundle script to quote.");
    let output = contents.replace(pattern, (_, command) => `\\"$(${command})\\"`);
    // The dev-launcher plugin otherwise generates a fresh random phase ID on
    // every clean prebuild, producing meaningless native-project drift.
    const phase = /([A-F0-9]{24})(?= \/\* \[Expo Dev Launcher\] Strip Local Network Keys for Release \*\/)/g;
    const matches = [...output.matchAll(phase)];
    if (matches.length !== 2 || matches[0][1] !== matches[1][1]) throw new Error("Cannot identify the Expo dev-launcher build phase.");
    const stableId = "D1A570A00000000000000001";
    if (output.includes(stableId) && matches[0][1] !== stableId) throw new Error("Stable iOS phase ID is already in use.");
    output = output.replace(phase, stableId);
    fs.writeFileSync(project, output);
    return next;
  }]);
};
