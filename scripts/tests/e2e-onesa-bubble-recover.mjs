import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:3002";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const results = [];
const pass = (name, detail = "") => results.push({ name, ok: true, detail });
const fail = (name, err) => results.push({ name, ok: false, detail: String(err?.message || err) });

try {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const acceptCookies = page.getByRole("button", { name: /accept cookies/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
    await page.waitForTimeout(300);
  }
  pass("load_home");

  const bubbleTrigger = page.locator('[data-onesa-bubble-trigger="true"]').first();
  const bubbleContainer = page.locator('[data-onesa-bubble-container="true"]').first();
  await bubbleTrigger.waitFor({ timeout: 15000 });
  await bubbleContainer.waitFor({ timeout: 15000 });
  pass("bubble_visible");

  const box = await bubbleContainer.boundingBox();
  if (!box) throw new Error("Bubble container bounding box is not available.");

  const dragStartX = box.x + box.width / 2;
  const dragStartY = box.y + box.height / 2;
  await page.mouse.move(dragStartX, dragStartY);
  await page.mouse.down();
  await page.mouse.move(-box.width - 30, dragStartY, { steps: 20 });
  await page.mouse.up();
  pass("bubble_dragged_offscreen");

  const restoreHandle = page.locator('[data-onesa-bubble-restore="true"]').first();
  await restoreHandle.waitFor({ state: "visible", timeout: 8000 });
  pass("restore_handle_visible");

  await restoreHandle.click();
  await page.waitForFunction(() => {
    const bubble = document.querySelector('[data-onesa-bubble-container="true"]');
    if (!bubble) return false;
    const rect = bubble.getBoundingClientRect();
    return rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight;
  }, { timeout: 8000 });
  pass("bubble_restored_into_view");

  await bubbleTrigger.click();
  const chatModal = page.locator('[data-onesa-chat-modal="true"]').first();
  await chatModal.waitFor({ state: "visible", timeout: 10000 });
  pass("chat_opens_after_restore");
} catch (err) {
  fail("unexpected_error", err);
} finally {
  await page.screenshot({ path: "/tmp/e2e-onesa-bubble-recover.png", fullPage: true });
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}${r.detail ? ` :: ${r.detail}` : ""}`);
}
if (failed.length) process.exit(1);
