import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
test("previews cannot proxy requests to production and are noindex", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "du-preview-"));
  try {
    const target = path.join(dir, "vercel.json");
    await fs.copyFile("vercel.json", target);
    execFileSync(process.execPath, ["scripts/prepare-preview.mjs", target]);
    const config = JSON.parse(await fs.readFile(target, "utf8"));
    assert.equal(
      config.rewrites.find(r => r.source === "/api/:path*").destination,
      "/preview-api-unavailable.json"
    );
    assert(!config.rewrites.some(r => /du-api|https:/.test(r.destination)));
    assert(
      config.headers.some(r =>
        r.headers.some(
          h => h.key === "X-Robots-Tag" && h.value.includes("noindex")
        )
      )
    );
    const workflow = await fs.readFile(".github/workflows/ci-cd.yml", "utf8");
    const previewJob = workflow.slice(
      workflow.indexOf("deploy-vercel-preview:")
    );
    assert(
      previewJob.includes("github.event.pull_request.draft == false"),
      "Draft review must not deploy an external preview"
    );
    const prepareIndex = previewJob.indexOf("node scripts/prepare-preview.mjs");
    const deployIndex = previewJob.indexOf("vercel deploy --yes");
    assert(
      prepareIndex >= 0 && deployIndex > prepareIndex,
      "Preview isolation must run before the deploy command, including captured-URL commands"
    );
    assert(!workflow.includes("self-hosted"));
    assert(workflow.includes("run: node scripts/tests/pilot-preview.mjs"));
    const seo = await fs.readFile("du-platform-frontend/scripts/tests/seo-build.mjs", "utf8");
    assert(seo.includes('process.env.VERCEL_ENV === "preview"'));
    assert(seo.includes('"/preview-api-unavailable.json"'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
test("frontend CSP restricts executable content while allowing required assets", async () => {
  const config = JSON.parse(await fs.readFile("vercel.json", "utf8"));
  const policy = config.headers
    .find(r => r.source === "/(.*)")
    .headers.find(h => h.key === "Content-Security-Policy").value;
  assert(policy.includes("script-src 'self' https://va.vercel-scripts.com"));
  assert(!/script-src[^;]*(?:unsafe-inline|unsafe-eval|\*)/.test(policy));
  for (const directive of [
    "object-src 'none'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    "media-src 'self' blob: data:",
  ])
    assert(policy.includes(directive));
});
test("repair builds and CI never require the production API", async () => {
  const docker = await fs.readFile("deploy/oracle/Dockerfile", "utf8");
  assert(docker.includes("DU_CATALOGUE_STRATEGY=omit pnpm build"));
  const workflow = await fs.readFile(".github/workflows/ci-cd.yml", "utf8");
  assert(
    workflow.includes(
      'DU_PUBLIC_CATALOGUE_FILE="$RUNNER_TEMP/du-catalogue.json" pnpm build'
    )
  );
  const builder = await fs.readFile(
    "du-platform-frontend/scripts/build-route-documents.mjs",
    "utf8"
  );
  assert(
    builder.includes(
      'process.env.VERCEL_ENV === "production" && (fixture || omit)'
    )
  );
  assert(builder.includes('catalogue.data?.source !== "db"'));
});

test("Docker build context excludes local credentials and certificate keys", async () => {
  const ignores = (await fs.readFile(".dockerignore", "utf8")).split(/\r?\n/);
  for (const entry of [
    ".git",
    ".env*",
    "**/.env*",
    ".cert",
    ".aws",
    ".codex",
    ".agents",
    "private",
    ".vercel",
  ])
    assert(
      ignores.includes(entry),
      `Missing private context exclusion: ${entry}`
    );
});
test("preview verification keeps credentials in the environment, never system-curl flags", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "du-preview-cli-"));
  try {
    const executable = path.join(dir, "vercel");
    await fs.writeFile(
      executable,
      `#!/usr/bin/env node
const fs=require('node:fs');
const args=process.argv.slice(2);
if(args[0]!=='curl'||args.includes('--token')||process.env.VERCEL_TOKEN!=='fixture-preview-token')process.exit(2);
const route=args[1];
fs.appendFileSync(process.env.PREVIEW_CLI_CALLS,route+'\\n');
const body=route.startsWith('/api/')?JSON.stringify({error:{code:'PREVIEW_API_DISABLED'}}):'<main class="public-preview"><a href="https://www.diasporaunlocked.com'+route+'">Page</a></main><meta name="du-order-status-version" content="1">';
process.stdout.write('HTTP/2 200\\r\\nx-robots-tag: noindex, nofollow\\r\\ncontent-security-policy: script-src \\'self\\'\\r\\n\\r\\n'+body);
`,
      { mode: 0o700 }
    );
    const { spawnSync } = await import("node:child_process");
    const calls = path.join(dir, "calls");
    const env = {
      ...process.env,
      PATH: dir + path.delimiter + process.env.PATH,
      VERCEL_TOKEN: "fixture-preview-token",
      PREVIEW_CLI_CALLS: calls,
      PILOT_PREVIEW_URL: "https://isolated-fixture.vercel.app",
    };
    const verified = spawnSync(
      process.execPath,
      ["scripts/tests/pilot-preview.mjs"],
      { env, encoding: "utf8" }
    );
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(
      (await fs.readFile(calls, "utf8")).trim().split("\n").length,
      13
    );
    await fs.unlink(calls);
    const refused = spawnSync(
      process.execPath,
      ["scripts/tests/pilot-preview.mjs"],
      {
        env: { ...env, PILOT_PREVIEW_URL: "https://www.diasporaunlocked.com" },
        encoding: "utf8",
      }
    );
    assert.notEqual(refused.status, 0);
    await assert.rejects(fs.access(calls));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test("Oracle release explicitly defaults to enforced prelaunch without an approval placeholder", async () => {
  const docker = await fs.readFile("deploy/oracle/Dockerfile", "utf8");
  assert(docker.includes("SHOP_COMMERCIAL_MODE=prelaunch"));
  assert(!docker.includes("SHOP_PILOT_APPROVAL_FILE="));
  const workflow = await fs.readFile(".github/workflows/ci-cd.yml", "utf8");
  assert(workflow.includes("pnpm test:e2e:prelaunch"));
  assert(workflow.includes("pnpm test:recovery:custody"));
});
