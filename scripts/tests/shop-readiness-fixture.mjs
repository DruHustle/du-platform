import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
export const readyShop = ids => ({
  mode: "pilot",
  enforcement: "enforced",
  commercialReady: true,
  missing: [],
  destinationCountries: ["DE", "ZW"],
  approvedProductIds: ids,
});
// Synthetic approval used only by isolated browsers; never a deployment input.
export async function createShopApprovalFixture(ids) {
  const directory = await mkdtemp(
    path.join(tmpdir(), "du-shop-test-approval-")
  );
  const file = path.join(directory, "approval.json");
  await writeFile(
    file,
    JSON.stringify({
      version: 1,
      market: "Europe",
      currency: "EUR",
      reviewedAt: new Date(Date.now() - 60000).toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString(),
      approvedBy: "fixture@example.test",
      destinationCountries: [
        { code: "DE", names: ["Germany"] },
        { code: "ZW", names: ["Zimbabwe"] },
      ],
      approvedProductIds: ids,
      checks: Object.fromEntries(
        [
          "operator_identity",
          "procedures",
          "delivery",
          "product_facts",
          "unit_economics",
          "backup_restore",
          "transactional_email",
        ].map(k => [
          k,
          {
            approved: true,
            evidence: "Isolated synthetic fixture, not commercial approval",
          },
        ])
      ),
    })
  );
  return {
    env: { SHOP_COMMERCIAL_MODE: "pilot", SHOP_PILOT_APPROVAL_FILE: file },
    close: () => rm(directory, { recursive: true, force: true }),
  };
}
