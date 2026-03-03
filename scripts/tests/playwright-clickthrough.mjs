import { chromium } from 'playwright';

const baseUrl = String(process.env.E2E_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

const results = [];
const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, err) => results.push({ name, ok: false, detail: String(err?.message || err) });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  const acceptCookies = page.getByRole('button', { name: /accept cookies/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
    await page.waitForTimeout(300);
  }
  pass('load_home');

  const startUrl = page.url();
  const bubble = page.locator('[data-onesa-bubble-trigger="true"]').first();
  await bubble.waitFor({ timeout: 15000 });
  await bubble.click();
  await page.waitForTimeout(500);

  if (page.url() !== startUrl) throw new Error(`URL changed from ${startUrl} to ${page.url()}`);
  await page.getByText(/chat with onesa ai/i).first().waitFor({ timeout: 10000 });
  pass('popup_opens_without_navigation');

  const textarea = page.locator('section.fixed textarea').first();
  await textarea.fill('Give me one Zimbabwe travel tip in one sentence.');
  await page.getByRole('button', { name: /send/i }).last().click();
  await page.waitForTimeout(3000);

  const userMessages = page.locator('section.fixed div[class*="rounded-br"]');
  const assistantMessages = page.locator('section.fixed div[class*="rounded-bl"]');
  const userCount = await userMessages.count();
  const assistantCount = await assistantMessages.count();
  if (userCount < 1 || assistantCount < 1) {
    throw new Error(`Expected user and assistant messages in popup, got user=${userCount}, assistant=${assistantCount}`);
  }
  pass('popup_chat_send_receive', `user=${userCount},assistant=${assistantCount}`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  pass('popup_close');

  await page.goto(`${baseUrl}/tourism`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.locator('a[href="/onesa-ai-book-trip"]').first().click();
  await page.waitForURL(/\/onesa-ai-book-trip/, { timeout: 15000 });
  pass('navigate_to_book_trip');

  const startDate = page.locator('input[type="date"]').nth(0);
  const endDate = page.locator('input[type="date"]').nth(1);
  const startReadOnly = await startDate.evaluate((el) => (el).readOnly);
  const endReadOnly = await endDate.evaluate((el) => (el).readOnly);
  if (startReadOnly || endReadOnly) {
    throw new Error(`Date inputs are readonly (start=${startReadOnly}, end=${endReadOnly})`);
  }
  await startDate.click();
  await endDate.click();
  await startDate.fill('2026-07-10');
  await endDate.fill('2026-07-18');

  await page.getByRole('button', { name: /generate trip plan/i }).click();
  const successIndicator = page.getByText(/estimated total/i).first();
  const errorIndicator = page.getByText(/unable to generate your trip plan right now/i).first();
  const finishedIndicator = page.getByRole('button', { name: /generate trip plan/i }).first();

  let bookingOutcome = 'unknown';
  try {
    await Promise.race([
      successIndicator.waitFor({ timeout: 150000 }).then(() => {
        bookingOutcome = 'success';
      }),
      errorIndicator.waitFor({ timeout: 150000 }).then(() => {
        bookingOutcome = 'error';
      }),
      finishedIndicator.waitFor({ timeout: 150000 }).then(async () => {
        if (await successIndicator.isVisible().catch(() => false)) bookingOutcome = 'success';
        else if (await errorIndicator.isVisible().catch(() => false)) bookingOutcome = 'error';
      }),
    ]);
  } catch {
    // handled below
  }

  if (bookingOutcome === 'success') {
    pass('trip_plan_generate_and_render');
  } else if (bookingOutcome === 'error') {
    const errText = (await errorIndicator.textContent().catch(() => 'trip planner error displayed')) || 'trip planner error displayed';
    throw new Error(`Trip planner returned UI error: ${errText}`);
  } else {
    throw new Error('Trip planner did not render success or error state in time.');
  }

  await page.goto(`${baseUrl}/tourism`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator('a[href^="/onesa-ai-tourism-virtual-exper"]').first().click();
  await page.waitForURL(/\/onesa-ai-tourism-virtual-exper(i)?ence/, { timeout: 15000 });
  await page.locator('#vr-destination').waitFor({ timeout: 30000 });
  await page.selectOption('#vr-destination', { index: 1 });
  await page.getByRole('button', { name: /conversation:\s*off/i }).first().waitFor({ timeout: 15000 });
  pass('vr_page_load_and_destination_select');

  await page.goto(`${baseUrl}/onesa-ai-tourism-augmented-experience`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#aug-place').waitFor({ timeout: 15000 });
  await page.selectOption('#aug-place', { index: 1 });
  const arConversation = page.getByRole('button', { name: /conversation:\s*off/i }).first();
  await arConversation.waitFor({ timeout: 15000 });
  await arConversation.click();
  await page.getByRole('button', { name: /conversation:\s*on/i }).first().waitFor({ timeout: 10000 });
  pass('ar_conversation_toggle_on');
} catch (err) {
  fail('unexpected_error', err);
} finally {
  await page.screenshot({ path: '/tmp/playwright-clickthrough-final.png', fullPage: true });
  await context.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ` :: ${r.detail}` : ''}`);
}
if (failed.length) process.exit(1);
