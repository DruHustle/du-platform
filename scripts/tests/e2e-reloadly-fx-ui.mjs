import { chromium } from "playwright";

const baseUrl = String(process.env.E2E_BASE_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyImmediateTransferDoesNotUseRemittanceFx(page, transferTestId) {
  await page.goto(`${baseUrl}/payments`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.getByTestId(transferTestId).click();
  await page.locator('input[type="number"]').nth(0).fill("10");

  const fxTextCount = await page.getByText("1 EUR = 1.070000 USD").count();
  assert(fxTextCount === 0, `${transferTestId} is still using the remittance FX fallback.`);

  const summaryStripCount = await page.getByText("FX Rate").count();
  assert(summaryStripCount === 0, `${transferTestId} should not show a route-step FX strip before Reloadly pricing is available.`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);

  try {
    await page.goto(`${baseUrl}/payments`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    assert((await page.getByText("FX Rate").count()) === 0, "Summary strip should be hidden before transfer selection.");

    await verifyImmediateTransferDoesNotUseRemittanceFx(page, "transfer-type-airtime_topup");
    await verifyImmediateTransferDoesNotUseRemittanceFx(page, "transfer-type-prepaid_electricity");

    console.log("[e2e] SUCCESS: Reloadly route-step flow no longer uses remittance FX.");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("[e2e] FAILED:", error?.message || error);
  process.exitCode = 1;
});
