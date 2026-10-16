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
const vercel = JSON.parse(
  fs.readFileSync(path.join(rootDir, "vercel.json"), "utf8")
);
if (!vercel.buildCommand.startsWith("VITE_API_URL=/api ")) {
  fail(
    "Vercel builds must use the configured same-origin API proxy, overriding stale dashboard API settings."
  );
}
if (!vercel.buildCommand.includes("pnpm test:seo")) {
  fail("Vercel must verify its actual browser output before publishing.");
}

if (
  vercel.rewrites.find(rule => rule.source === "/api/:path*")?.destination !==
  "https://du-api.152-70-22-84.sslip.io/api/:path*"
) {
  fail("The Vercel API proxy must target the Oracle backend.");
}
for (const filename of fs.readdirSync(
  path.join(rootDir, ".github", "workflows")
)) {
  const workflow = fs.readFileSync(
    path.join(rootDir, ".github", "workflows", filename),
    "utf8"
  );
  if (/onrender\.com|\bRENDER_[A-Z_]+\b/i.test(workflow))
    fail(`${filename} still depends on retired hosting configuration.`);
}
for (const filename of ["render.yaml", "render.yml"]) {
  if (fs.existsSync(path.join(rootDir, filename)))
    fail(`Remove retired deployment manifest ${filename}.`);
}

if (/vercel\s+deploy[^\n]*--prebuilt/.test(source)) {
  fail(
    "Found `vercel deploy --prebuilt`. Use source builds on Vercel to avoid stale output deploys."
  );
}

if (/^\s*run:\s*vercel\s+build\s*$/m.test(source)) {
  fail(
    "Found `vercel build` in CI deploy flow. Deploy should build from source on Vercel."
  );
}

if (!/vercel\s+deploy[^\n]*--prod/.test(source)) {
  fail("Missing production deploy command with `--prod`.");
}

console.log("[guardrails:deploy] OK");
