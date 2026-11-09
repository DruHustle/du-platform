import fs from "node:fs";
import path from "node:path";
import {
  backendTarget,
  TRACKED_API_ORIGIN,
} from "../lib/backend-deployment.mjs";

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
try {
  backendTarget();
} catch (error) {
  fail(error.message);
}
const vercel = JSON.parse(
  fs.readFileSync(
    path.join(rootDir, "du-platform-frontend/web/vercel.json"),
    "utf8"
  )
);
if (!vercel.buildCommand.startsWith("VITE_API_URL=/api ")) {
  fail(
    "Vercel builds must use the configured same-origin API proxy, overriding stale dashboard API settings."
  );
}
if (!source.includes("test:seo")) {
  fail("CI must verify the browser output before publishing.");
}
if (vercel.git?.deploymentEnabled !== false) {
  fail(
    "GitHub Actions must be the only automatic deployer; duplicate Git deployments waste storage and bypass CI gates."
  );
}
if (
  !vercel.buildCommand.includes("pnpm build") ||
  vercel.outputDirectory !== "dist"
) {
  fail(
    "Vercel must build and publish only the static frontend; backend releases use the selected verified host."
  );
}

if (
  vercel.rewrites.find(rule => rule.source === "/api/:path*")?.destination !==
  `${TRACKED_API_ORIGIN}/api/:path*`
) {
  fail(
    "The tracked Vercel config must preserve the current Render proxy. Production staging still requires the verified Render release."
  );
}
for (const filename of fs.readdirSync(
  path.join(rootDir, ".github", "workflows")
)) {
  const workflow = fs.readFileSync(
    path.join(rootDir, ".github", "workflows", filename),
    "utf8"
  );
  if (/https?:\/\/[a-z0-9.-]+\.onrender\.com/i.test(workflow))
    fail(
      `${filename} must select a verified Render origin from configuration, not hardcode a service hostname.`
    );
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

function job(id) {
  const start = source.indexOf(`  ${id}:\n`);
  if (start < 0) return "";
  const remaining = source.slice(start + 2);
  const end = remaining.search(/\n  [a-z][a-z0-9-]+:\n/);
  return end < 0 ? remaining : remaining.slice(0, end);
}

const render = job("deploy-render-production"),
  production = job("deploy-vercel-production");
if (job("deploy-oracle-production") || /wait-for-oracle-release|Deploy to Oracle/.test(source))
  fail("VM production deployment is retired; do not restore the Oracle poller handshake.");
for (const [name, release] of [["Render", render]]) {
  for (const required of [
    "needs: build-and-test",
    "github.ref == 'refs/heads/main'",
    "github.event_name == 'push'",
    "needs.build-and-test.result == 'success'",
    "EXPECTED_REVISION: ${{ github.sha }}",
  ])
    if (!release.includes(required))
      fail(
        `${name} production releases must depend on the complete main-commit quality gate and exact tested revision.`
      );
}
if (
  !render.includes("(vars.DU_BACKEND_HOST == '' || vars.DU_BACKEND_HOST == 'render')") ||
  !render.includes("deploy-render-production.mjs") ||
  !render.includes("RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}")
)
  fail("Render must be the only configured, tested-commit production release.");
for (const required of [
  "needs: [build-and-test, deploy-render-production]",
  "always() && !cancelled()",
  "github.ref == 'refs/heads/main'",
  "github.event_name == 'push'",
  "needs.build-and-test.result == 'success'",
  "(vars.DU_BACKEND_HOST == '' || vars.DU_BACKEND_HOST == 'render')",
  "needs.deploy-render-production.result == 'success'",
  'prepare-vercel-source.mjs "$RUNNER_TEMP/du-vercel-stage" --production',
  "EXPECTED_REVISION: ${{ github.sha }}",
  "VERIFIED_BACKEND_REVISION: ${{ needs.deploy-render-production.outputs.revision }}",
  "VERIFIED_RENDER_ORIGIN: ${{ needs.deploy-render-production.outputs.origin }}",
  "VERIFIED_RENDER_SERVICE_ID: ${{ needs.deploy-render-production.outputs.service_id }}",
  "VERIFIED_RENDER_WORKSPACE_ID: ${{ needs.deploy-render-production.outputs.workspace_id }}",
  "VERIFIED_RENDER_DEPLOY_ID: ${{ needs.deploy-render-production.outputs.deploy_id }}",
  "run: node du-platform-frontend/tooling/scripts/tests/verify-backend-release.mjs\n",
])
  if (!production.includes(required))
    fail(
      "Vercel production requires the Render backend's successful release, matching staging evidence and post-cutover API verification."
    );
console.log("[guardrails:deploy] OK");
