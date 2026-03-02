import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const viteConfigPath = path.join(rootDir, "vite.config.ts");

function fail(message) {
  console.error(`[guardrails:vite] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(viteConfigPath)) {
  fail(`Missing file: ${viteConfigPath}`);
}

const source = fs.readFileSync(viteConfigPath, "utf8");

const hasManualChunks = /\bmanualChunks\s*\(/.test(source);
if (hasManualChunks) {
  fail(
    "Detected build.rollupOptions.output.manualChunks in vite.config.ts. " +
      "This has caused production-only runtime failures in this project. " +
      "If you truly need it, use a separate reviewed RFC and update this guardrail intentionally."
  );
}

const guardedPackages = ["react", "react-dom", "react-i18next", "i18next"];
for (const pkg of guardedPackages) {
  const pattern = new RegExp(`vendor[-_]${pkg.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}`, "i");
  if (pattern.test(source)) {
    fail(`Detected custom vendor split hint for "${pkg}" in vite.config.ts.`);
  }
}

console.log("[guardrails:vite] OK");
