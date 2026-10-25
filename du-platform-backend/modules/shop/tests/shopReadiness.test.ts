import { beforeAll, afterAll, afterEach, it, expect, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  publicShopReadiness,
  assertQuoteReadiness,
  assertOrderRequestReadiness,
} from "../shopReadiness";
import { SHOP_READINESS_CHECKS } from "../../../../shared/shopReadiness";
let dir: string, file: string;
const now = Date.parse("2026-10-23T12:00:00Z");
const approval = () => ({
  version: 1,
  market: "Europe",
  currency: "EUR",
  reviewedAt: new Date(Date.now() - 60000).toISOString(),
  validUntil: new Date(Date.now() + 86400000).toISOString(),
  approvedBy: "fixture-owner@example.test",
  destinationCountries: [{ code: "DE", names: ["Germany", "Deutschland"] }],
  approvedProductIds: [1],
  checks: Object.fromEntries(
    SHOP_READINESS_CHECKS.map(key => [
      key,
      { approved: true, evidence: `private-fixture-evidence/${key}` },
    ])
  ),
});
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "du-readiness-gate-"));
  file = path.join(dir, "approval.json");
});
afterAll(async () => rm(dir, { recursive: true, force: true }));
afterEach(() => vi.unstubAllEnvs());
const configure = (mode: string) => {
  vi.stubEnv("SHOP_COMMERCIAL_MODE", mode);
  vi.stubEnv("SHOP_PILOT_APPROVAL_FILE", file);
};
it("defaults to honest report-only compatibility without silently activating a production gate", async () => {
  vi.stubEnv("SHOP_COMMERCIAL_MODE", "");
  vi.stubEnv("SHOP_PILOT_APPROVAL_FILE", "");
  const state = await publicShopReadiness();
  expect(state.mode).toBe("observe");
  expect(state.commercialReady).toBe(false);
  expect(state.missing).toContain("backup_restore");
  await expect(
    assertQuoteReadiness("Legacy destination", [1], "USD")
  ).resolves.toMatchObject({ enforcement: "report_only" });
});
it("blocks new quotes in enforced prelaunch and fails closed on a mistyped mode", async () => {
  await writeFile(file, JSON.stringify(approval()), { mode: 0o600 });
  for (const mode of ["prelaunch", "pilto"]) {
    configure(mode);
    await expect(
      assertQuoteReadiness("Germany", [1], "EUR")
    ).rejects.toMatchObject({ status: 409 });
  }
});
it("requires complete current evidence, explicit country names, EUR and approved products", async () => {
  await writeFile(file, JSON.stringify(approval()));
  configure("pilot");
  await expect(
    assertQuoteReadiness(" Deutschland ", [1], "EUR")
  ).resolves.toMatchObject({ commercialReady: true });
  for (const [country, ids, currency] of [
    ["Europe", [1], "EUR"],
    ["France", [1], "EUR"],
    ["Germany", [2], "EUR"],
    ["Germany", [1], "USD"],
  ] as const) {
    await expect(
      assertQuoteReadiness(country, Array.from(ids), currency)
    ).rejects.toMatchObject({ status: 409 });
  }
  const publicState = await publicShopReadiness();
  expect(publicState.destinationCountries).toEqual(["DE"]);
  expect(JSON.stringify(publicState)).not.toMatch(
    /fixture-owner|private-fixture-evidence|approval.json/
  );
});
it("rechecks revoked or missing evidence without restart and rejects expired, future and malformed approvals", async () => {
  configure("pilot");
  const missing = approval();
  missing.checks.product_facts.approved = false;
  await writeFile(file, JSON.stringify(missing));
  expect((await publicShopReadiness()).missing).toContain("product_facts");
  await expect(
    assertQuoteReadiness("Germany", [1], "EUR")
  ).rejects.toMatchObject({ status: 409 });
  for (const dates of [
    { reviewedAt: "2026-10-21T00:00:00Z", validUntil: "2026-10-22T00:00:00Z" },
    { reviewedAt: "2026-10-24T00:00:00Z", validUntil: "2026-10-25T00:00:00Z" },
  ]) {
    await writeFile(file, JSON.stringify({ ...approval(), ...dates }));
    expect((await publicShopReadiness(process.env, now)).commercialReady).toBe(
      false
    );
  }
  await writeFile(file, "{}");
  expect((await publicShopReadiness()).commercialReady).toBe(false);
  await rm(file);
  expect((await publicShopReadiness()).commercialReady).toBe(false);
});

it("keeps converted request estimates separate from final EUR quote approval", async () => {
  await writeFile(file, JSON.stringify(approval()));
  configure("pilot");
  await expect(
    assertOrderRequestReadiness("Germany", [1])
  ).resolves.toMatchObject({ commercialReady: true });
  await expect(
    assertQuoteReadiness("Germany", [1], "USD")
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    assertOrderRequestReadiness("France", [1])
  ).rejects.toMatchObject({ status: 409 });
  await expect(
    assertOrderRequestReadiness("Germany", [2])
  ).rejects.toMatchObject({ status: 409 });
  configure("prelaunch");
  await expect(
    assertOrderRequestReadiness("Germany", [1])
  ).rejects.toMatchObject({ status: 409 });
});
