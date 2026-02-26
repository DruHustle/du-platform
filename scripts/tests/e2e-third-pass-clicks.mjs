import { chromium } from 'playwright';

const baseUrl = String(process.env.E2E_BASE_URL || 'https://localhost:3000').replace(/\/+$/, '');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();

const results = [];
const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, err) => results.push({ name, ok: false, detail: String(err?.message || err) });

const shouldIgnoreConsole = (text) =>
  /websocket connection/i.test(text) ||
  /401 \(unauthorized\)/i.test(text) ||
  /429 \(too many requests\)/i.test(text) ||
  /failed to load resource:.*404/i.test(text) ||
  /webgl/i.test(text) ||
  /three\.webglrenderer/i.test(text);

page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error' && !shouldIgnoreConsole(text)) {
    results.push({ name: 'console_error', ok: false, detail: text });
  }
});

async function step(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (err) {
    fail(name, err);
  }
}

async function goto(path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
}

async function clickIfVisible(locator) {
  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

const email = `button.e2e.${Date.now()}@example.com`;
const password = 'Passw0rd!23';
let accessToken = '';

try {
  await step('home_load', async () => {
    await goto('/');
    const accept = page.getByRole('button', { name: /accept cookies/i });
    await clickIfVisible(accept);
  });

  await step('auth_register_login_and_kyc', async () => {
    const headers = { 'Content-Type': 'application/json' };
    const registerRes = await context.request.post(`${baseUrl}/api/auth/register`, {
      data: { fullName: 'Button E2E User', email, password, confirmPassword: password },
      headers,
    });
    if (![201, 409].includes(registerRes.status())) {
      throw new Error(`register failed ${registerRes.status()}: ${await registerRes.text()}`);
    }

    await goto(`/login?next=${encodeURIComponent('/payments')}`);
    await page.locator('input[type="email"]').first().fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /login/i }).first().click();
    await page.waitForURL(/\/payments|\/$/, { timeout: 30000 });

    const loginRes = await context.request.post(`${baseUrl}/api/auth/token/refresh`, {
      headers: {},
    });
    const loginJson = await loginRes.json();
    accessToken = String(loginJson?.accessToken ?? '').trim();
    if (!loginRes.ok() || !accessToken || loginRes.status() !== 200) {
      throw new Error(`token refresh failed ${loginRes.status()}: ${JSON.stringify(loginJson)}`);
    }

    const kycRes = await context.request.post(`${baseUrl}/api/auth/kyc/verify`);
    const kycJson = await kycRes.json().catch(() => ({}));
    const meRes = await context.request.get(`${baseUrl}/api/auth/me`);
    const meJson = await meRes.json().catch(() => ({}));

    if (!kycRes.ok() || !Boolean(kycJson?.user?.kycVerified) || !Boolean(meJson?.user?.id)) {
      throw new Error(
        `Auth bootstrap failed: ${JSON.stringify({ kycStatus: kycRes.status(), meStatus: meRes.status(), kycJson, meJson })}`
      );
    }

    await page.evaluate((token) => {
      localStorage.setItem('zigd_jwt', token);
      localStorage.setItem('zigd_has_logged_in', '1');
    }, accessToken);
  });

  await step('payments_send_money_flow_clicks', async () => {
    await goto('/payments');

    const sendMoneyToggle = page.getByTestId('transfer-type-send_money').first();
    await sendMoneyToggle.click();
    await page.waitForTimeout(250);

    const sendAmount = page.locator('label:has-text("You send")').locator('xpath=following::input[1]').first();
    await sendAmount.fill('120');

    await page.getByTestId('payments-get-started').first().click();
    await page.getByText(/fx rate preview/i).first().waitFor({ timeout: 20000 });

    await page.getByRole('button', { name: /accept rate/i }).click();
    await page.getByText(/receiver full name/i).first().waitFor({ timeout: 30000 });

    await page.locator('label:has-text("Receiver full name")').locator('xpath=following::input[1]').first().fill('Receiver One');
    await page.locator('label:has-text("Receiver address")').locator('xpath=following::input[1]').first().fill('123 Main Street');
    await page.locator('label:has-text("City")').locator('xpath=following::input[1]').first().fill('Harare');
    await page.locator('label:has-text("Phone number")').locator('xpath=following::input[1]').first().fill('+263771234567');

    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.getByText(/payout method/i).first().waitFor({ timeout: 20000 });

    const continueToPay = page.getByRole('button', { name: /continue to pay/i });
    await continueToPay.click();

    await page.getByText(/payment summary/i).first().waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: /pay now/i }).click();

    await page.getByText(/payment submitted/i).first().waitFor({ timeout: 20000 });
    const downloadBtn = page.getByRole('button', { name: /download receipt/i });
    await downloadBtn.click();
    await page.getByRole('button', { name: /new transfer/i }).click();
    await page.getByTestId('transfer-type-send_money').first().waitFor({ timeout: 10000 });
  });

  await step('payments_airtime_flow_clicks', async () => {
    await goto('/payments');
    const airtimeToggle = page.getByTestId('transfer-type-airtime_topup').first();
    await airtimeToggle.click();
    await page.waitForTimeout(400);

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.fill('20');

    await page.getByTestId('payments-get-started').first().click();
    await page.getByText(/fx rate preview/i).first().waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: /accept rate/i }).click();

    await page.getByText(/airtime number/i).first().waitFor({ timeout: 20000 });
    const phoneInput = page.getByPlaceholder('+2637XXXXXXXX').first();
    await phoneInput.fill('+263772222222');

    await page.getByRole('button', { name: /^continue$/i }).click();
    await page.getByText(/operator:/i).first().waitFor({ timeout: 20000 });

    await page.getByRole('button', { name: /continue to pay/i }).click();
    await page.getByRole('button', { name: /pay now/i }).click();
    await page.getByText(/payment submitted/i).first().waitFor({ timeout: 20000 });
  });

  const genericRoutes = [
    '/tourism',
    '/trade',
    '/investment',
    '/shop',
    '/technology',
    '/data-visualization',
    '/search',
    '/success-stories',
    '/onesa-ai-chat',
    '/onesa-ai-book-trip',
    '/onesa-ai-tourism-augmented-experince',
    '/onesa-ai-tourism-virtual-experince',
    '/privacy-policy',
    '/terms-of-service',
    '/cookie-settings',
  ];

  for (const route of genericRoutes) {
    await step(`route_click_${route}`, async () => {
      await goto(route);

      if (route === '/onesa-ai-book-trip') {
        const startDate = page.locator('input[type="date"]').nth(0);
        const endDate = page.locator('input[type="date"]').nth(1);
        await startDate.fill('2026-08-10');
        await endDate.fill('2026-08-18');
        await page.getByRole('button', { name: /generate trip plan/i }).click();
        await page.waitForTimeout(1000);
        return;
      }

      if (route === '/onesa-ai-tourism-augmented-experince') {
        await page.locator('#aug-place').waitFor({ timeout: 20000 });
        await page.selectOption('#aug-place', { index: 1 });
        const convoToggle = page.getByRole('button', { name: /conversation:\s*(off|on)/i }).first();
        await clickIfVisible(convoToggle);
        return;
      }

      if (route === '/onesa-ai-tourism-virtual-experince') {
        await page.locator('#vr-destination').waitFor({ timeout: 30000 });
        await page.selectOption('#vr-destination', { index: 1 });
        const narrationToggle = page
          .locator('button')
          .filter({ hasText: /narration:\s*(off|on)|tts:\s*(off|on)/i })
          .first();
        await clickIfVisible(narrationToggle);
        return;
      }

      const primaryButton = page.locator('button:visible:not([disabled])').first();
      if (await primaryButton.isVisible().catch(() => false)) {
        await primaryButton.click();
        await page.waitForTimeout(300);
      }
    });
  }
} finally {
  await page.screenshot({ path: '/tmp/e2e-third-pass-clicks.png', fullPage: true });
  await context.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ` :: ${r.detail}` : ''}`);
}
console.log(`SUMMARY total=${results.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
