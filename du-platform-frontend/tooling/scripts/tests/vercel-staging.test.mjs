import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("Vercel source staging includes only public web source", async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), "du-vercel-source-"));
  const target = path.join(parent, "staged");
  try {
    execFileSync(process.execPath, ["du-platform-frontend/tooling/scripts/prepare-vercel-source.mjs", target]);
    assert.deepEqual((await fs.readdir(target)).sort(), [".vercelignore", "du-platform-frontend"]);
    assert.deepEqual(await fs.readdir(path.join(target, "du-platform-frontend")), ["web"]);
    const web = path.join(target, "du-platform-frontend/web");
    await fs.access(path.join(web, "package.json"));
    await fs.access(path.join(web, "vercel.json"));
    for (const privateName of [".env", ".env.example", ".cert", ".vercel", "node_modules", "dist"])
      await assert.rejects(fs.access(path.join(web, privateName)), { code: "ENOENT" });
    assert.throws(() => execFileSync(process.execPath, ["du-platform-frontend/tooling/scripts/prepare-vercel-source.mjs", target], { stdio: "ignore" }));
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});

test("CI pins pnpm and stages web-only source for both Vercel deployments", async () => {
  const workflow = await fs.readFile(".github/workflows/ci-cd.yml", "utf8");
  const setupCount = [...workflow.matchAll(/uses: pnpm\/action-setup@v4/g)].length;
  const pinnedCount = [...workflow.matchAll(/uses: pnpm\/action-setup@v4\s+with:\s+version: 10\.4\.1/g)].length;
  assert(setupCount > 0);
  assert.equal(pinnedCount, setupCount, "Every CI job must select pnpm without a root package manifest");
  assert.equal([...workflow.matchAll(/name: Prepare isolated Vercel source/g)].length, 2);
  assert(workflow.includes('prepare-preview.mjs "$RUNNER_TEMP/du-vercel-stage/du-platform-frontend/web/vercel.json"'));
});
