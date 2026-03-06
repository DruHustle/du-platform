import { chromium } from 'playwright';

const baseUrl = String(process.env.E2E_BASE_URL || 'https://localhost:3000').replace(/\/+$/, '');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
});

await context.addInitScript(() => {
  class FakeTrack {
    stop() {}
  }

  const fakeStream = {
    getTracks: () => [new FakeTrack()],
    getAudioTracks: () => [new FakeTrack()],
    getVideoTracks: () => [],
  };

  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
  }
  navigator.mediaDevices.getUserMedia = async () => fakeStream;

  class FakeMediaRecorder {
    constructor(stream) {
      this.stream = stream;
      this.mimeType = 'audio/webm';
      this.state = 'inactive';
      this.ondataavailable = null;
      this.onstop = null;
    }

    start() {
      this.state = 'recording';
      setTimeout(() => {
        if (this.state !== 'recording') return;
        const blob = new Blob(['e2e-audio'], { type: this.mimeType });
        if (typeof this.ondataavailable === 'function') {
          this.ondataavailable({ data: blob });
        }
        this.stop();
      }, 280);
    }

    stop() {
      if (this.state === 'inactive') return;
      this.state = 'inactive';
      setTimeout(() => {
        if (typeof this.onstop === 'function') {
          this.onstop();
        }
      }, 0);
    }

    addEventListener(type, handler) {
      if (type === 'dataavailable') this.ondataavailable = handler;
      if (type === 'stop') this.onstop = handler;
    }

    removeEventListener() {}
  }

  Object.defineProperty(window, 'MediaRecorder', { value: FakeMediaRecorder, configurable: true });
  if (typeof HTMLMediaElement !== 'undefined') {
    HTMLMediaElement.prototype.play = function play() {
      return Promise.resolve();
    };
  }
});

const page = await context.newPage();
const errors = [];
const expectedTranscript = 'hello from e2e stt';
const expectedResponse = 'Welcome traveler. Use hotspots and POI buttons to explore this scene.';
let sttCalls = 0;
let chatCalls = 0;
let conversationPromptSeen = false;

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

await page.route('**/api/whisper', async (route) => {
  await route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'disabled in e2e test' }),
  });
});

await page.route('**/api/speech', async (route) => {
  const req = route.request();
  if (req.method() !== 'POST') return route.continue();

  const contentType = String(req.headers()['content-type'] || '').toLowerCase();

  if (contentType.includes('multipart/form-data')) {
    sttCalls += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ text: expectedTranscript }),
    });
  }

  if (contentType.includes('application/json')) {
    let payload = {};
    try {
      payload = req.postDataJSON() || {};
    } catch {
      payload = {};
    }
    const action = String(payload?.action || '').toLowerCase();

    if (action === 'tts') {
      return route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from('ID3'),
      });
    }

    if (action === 'llm') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'ok' }),
      });
    }
  }

  return route.continue();
});

await page.route('**/api/onesa/chat', async (route) => {
  const req = route.request();
  if (req.method() !== 'POST') return route.continue();

  let payload = {};
  try {
    payload = req.postDataJSON() || {};
  } catch {
    payload = {};
  }

  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  const latest = String(messages[messages.length - 1]?.content || '');

  chatCalls += 1;
  if (latest.toLowerCase().includes(expectedTranscript)) {
    conversationPromptSeen = true;
  }

  const reply = conversationPromptSeen
    ? expectedResponse
    : 'Initial narration bootstrap reply.';

  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ reply }),
  });
});

try {
  await page.goto(`${baseUrl}/onesa-ai-tourism-virtual-experience`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await page.locator('#vr-destination').waitFor({ timeout: 30000 });
  await page.selectOption('#vr-destination', { index: 1 });

  const conversationBtn = page.getByRole('button', { name: /conversation:\s*off/i }).first();
  await conversationBtn.waitFor({ timeout: 20000 });
  await conversationBtn.click();

  const conversationOn = page.getByRole('button', { name: /conversation:\s*on/i }).first();
  await conversationOn.waitFor({ timeout: 20000 });

  const talkBtn = page
    .getByRole('button', { name: /push to talk|release to send|bata utaure|sunungura kutumira/i })
    .first();
  await talkBtn.waitFor({ timeout: 20000 });
  await talkBtn.dispatchEvent('pointerdown', { pointerType: 'mouse', button: 0 });
  await page.waitForTimeout(500);
  await talkBtn.dispatchEvent('pointerup', { pointerType: 'mouse', button: 0 });

  await page.getByText(new RegExp(`You:\\s*${escapeRegExp(expectedTranscript)}`, 'i')).first().waitFor({ timeout: 20000 });
  await page.getByText(new RegExp(`Response:\\s*${escapeRegExp(expectedResponse)}`, 'i')).first().waitFor({ timeout: 20000 });

  await page.screenshot({ path: '/tmp/e2e-vr-conversation-stt-response.png', fullPage: true });

  const result = {
    ok: errors.length === 0 && sttCalls >= 1 && conversationPromptSeen,
    baseUrl,
    sttCalls,
    chatCalls,
    conversationPromptSeen,
    expectedTranscript,
    expectedResponse,
    errors,
    screenshot: '/tmp/e2e-vr-conversation-stt-response.png',
    finalUrl: page.url(),
  };

  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
