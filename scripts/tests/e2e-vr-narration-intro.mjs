import { chromium } from 'playwright';

const baseUrl = String(process.env.E2E_BASE_URL || 'https://localhost:3000').replace(/\/+$/, '');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
});

await context.addInitScript(() => {
  try {
    localStorage.setItem('i18nextLng', 'en');
  } catch {
    // no-op
  }
  if (typeof HTMLMediaElement !== 'undefined') {
    HTMLMediaElement.prototype.play = function play() {
      return Promise.resolve();
    };
  }
});

const page = await context.newPage();
const errors = [];
const ttsTexts = [];

page.on('console', (msg) => {
  if (msg.type() !== 'error') return;
  const text = msg.text();
  if (
    /webgl context|three\.webglrenderer|failed to load resource.*(404|401|429|503)/i.test(text) ||
    /tts error/i.test(text)
  ) {
    return;
  }
  errors.push(`[console] ${text}`);
});

page.on('pageerror', (err) => {
  const text = String(err?.message || err);
  if (/webgl context|three\.webglrenderer/i.test(text)) return;
  errors.push(`[pageerror] ${text}`);
});

await page.route('**/api/speech', async (route) => {
  const req = route.request();
  if (req.method() !== 'POST') return route.continue();

  let payload = {};
  try {
    payload = req.postDataJSON() || {};
  } catch {
    payload = {};
  }

  const action = String(payload?.action || '').toLowerCase();
  if (action === 'tts') {
    const spokenText = String(payload?.text || '').trim();
    if (spokenText) ttsTexts.push(spokenText);
    return route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.from('ID3'),
    });
  }

  return route.continue();
});

try {
  await page.goto(`${baseUrl}/onesa-ai-tourism-virtual-experience`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await page.locator('#vr-destination').waitFor({ timeout: 30000 });
  await page.selectOption('#vr-destination', { index: 1 });

  const narrationBtn = page
    .locator('button')
    .filter({ hasText: /NARRATION:\s*(On|Off)|Narration:\s*(On|Off)|RONDEDZERO:\s*(Yabatidzwa|Yadzimwa)/i })
    .first();

  await narrationBtn.waitFor({ timeout: 20000 });
  await narrationBtn.click();

  const deadline = Date.now() + 20000;
  while (ttsTexts.length === 0 && Date.now() < deadline) {
    await page.waitForTimeout(120);
  }
  if (ttsTexts.length === 0) {
    throw new Error('No narration TTS request captured after clicking Narration.');
  }

  const latestTtsText = ttsTexts[ttsTexts.length - 1];
  const greeted = /hello, i am onesa, your virtual guide\./i.test(latestTtsText);
  const introducedCity = /welcome to sample city\./i.test(latestTtsText);
  const includedCitySummary = /sample city is a vr demo scene showing how the experience works/i.test(latestTtsText);
  const promptedPushToTalk = /press and hold the push to talk button to start a conversation with me\./i.test(latestTtsText);

  if (!greeted || !introducedCity || !includedCitySummary || !promptedPushToTalk) {
    throw new Error(`Narration intro mismatch: ${latestTtsText}`);
  }

  await page.screenshot({ path: '/tmp/e2e-vr-narration-intro.png', fullPage: true });

  const result = {
    ok: errors.length === 0,
    baseUrl,
    assertions: {
      greeted: /hello, i am onesa, your virtual guide\./i.test(ttsTexts[ttsTexts.length - 1] || ''),
      introducedCity: /welcome to sample city\./i.test(ttsTexts[ttsTexts.length - 1] || ''),
      includedCitySummary: /sample city is a vr demo scene showing how the experience works/i.test(ttsTexts[ttsTexts.length - 1] || ''),
      promptedPushToTalk: /press and hold the push to talk button to start a conversation with me\./i.test(ttsTexts[ttsTexts.length - 1] || ''),
    },
    ttsText: ttsTexts[ttsTexts.length - 1] || '',
    errors,
    screenshot: '/tmp/e2e-vr-narration-intro.png',
    finalUrl: page.url(),
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
