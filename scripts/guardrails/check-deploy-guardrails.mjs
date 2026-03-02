import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const workflowPath = path.join(rootDir, ".github", "workflows", "ci-cd.yml");

function fail(message) {
  console.error(`[guardrails:deploy] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(workflowPath)) {
  fail(`Missing file: ${workflowPath}`);
}

const source = fs.readFileSync(workflowPath, "utf8");

if (/vercel\s+deploy[^\n]*--prebuilt/.test(source)) {
  fail("Found `vercel deploy --prebuilt`. Use source builds on Vercel to avoid stale output deploys.");
}

if (/^\s*run:\s*vercel\s+build\s*$/m.test(source)) {
  fail("Found `vercel build` in CI deploy flow. Deploy should build from source on Vercel.");
}

if (!/vercel\s+deploy[^\n]*--prod/.test(source)) {
  fail("Missing production deploy command with `--prod`.");
}

console.log("[guardrails:deploy] OK");
