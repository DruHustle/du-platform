import { chromium } from 'playwright';

const baseUrl = String(process.env.E2E_BASE_URL || 'https://localhost:3000').replace(/\/+$/, '');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(`console:${m.text()}`);
});

const isIgnorable = (msg) =>
  msg.includes('WebSocket closed without opened') ||
  msg.includes('failed to connect to websocket') ||
  msg.includes('WebSocket connection to') ||
  msg.includes('WebGL context could not be created') ||
  msg.includes('Error creating WebGL context') ||
  msg.includes('401 (Unauthorized)') ||
  msg.includes('429 (Too Many Requests)');

try {
  await page.goto(`${baseUrl}/onesa-ai-tourism-augmented-experience`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);

  const placeSelect = page.locator('#aug-place');
  await placeSelect.waitFor({ timeout: 20000 });
  await placeSelect.selectOption({ index: 1 });
  await page.waitForTimeout(600);
  const narrationPlaceholderVisible = await page
    .getByText(/Narration will appear here once AI guidance is generated\./i)
    .first()
    .isVisible()
    .catch(() => false);

  const narrationBtn = page.getByRole('button', { name: /Voice Narration:\s*(On|Off)/i }).first();
  await narrationBtn.waitFor({ timeout: 15000 });
  await narrationBtn.click();
  await page.waitForTimeout(400);

  const conversationBtn = page.getByRole('button', { name: /Conversation:\s*(On|Off)/i }).first();
  await conversationBtn.waitFor({ timeout: 15000 });
  await conversationBtn.click();
  await page.waitForTimeout(400);

  const output = {
    url: page.url(),
    placeSelectVisible: await placeSelect.isVisible(),
    narrationPlaceholderVisible,
    narrationButtonText: (await narrationBtn.textContent())?.trim(),
    conversationButtonText: (await conversationBtn.textContent())?.trim(),
    nonIgnorableErrors: consoleErrors.filter((m) => !isIgnorable(m)),
    allErrors: consoleErrors,
  };

  console.log(JSON.stringify(output, null, 2));

  if (!output.placeSelectVisible) process.exitCode = 1;
  if (output.narrationPlaceholderVisible) process.exitCode = 1;
  if (output.nonIgnorableErrors.length > 0) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
