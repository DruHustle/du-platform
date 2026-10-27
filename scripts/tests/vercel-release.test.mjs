import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { verifyAfterPropagation } from "./verify-published-site.mjs";

test("propagation retries require a successful complete verification", async () => {
  let calls = 0;
  const waits = [];
  await verifyAfterPropagation(
    () => ++calls === 3,
    ms => waits.push(ms)
  );
  assert.equal(calls, 3);
  assert.deepEqual(waits, [15000, 15000]);
});
test("persistent verification failures block release after bounded retries", async () => {
  let calls = 0;
  const waits = [];
  await assert.rejects(
    verifyAfterPropagation(
      () => {
        calls++;
        return false;
      },
      ms => waits.push(ms)
    )
  );
  assert.equal(calls, 4);
  assert.equal(waits.length, 3);
});
test("a successful verification does not wait or repeat", async () => {
  let calls = 0;
  await verifyAfterPropagation(
    () => {
      calls++;
      return true;
    },
    () => assert.fail("unexpected delay")
  );
  assert.equal(calls, 1);
});
test("rollback captures and validates the actual prior DU deployment", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "du-vercel-target-"));
  try {
    const file = path.join(dir, "deployment.json");
    for (const [data, valid] of [
      [
        { id: "dpl_Verified123", name: "du-platform", readyState: "READY" },
        true,
      ],
      [
        { id: "dpl_Other123", name: "other-project", readyState: "READY" },
        false,
      ],
      [
        { id: "dpl_Failed123", name: "du-platform", readyState: "ERROR" },
        false,
      ],
      [
        { id: "https://example.com", name: "du-platform", readyState: "READY" },
        false,
      ],
    ]) {
      await writeFile(file, JSON.stringify(data));
      const result = spawnSync(
        process.execPath,
        ["scripts/vercel-previous-target.mjs", file],
        { encoding: "utf8" }
      );
      assert.equal(result.status === 0, valid);
      if (valid)
        assert.equal(result.stdout.trim(), "deployment=dpl_Verified123");
      else assert(!result.stdout.includes("deployment="));
    }
    const workflow = await readFile(".github/workflows/ci-cd.yml", "utf8");
    assert(
      workflow.indexOf("Record current production target for rollback") <
        workflow.indexOf("- name: Deploy to Vercel Production")
    );
    assert(
      workflow.includes(
        'vercel rollback "${{ steps.previous_production.outputs.deployment }}"'
      )
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
