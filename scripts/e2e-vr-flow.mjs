import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'https://localhost:3002';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
let fallbackWebglMode = false;
const shouldIgnoreError = (text) =>
  /401 \(Unauthorized\)/i.test(text) ||
  /\/auth\/me/i.test(text) ||
  /webgl context/i.test(text) ||
  /three\.webglrenderer/i.test(text) ||
  (fallbackWebglMode && /webgl/i.test(text));
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' && !shouldIgnoreError(text)) errors.push(`[console] ${text}`);
});
page.on('pageerror', (err) => {
  const text = String(err.message || err);
  if (!shouldIgnoreError(text)) errors.push(`[pageerror] ${text}`);
});

try {
  await page.goto(`${baseUrl}/onesa-ai-tourism-virtual-experince`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#vr-destination').waitFor({ timeout: 30000 });
  fallbackWebglMode = await page.getByText(/webgl not available/i).first().isVisible().catch(() => false);

  const tourResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/onesa/chat') && res.request().method() === 'POST',
    { timeout: 45000 }
  );
  await page.selectOption('#vr-destination', { index: 1 });
  await page.locator('h2').first().waitFor({ timeout: 15000 });
  await page.getByText(/walkthrough/i).first().waitFor({ timeout: 15000 });

  const tourRes = await tourResponsePromise;

  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/e2e-vr-flow.png', fullPage: true });

  const result = {
    ok: errors.length === 0 && tourRes.status() === 200,
    baseUrl,
    chatStatus: tourRes.status(),
    errors,
    screenshot: '/tmp/e2e-vr-flow.png',
    finalUrl: page.url(),
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
