import { chromium } from "playwright";

const baseUrl = String(process.env.E2E_BASE_URL || "https://localhost:3000").replace(/\/+$/, "");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
});

const shouldIgnoreError = (text) =>
  /websocket connection to/i.test(text) ||
  /failed to connect to websocket/i.test(text) ||
  /websocket closed without opened/i.test(text) ||
  /failed to load resource: the server responded with a status of 404/i.test(text) ||
  /500 \(Internal Server Error\)/i.test(text) ||
  /401 \(Unauthorized\)/i.test(text) ||
  /429 \(Too Many Requests\)/i.test(text) ||
  /webgl context/i.test(text) ||
  /three\.webglrenderer/i.test(text);

async function runScenario(path, kind) {
  const page = await context.newPage();
  const errors = [];

  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !shouldIgnoreError(text)) errors.push(`[console] ${text}`);
  });
  page.on("pageerror", (err) => {
    const text = String(err?.message || err);
    if (!shouldIgnoreError(text)) errors.push(`[pageerror] ${text}`);
  });

  await page.addInitScript(() => {
    const recordSpeak = () => {
      window.__speakCount = (window.__speakCount || 0) + 1;
    };
    const synth = window.speechSynthesis;
    if (synth) {
      const originalSpeak = typeof synth.speak === "function" ? synth.speak.bind(synth) : null;
      synth.speak = (utterance) => {
        recordSpeak();
        try {
          originalSpeak?.(utterance);
        } catch {
          // no-op
        }
      };
      const originalGetVoices = typeof synth.getVoices === "function" ? synth.getVoices.bind(synth) : null;
      synth.getVoices = () => {
        try {
          const voices = originalGetVoices?.() || [];
          if (voices.length > 0) return voices;
        } catch {
          // no-op
        }
        return [{ name: "Fallback Voice", lang: "en-US", voiceURI: "fallback" }];
      };
      if (typeof synth.cancel !== "function") synth.cancel = () => {};
      if (typeof synth.resume !== "function") synth.resume = () => {};
    }
  });

  await page.route("**/api/tts", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "forced_tts_failure_for_e2e" }),
    });
  });
  await page.route("**/api/speech", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "forced_speech_failure_for_e2e" }),
    });
  });

  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1000);

  if (kind === "ar") {
    const placeSelect = page.locator("#aug-place");
    await placeSelect.waitFor({ timeout: 20000 });
    await placeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(400);

    const narrationBtn = page
      .locator("button")
      .filter({ hasText: /Voice Narration:\s*(On|Off)|NARRATION:\s*(On|Off)/i })
      .first();
    await narrationBtn.waitFor({ timeout: 15000 });
    await narrationBtn.click();
    await page.waitForTimeout(800);

    const speakCount = await page.evaluate(() => window.__speakCount || 0);
    const narrationButtonText = (await narrationBtn.textContent())?.trim() || "";

    await page.close();
    return {
      kind,
      speakCount,
      narrationButtonText,
      errors,
      ok: speakCount > 0 && /On/i.test(narrationButtonText) && errors.length === 0,
    };
  }

  const destination = page.locator("#vr-destination");
  await destination.waitFor({ timeout: 30000 });
  await destination.selectOption({ index: 1 });
  await page.waitForTimeout(400);

  const narrationBtn = page
    .locator("button")
    .filter({ hasText: /NARRATION:\s*(On|Off)|Narration:\s*(On|Off)|TTS:\s*(On|Off)/i })
    .first();
  await narrationBtn.waitFor({ timeout: 20000 });
  await narrationBtn.click();
  await page.waitForTimeout(800);

  const speakCount = await page.evaluate(() => window.__speakCount || 0);
  const narrationButtonText = (await narrationBtn.textContent())?.trim() || "";

  await page.close();
  return {
    kind,
    speakCount,
    narrationButtonText,
    errors,
    ok: speakCount > 0 && /On/i.test(narrationButtonText) && errors.length === 0,
  };
}

try {
  const ar = await runScenario("/onesa-ai-tourism-augmented-experience", "ar");
  const vr = await runScenario("/onesa-ai-tourism-virtual-experience", "vr");
  const result = { baseUrl, ar, vr, ok: ar.ok && vr.ok };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
