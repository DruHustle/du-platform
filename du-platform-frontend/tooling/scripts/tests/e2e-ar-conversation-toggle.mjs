import { chromium } from 'playwright';

const baseUrl = process.env.E2E_BASE_URL || 'https://localhost:3001';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err?.message || err)));

await page.addInitScript(() => {
  class FakeMediaRecorder {
    constructor(stream) {
      this.stream = stream;
      this.ondataavailable = null;
      this.onstop = null;
      this.state = 'inactive';
    }
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      if (typeof this.ondataavailable === 'function') {
        this.ondataavailable({ data: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }) });
      }
      if (typeof this.onstop === 'function') this.onstop();
    }
  }

  if (!window.navigator.mediaDevices) {
    window.navigator.mediaDevices = {};
  }
  window.navigator.mediaDevices.getUserMedia = async () => new MediaStream();
  window.MediaRecorder = FakeMediaRecorder;
});

try {
  await page.goto(`${baseUrl}/onesa-ai-tourism-augmented-experience`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);

  const placeSelect = page.locator('#aug-place');
  await placeSelect.waitFor({ timeout: 20000 });
  await placeSelect.selectOption({ index: 1 });
  await page.waitForTimeout(400);

  const conversationBtn = page.getByRole('button', { name: /Conversation:\s*(On|Off)/i }).first();
  await conversationBtn.waitFor({ timeout: 15000 });
  await conversationBtn.click();
  await page.waitForTimeout(600);

  const text = (await conversationBtn.textContent())?.trim() || '';
  const output = {
    url: page.url(),
    conversationButtonText: text,
    errors,
    ok: /Conversation:\s*On/i.test(text),
  };

  console.log(JSON.stringify(output, null, 2));
  if (!output.ok) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
