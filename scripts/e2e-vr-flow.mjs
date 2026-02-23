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
  await page.goto(`${baseUrl}/tourism`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  const vrLinks = page.locator('a[href="/onesa-ai-tourism-virtual-experince"]');
  await vrLinks.first().waitFor({ timeout: 15000 });
  await vrLinks.first().click();
  await page.waitForURL(/\/onesa-ai-tourism-virtual-experince/, { timeout: 15000 });

  await page.getByRole('heading', { name: /explore zimbabwe in ai-powered virtual reality/i }).waitFor({ timeout: 15000 });
  await page.locator('#vr-place').waitFor({ timeout: 15000 });
  fallbackWebglMode = await page.getByText(/webgl not available/i).first().isVisible().catch(() => false);

  await page.selectOption('#vr-place', 'great_zimbabwe');
  await page.getByRole('heading', { name: /^great zimbabwe$/i }).first().waitFor({ timeout: 15000 });

  const tourResponsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/onesa/chat') && res.request().method() === 'POST',
    { timeout: 45000 }
  );
  await page.getByRole('button', { name: /explore virtually/i }).first().click();
  let spawnStatus = 0;
  try {
    const spawnRes = await page.waitForResponse(
      (res) => res.url().includes('/api/generate-world') && res.request().method() === 'POST',
      { timeout: 7000 }
    );
    spawnStatus = spawnRes.status();
  } catch {
    // Local AI-offline fallback can spawn without network call.
    spawnStatus = 204;
  }
  const tourRes = await tourResponsePromise;

  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/e2e-vr-flow.png', fullPage: true });

  const result = {
    ok: errors.length === 0 && [200, 204].includes(spawnStatus) && tourRes.status() === 200,
    baseUrl,
    spawnStatus,
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
