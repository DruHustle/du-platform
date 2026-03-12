import { chromium } from "playwright";

const baseUrl = String(process.env.E2E_BASE_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function registerDebugHandlers(page) {
  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error" || type === "warning") {
      console.log(`[console.${type}] ${text}`);
    }
  });
  page.on("pageerror", (err) => {
    console.log(`[pageerror] ${err?.message || err}`);
  });
}

async function waitForFxValue(summary) {
  await summary.getByText(/1\s+[A-Z]{3}\s*=\s*\d/).first().waitFor({ timeout: 20000 });
}

async function getSummaryContainer(page) {
  const summaryAnchor = page.getByText("Estimated reflect time").first();
  await summaryAnchor.waitFor({ timeout: 20000 });
  return summaryAnchor.locator("..").locator("..");
}

async function selectTransfer(page, transferTestId) {
  await page.goto(`${baseUrl}/payments`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.locator("#send-money").scrollIntoViewIfNeeded();
  await page.getByTestId(transferTestId).click();
}

async function assertFxAndFeeVisible(page, transferTestId) {
  await selectTransfer(page, transferTestId);
  const summary = await getSummaryContainer(page);

  const fxLabel = summary.getByText("FX Rate", { exact: true }).first();
  const fxValue = fxLabel.locator("..").locator("p").nth(1);
  const feeLabel = summary.getByText("Fee", { exact: true }).first();
  const feeValue = feeLabel.locator("..").locator("p").nth(1);

  await fxValue.waitFor({ timeout: 20000 });
  await feeValue.waitFor({ timeout: 20000 });

  await waitForFxValue(summary);

  const fxText = (await fxValue.textContent())?.trim() || "";
  assert(fxText && !/N\/A/i.test(fxText), `${transferTestId} FX Rate should not be N/A.`);

  const feeText = (await feeValue.textContent())?.trim() || "";
  assert(feeText && /\d/.test(feeText) && !/N\/A/i.test(feeText), `${transferTestId} Fee should be numeric and not N/A.`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  registerDebugHandlers(page);

  try {
    await page.goto(`${baseUrl}/payments`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    assert((await page.getByText("FX Rate").count()) === 0, "Summary strip should be hidden before transfer selection.");

    await assertFxAndFeeVisible(page, "transfer-type-send_money");
    await assertFxAndFeeVisible(page, "transfer-type-airtime_topup");
    await assertFxAndFeeVisible(page, "transfer-type-prepaid_electricity");

    console.log("[e2e] SUCCESS: FX rate + fee summaries render without entering amounts.");
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("[e2e] FAILED:", error?.message || error);
  process.exitCode = 1;
});
