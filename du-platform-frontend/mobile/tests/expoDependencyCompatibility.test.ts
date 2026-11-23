import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// Exercise the consumers of the narrowly scoped overrides, using the versions
// Expo actually resolves. A green audit alone does not prove a major is usable.
const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve("expo/package.json"));
const cliRoot = dirname(expoRequire.resolve("@expo/cli/package.json"));
const metroRoot = dirname(expoRequire.resolve("@expo/metro-config/package.json"));
const fingerprintRoot = dirname(expoRequire.resolve("@expo/fingerprint/package.json"));
const cliGlob = require(join(cliRoot, "build/src/utils/glob.js"));
const { resolveXcodeProject } = require(join(cliRoot, "build/src/run/ios/options/resolveXcodeProject.js"));
const { globAllPackageJsonPaths } = require(join(metroRoot, "build/getWatchFolders.js"));
const fingerprintPaths = require(join(fingerprintRoot, "build/utils/Path.js"));
const cliGlobPackage = createRequire(join(cliRoot, "package.json"))("glob");

describe("Expo dependency compatibility", () => {
  let root: string;
  const file = (path: string, content = "fixture") => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return target;
  };

  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "du-expo-compat-")); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it("keeps CLI async discovery and first-match cancellation bounded", async () => {
    file("src/screen.tsx");
    file("src/.hidden.ts");
    file("node_modules/ignored.ts");
    const options = { cwd: root, dot: true, nodir: true, ignore: ["**/node_modules/**"] };
    expect((await cliGlob.everyMatchAsync("**/*.{ts,tsx}", options)).sort())
      .toEqual(["src/.hidden.ts", "src/screen.tsx"]);
    const first = await cliGlob.anyMatchAsync("**/*.{ts,tsx}", options);
    expect(first).toHaveLength(1);
    expect(["src/.hidden.ts", "src/screen.tsx"]).toContain(first[0]);
    expect(await cliGlob.anyMatchAsync("**/*.missing", options)).toEqual([]);
  });

  it("keeps native template basename matching, dotfiles and directory exclusion", () => {
    file("android/app/src/Main.kt");
    file("ios/.hidden.plist");
    file("ios/Info.plist");
    mkdirSync(join(root, "Directory.plist"));
    expect(cliGlobPackage.sync(["*.kt", "*.plist"], {
      cwd: root, matchBase: true, dot: true, follow: false, nodir: true,
    }).sort()).toEqual(["android/app/src/Main.kt", "ios/.hidden.plist", "ios/Info.plist"]);
  });

  it("keeps Metro workspace discovery from including vendored package trees", () => {
    const visible = file("packages/mobile/package.json", "{}");
    file("packages/broken/package.json", "invalid JSON");
    file("packages/vendor/node_modules/nested/package.json", "{}");
    file("packages/native/Pods/nested/package.json", "{}");
    file("packages/native/Carthage/nested/package.json", "{}");
    expect(globAllPackageJsonPaths(root, ["packages/**"]).sort()).toEqual([visible]);
  });

  it("keeps Xcode workspace preference and the project fallback", () => {
    const project = join(root, "ios/Fixture.xcodeproj");
    const workspace = join(root, "ios/Fixture.xcworkspace");
    mkdirSync(project, { recursive: true });
    expect(resolveXcodeProject(root)).toEqual({ name: project, isWorkspace: false });
    mkdirSync(workspace);
    expect(resolveXcodeProject(root)).toEqual({ name: workspace, isWorkspace: true });
  });

  it("keeps fingerprint dotfile exclusions and negated path exceptions", () => {
    const patterns = fingerprintPaths.buildPathMatchObjects([
      "generated/**", "!generated/keep.ts", "**/.cache/**",
    ]);
    expect(fingerprintPaths.isIgnoredPathWithMatchObjects("generated/drop.ts", patterns)).toBe(true);
    expect(fingerprintPaths.isIgnoredPathWithMatchObjects("generated/keep.ts", patterns)).toBe(false);
    expect(fingerprintPaths.isIgnoredPathWithMatchObjects("src/.cache/file", patterns)).toBe(true);
    expect(fingerprintPaths.isIgnoredPathWithMatchObjects("src/real.ts", patterns)).toBe(false);
    // Pruning the entire generated directory would lose the explicit exception.
    expect(fingerprintPaths.isIgnoredPathWithMatchObjects(
      "generated", fingerprintPaths.buildDirMatchObjects(patterns),
    )).toBe(false);
  });
});
