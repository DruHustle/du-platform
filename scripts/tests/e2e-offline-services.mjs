import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

// Deliberately do not inherit provider, database, SMTP, or other service credentials.
const port = Number(process.env.E2E_MOCK_PORT || 5012);
assert(Number.isInteger(port) && port > 1024 && port < 65536);
const baseUrl = `http://localhost:${port}`;
const output = process.env.E2E_OUTPUT_DIR || "/tmp/du-platform-offline";
await mkdir(output, { recursive: true });
const server = spawn(
  process.execPath,
  ["--import", "tsx", "du-platform-backend/server.ts"],
  {
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      TMPDIR: process.env.TMPDIR,
      NODE_ENV: "development",
      PORT: String(port),
      APP_BASE_URL: baseUrl,
      CORS_ORIGINS: baseUrl,
      ONESA_MOCK_MODE: "true",
      ONESA_MOCK_STT_TEXT: "Tell me about Victoria Falls",
    },
    stdio: ["ignore", "pipe", "pipe"],
  }
);
let serverLog = "";
server.stdout.on("data", chunk => {
  serverLog += chunk;
});
server.stderr.on("data", chunk => {
  serverLog += chunk;
});
let rateWindowStartedAt = Date.now();
const waitForRateWindow = async label => {
  // API, browser, AR, and VR groups use the same local IP and the real limiter.
  // Pace independent groups instead of disabling protection or ignoring 429s.
  const cooldown = 61_000 - (Date.now() - rateWindowStartedAt);
  if (cooldown > 0) {
    console.log(`Waiting for the AI rate-limit window before ${label}.`);
    let remaining = cooldown;
    while (remaining > 0) {
      const pause = Math.min(remaining, 60_000);
      await new Promise(done => setTimeout(done, pause));
      remaining -= pause;
    }
  }
  rateWindowStartedAt = Date.now();
};
const checks = [];
const pageErrors = [];
const securityErrors = [];
const consoleErrors = [];
const blockedExternalRequests = [];
let browser;
let page;
const pass = name => {
  checks.push(name);
  console.log(`PASS ${name}`);
};
const api = async (path, body) => {
  const response = await fetch(
    `${baseUrl}/api${path}`,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify(body),
        }
  );
  return response;
};
const waitFor = async predicate => {
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null)
      throw new Error(`Mock server exited: ${serverLog}`);
    if (await predicate().catch(() => false)) return;
    await new Promise(done => setTimeout(done, 250));
  }
  throw new Error("Local mock server did not become ready");
};
const newContext = async (width = 1440, init = "") => {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      ["data:", "blob:"].includes(url.protocol)
    )
      return route.continue();
    blockedExternalRequests.push(url.href);
    return route.abort();
  });
  // Fonts are optional; make this suite independent of internet availability.
  await context.route("https://fonts.googleapis.com/**", route =>
    route.fulfill({ contentType: "text/css", body: "" })
  );
  await context.route("https://fonts.gstatic.com/**", route => route.abort());
  await context.addInitScript({
    content: `localStorage.setItem('du_cookie_consent_v1','rejected');${init}`,
  });
  page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (
      message.type() === "error" &&
      !/^Failed to load resource:.*\b(401|503)\b/.test(message.text())
    )
      consoleErrors.push(message.text());
    if (
      /violates.*(security policy|directive)|Refused to connect/i.test(
        message.text()
      )
    )
      securityErrors.push(message.text());
  });
  return context;
};
const goto = path =>
  page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded" });
const expectText = text =>
  page.locator("main").getByText(text, { exact: false }).first().waitFor();
const screenshot = name =>
  page.screenshot({
    path: `${output}/${name}.png`,
    fullPage: true,
    timeout: 15000,
  });
const responsive = async name => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1
      ),
      `${name} overflows at ${width}px`
    );
    if (name === "vr" && width === 375) {
      const fullscreen = await page
        .getByRole("button", { name: /^enter fullscreen$/i })
        .boundingBox();
      for (const label of [/^zoom in$/i, /^zoom out$/i, /^reset view$/i]) {
        const box = await page
          .getByRole("button", { name: label })
          .boundingBox();
        assert(box && fullscreen);
        assert(box.width >= 44 && box.height >= 44);
        assert(
          box.x + box.width <= fullscreen.x ||
            box.x >= fullscreen.x + fullscreen.width ||
            box.y + box.height <= fullscreen.y ||
            box.y >= fullscreen.y + fullscreen.height,
          "VR toolbar overlaps fullscreen"
        );
      }
    }
    await screenshot(`${name}-${width}`);
  }
  pass(`${name} populated view fits 375, 768, and 1440 pixels`);
};
const chooseVr = async () => {
  await goto("/onesa-ai-tourism-virtual-experience");
  await page.locator("#vr-destination").selectOption({ index: 1 });
  await expectText(/walkthrough 1\/3/i);
};
try {
  // A preexisting listener must never be mistaken for our isolated server.
  await waitFor(
    async () =>
      serverLog.includes(String(port)) &&
      (await fetch(`${baseUrl}/api/ai/ready`)).ok
  );
  const ready = await (await api("/ai/ready")).json();
  assert.equal(ready.ready, true);
  assert(JSON.stringify(ready).includes("mock"));
  pass("isolated server starts with mock AI and no configured services");
  for (const language of ["en", "de", "sn", "nd"]) {
    const response = await api("/ai/chat", {
      language,
      messages: [{ role: "user", content: "Victoria Falls tourism" }],
    });
    assert.equal(response.status, 200);
    assert((await response.json()).reply.length > 30);
  }
  assert.equal((await api("/ai/chat", { messages: [] })).status, 400);
  pass("chat API supports four languages and rejects empty messages");
  const planResponse = await api("/ai/trip-plan", {
    origin: "Berlin",
    days: 3,
    travelers: 2,
    interests: ["nature"],
  });
  const plan = await planResponse.json();
  assert.equal(planResponse.status, 200);
  assert.equal(plan.source, "fallback");
  assert.equal(plan.plan.itinerary.length, 3);
  pass("trip planner produces a complete fallback without a provider");
  const tts = await api("/speech", { action: "tts", text: "Welcome traveler" });
  assert.equal(tts.status, 200);
  assert.match(tts.headers.get("content-type"), /audio\/wav/);
  const audio = Buffer.from(await tts.arrayBuffer());
  assert.equal(audio.subarray(0, 4).toString(), "RIFF");
  assert(audio.length > 44);
  assert.equal((await api("/speech", { action: "tts", text: "" })).status, 400);
  const multipart = new FormData();
  multipart.set("action", "stt");
  multipart.set(
    "file",
    new Blob([audio], { type: "audio/wav" }),
    "synthetic.wav"
  );
  const stt = await fetch(`${baseUrl}/api/speech`, {
    method: "POST",
    body: multipart,
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  assert.equal((await stt.json()).text, "Tell me about Victoria Falls");
  const invalidMultipart = new FormData();
  invalidMultipart.set("action", "stt");
  assert.equal(
    (
      await fetch(`${baseUrl}/api/speech`, {
        method: "POST",
        body: invalidMultipart,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
    ).status,
    400
  );
  pass(
    "speech APIs return decodable WAV and local transcription; empty TTS is rejected"
  );
  browser = await chromium.launch({
    headless: true,
    ...(process.env.E2E_BROWSER_CHANNEL
      ? { channel: process.env.E2E_BROWSER_CHANNEL }
      : {}),
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--enable-unsafe-swiftshader",
    ],
  });

  let context = await newContext(375);
  await goto("/onesa-ai-chat");
  await page
    .getByRole("textbox", { name: "Message to Onesa" })
    .fill("Victoria Falls tourism");
  await page.getByRole("button", { name: /^send$/i }).click();
  await expectText("Victoria Falls is a strong first stop.");
  pass("mobile chat sends a message to the local mock and renders its reply");
  await page.route("**/api/ai/chat", route =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Temporarily unavailable" }),
    })
  );
  await page
    .getByRole("textbox", { name: "Message to Onesa" })
    .fill("Try during outage");
  await page.getByRole("button", { name: /^send$/i }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: /unavailable/i })
    .waitFor();
  await page.unroute("**/api/ai/chat");
  await page
    .getByRole("textbox", { name: "Message to Onesa" })
    .fill("Victoria Falls tourism again");
  await page.getByRole("button", { name: /^send$/i }).click();
  await page.waitForFunction(
    () => document.querySelectorAll('main [role="alert"]').length === 0
  );
  await responsive("chat");
  pass("chat reports a provider outage and recovers on the next message");

  await goto("/onesa-ai-book-trip");
  await page.getByRole("button", { name: /generate trip plan/i }).click();
  await page.getByRole("button", { name: /download pdf/i }).waitFor();
  await expectText(/sample plan with calculated estimates/i);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download pdf/i }).click();
  const download = await downloadPromise;
  await download.saveAs(`${output}/trip-plan.pdf`);
  assert.equal(
    (await readFile(`${output}/trip-plan.pdf`)).subarray(0, 4).toString(),
    "%PDF"
  );
  await page.route("**/api/ai/trip-plan", route =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ source: "ai", plan: plan.plan }),
    })
  );
  await page.getByRole("button", { name: /generate trip plan/i }).click();
  await expectText(/ai-generated draft/i);
  await page.unroute("**/api/ai/trip-plan");
  await page.route("**/api/ai/trip-plan", route =>
    route.fulfill({ status: 503, body: "offline" })
  );
  await page.getByRole("button", { name: /generate trip plan/i }).click();
  await expectText(/sample plan with calculated estimates/i);
  await responsive("trip");
  pass(
    "trip planner renders fallback and AI fixtures, downloads PDF, and survives an API outage"
  );
  await goto("/technology");
  const bubble = page.locator('[data-onesa-bubble-trigger="true"]');
  await bubble.click();
  const chatDialog = page.getByRole("dialog", { name: /chat with onesa ai/i });
  await chatDialog.waitFor();
  await chatDialog
    .getByRole("textbox", { name: "Message to Onesa" })
    .fill("Victoria Falls tourism");
  await chatDialog.getByRole("button", { name: /^send$/i }).click();
  await chatDialog
    .getByText("Victoria Falls is a strong first stop.", { exact: false })
    .waitFor();
  await page.keyboard.press("Shift+Tab");
  assert(await chatDialog.evaluate(el => el.contains(document.activeElement)));
  await page.keyboard.press("Escape");
  await chatDialog.waitFor({ state: "hidden" });
  assert(await bubble.evaluate(el => document.activeElement === el));
  pass(
    "floating chat sends locally, traps keyboard focus, closes with Escape, and restores focus"
  );
  await waitForRateWindow("AR scenarios");
  await context.close();

  context = await newContext(
    768,
    `window.__streams=[];const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await original(constraints);window.__streams.push(stream);return stream;};`
  );
  await goto("/onesa-ai-tourism-augmented-experience");
  await page.locator("#aug-place").selectOption({ index: 1 });
  await expectText("Victoria Falls is a strong first stop.");
  await page.getByRole("button", { name: /^turn camera on$/i }).click();
  await page.waitForFunction(() => {
    const v = document.querySelector("main video");
    return v?.readyState >= 2 && v.videoWidth > 0;
  });
  await page.getByRole("button", { name: /^turn camera off$/i }).click();
  assert(
    await page.evaluate(() =>
      window.__streams
        .flatMap(s => s.getVideoTracks())
        .every(t => t.readyState === "ended")
    )
  );
  pass(
    "AR camera plays synthetic video and releases camera tracks when switched off"
  );
  const ttsRequest = page.waitForResponse(
    r =>
      r.url().endsWith("/api/speech") &&
      r.request().postData()?.includes('"tts"')
  );
  await page.getByRole("button", { name: /^narration: off$/i }).click();
  assert.equal((await ttsRequest).status(), 200);
  await page.getByRole("button", { name: /^narration: on$/i }).click();
  const sttRequest = page.waitForResponse(
    r =>
      r.url().endsWith("/api/speech") &&
      r.request().headers()["content-type"]?.includes("multipart")
  );
  await page.getByRole("button", { name: /^conversation: off$/i }).click();
  await page.getByRole("button", { name: /^voice input: on$/i }).click();
  assert.equal((await sttRequest).status(), 200);
  await page.getByRole("button", { name: /^conversation: on$/i }).click();
  let pendingSpeech;
  const canceledPrompts = [];
  page.on("request", request => {
    if (
      request.url().endsWith("/api/ai/chat") &&
      request.postData()?.includes("Canceled voice turn")
    )
      canceledPrompts.push(request.postData());
  });
  await page.route("**/api/speech", route => {
    if (route.request().headers()["content-type"]?.includes("multipart")) {
      pendingSpeech = route;
      return;
    }
    return route.continue();
  });
  await page.getByRole("button", { name: /^conversation: off$/i }).click();
  await page.getByRole("button", { name: /^voice input: on$/i }).click();
  for (let i = 0; !pendingSpeech && i < 150; i++) await page.waitForTimeout(20);
  assert(pendingSpeech, "Recorded speech request did not start");
  await page.getByRole("button", { name: /^conversation: on$/i }).click();
  await pendingSpeech.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ text: "Canceled voice turn" }),
  });
  await page.waitForTimeout(400);
  assert.deepEqual(canceledPrompts, []);
  await page.unroute("**/api/speech");
  pass(
    "turning conversation off ignores a late transcription instead of starting another AI request"
  );
  await responsive("ar");
  await page.getByRole("link", { name: /back to tourism/i }).click();
  assert(
    await page.evaluate(() =>
      window.__streams
        .flatMap(s => s.getTracks())
        .every(t => t.readyState === "ended")
    )
  );
  pass(
    "AR narration and recorded conversation use local speech APIs and clean up on navigation"
  );
  await context.close();

  // Permission failures and late grants are browser fixtures, not hardware assertions.
  context = await newContext(
    375,
    `navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied by test','NotAllowedError')};`
  );
  await goto("/onesa-ai-tourism-augmented-experience");
  await page.locator("#aug-place").selectOption({ index: 1 });
  await page.getByRole("button", { name: /^turn camera on$/i }).click();
  await expectText(/camera.*(fail|access|denied)/i);
  await page.getByRole("button", { name: /^conversation: off$/i }).click();
  await expectText(/microphone.*(denied|access)/i);
  assert.equal(
    await page.getByRole("button", { name: /^conversation: on$/i }).count(),
    0
  );
  pass("AR permission denial leaves camera and conversation off with feedback");
  await context.close();

  context = await newContext(
    375,
    `window.__streams=[];window.__grants=[];const real=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await real(constraints);window.__streams.push(stream);await new Promise(resolve=>window.__grants.push(resolve));return stream;};`
  );
  await goto("/onesa-ai-tourism-augmented-experience");
  await page.locator("#aug-place").selectOption({ index: 1 });
  await page.getByRole("button", { name: /^turn camera on$/i }).click();
  await page.waitForFunction(() => window.__grants.length === 1);
  await page.getByRole("link", { name: /back to tourism/i }).click();
  await page.evaluate(() => window.__grants.forEach(resolve => resolve()));
  await page.waitForFunction(() =>
    window.__streams
      .flatMap(s => s.getTracks())
      .every(t => t.readyState === "ended")
  );
  pass("late camera permission after navigation releases the granted stream");
  await chooseVr();
  await page.getByRole("dialog", { name: /vr.*unavailable/i }).waitFor();
  await page
    .getByRole("button", { name: /^close$/i })
    .last()
    .click();
  await page.getByRole("button", { name: /^conversation: off$/i }).click();
  const pendingTalk = page
    .getByRole("button", { name: /push to talk|release to send/i })
    .first();
  await pendingTalk.dispatchEvent("pointerdown", {
    pointerType: "mouse",
    button: 0,
  });
  await page.waitForFunction(() => window.__grants.length === 1);
  await pendingTalk.dispatchEvent("pointerup", {
    pointerType: "mouse",
    button: 0,
  });
  await page.evaluate(() => window.__grants.forEach(resolve => resolve()));
  await page.waitForFunction(() =>
    window.__streams
      .flatMap(s => s.getTracks())
      .every(t => t.readyState === "ended")
  );
  pass(
    "push-to-talk released before permission completes does not leave a live microphone"
  );
  await context.close();

  // Deferred responses reproduce destination switches and narration cancellation.
  context = await newContext(375);
  let staleGuide;
  let guideRequests = 0;
  await page.route("**/api/ai/chat", route => {
    guideRequests++;
    if (guideRequests === 1) {
      staleGuide = route;
      return;
    }
    return route.fulfill({
      json: { success: true, data: { reply: "Current destination guidance." } },
    });
  });
  await goto("/onesa-ai-tourism-augmented-experience");
  await page.locator("#aug-place").selectOption({ index: 1 });
  await page.waitForFunction(() => document.querySelector("#aug-place")?.value);
  for (let i = 0; !staleGuide && i < 100; i++) await page.waitForTimeout(20);
  assert(staleGuide, "First AR guide request must start");
  await page.locator("#aug-place").selectOption({ index: 2 });
  await expectText("Current destination guidance.");
  await staleGuide.fulfill({
    json: { success: true, data: { reply: "Obsolete destination guidance." } },
  });
  await page.waitForTimeout(350);
  assert.equal(
    await page.getByText("Obsolete destination guidance.").count(),
    0
  );
  assert.equal(
    guideRequests,
    2,
    "Switching destination starts fresh guidance without an obsolete retry"
  );
  pass(
    "AR ignores obsolete destination responses and immediately requests the new destination"
  );
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: -20.15, longitude: 28.58 });
  await page.getByRole("button", { name: /use my location/i }).click();
  await page.waitForFunction(
    () => document.querySelector("#aug-place")?.value === "bulawayo"
  );
  await context.setGeolocation({ latitude: 52.52, longitude: 13.4 });
  await page.getByRole("button", { name: /use my location/i }).click();
  await expectText(/no listed destination is near/i);
  assert.equal(await page.locator("#aug-place").inputValue(), "bulawayo");
  pass(
    "AR locates Bulawayo correctly and keeps manual selection for locations outside the guide"
  );
  await context.close();

  for (const mode of ["ar", "vr"]) {
    context = await newContext(
      768,
      `window.__spoken=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.startsWith('blob:'))window.__spoken.push(this.src);return play.call(this);};window.speechSynthesis.speak=utterance=>{if(utterance.text.trim())window.__spoken.push(utterance.text);};`
    );
    await page.route("**/api/ai/chat", route =>
      route.fulfill({
        json: {
          success: true,
          data: { reply: "Local destination description." },
        },
      })
    );
    if (mode === "ar") {
      await goto("/onesa-ai-tourism-augmented-experience");
      await page.locator("#aug-place").selectOption({ index: 1 });
      await expectText("Local destination description.");
    } else {
      await chooseVr();
      await page.getByRole("dialog", { name: /vr.*unavailable/i }).waitFor();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /^close$/i })
        .last()
        .click();
    }
    let pendingNarration;
    await page.route("**/api/speech", route => {
      pendingNarration = route;
    });
    await page
      .getByRole("button", {
        name: mode === "vr" ? /^enable text-to-speech$/i : /^narration: off$/i,
      })
      .click();
    for (let i = 0; !pendingNarration && i < 100; i++)
      await page.waitForTimeout(20);
    assert(pendingNarration, `${mode} narration should start a request`);
    await page
      .getByRole("button", {
        name: mode === "vr" ? /^disable text-to-speech$/i : /^narration: on$/i,
      })
      .click();
    const spokenBefore = await page.evaluate(() => window.__spoken.length);
    await pendingNarration.fulfill({ contentType: "audio/wav", body: audio });
    await page.waitForTimeout(500);
    assert.equal(
      await page.evaluate(() => window.__spoken.length),
      spokenBefore,
      `${mode}: disabled narration must not play a late response or browser fallback`
    );
    if (mode === "vr") {
      const infoButton = page.getByRole("button", {
        name: /^show place information$/i,
      });
      await infoButton.focus();
      await page.keyboard.press("Enter");
      const informationDialog = page.getByRole("dialog");
      await informationDialog.waitFor();
      await page.keyboard.press("Tab");
      assert(
        await informationDialog.evaluate(dialog =>
          dialog.contains(document.activeElement)
        ),
        "Place information must keep keyboard focus in its dialog"
      );
      await page.keyboard.press("Escape");
      await informationDialog.waitFor({ state: "hidden" });
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute("aria-label") ===
          "Show place information"
      );
      const next = page.getByRole("button", { name: /^next scene$/i });
      await next.focus();
      await page.keyboard.press("Enter");
      await expectText(/walkthrough 2\/3/i);
      await page.getByRole("button", { name: /^previous scene$/i }).click();
      await expectText(/walkthrough 1\/3/i);
      pass(
        "VR scene navigation and place-information dialogs work by keyboard, trap focus and restore it"
      );
      await page.evaluate(() => {
        Element.prototype.requestFullscreen = async () => {
          throw new DOMException("Denied by browser", "NotAllowedError");
        };
      });
      await page.getByRole("button", { name: /^enter fullscreen$/i }).click();
      await page
        .getByRole("status")
        .filter({ hasText: /fullscreen is unavailable/i })
        .waitFor();
    }
    await page.unroute("**/api/speech");
    await page.getByRole("link", { name: /back to tourism/i }).click();
    pass(
      `${mode.toUpperCase()} ignores late narration after switching it off${mode === "vr" ? " and handles denied fullscreen" : ""}`
    );
    await context.close();
  }

  await waitForRateWindow("headset scenarios");
  const require = createRequire(import.meta.url);
  const xrRequire = createRequire(require.resolve("@react-three/xr"));
  const pmRequire = createRequire(xrRequire.resolve("@pmndrs/xr"));
  const iwer = await readFile(
    resolve(dirname(pmRequire.resolve("iwer")), "../build/iwer.js"),
    "utf8"
  );
  context = await newContext(
    1440,
    `${iwer}\nwindow.__observed=[];window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener("observe",event=>{const object=event.detail;window.__observed.push(object);if(object.isWebGLRenderer){const render=object.render;object.render=function(scene,camera){if(this.xr.isPresenting){window.__xrScene=scene;window.__xrRenderer=this;}return render.call(this,scene,camera);};}});window.__device=new IWER.XRDevice(IWER.metaQuest3,{stereoEnabled:true});window.__device.installRuntime();window.__xrFrames=0;const request=navigator.xr.requestSession.bind(navigator.xr);navigator.xr.requestSession=async(...args)=>{const session=await request(...args);const raf=session.requestAnimationFrame.bind(session);session.requestAnimationFrame=callback=>raf((time,frame)=>{window.__xrFrames++;callback(time,frame)});return session;};`
  );
  await chooseVr();
  await page.getByRole("button", { name: /^enter vr$/i }).click();
  await page.waitForFunction(
    () => window.__device.activeSession && window.__xrFrames > 10
  );
  const xrState = await page.evaluate(async () => {
    const session = window.__device.activeSession;
    const space = await session.requestReferenceSpace("local-floor");
    return new Promise(resolve =>
      session.requestAnimationFrame((_, frame) =>
        resolve({
          views: frame.getViewerPose(space).views.length,
          inputs: session.inputSources.length,
        })
      )
    );
  });
  assert.deepEqual(xrState, { views: 2, inputs: 2 });
  // XR frames can start before the asynchronously decoded panorama is uploaded.
  // Wait for the actual texture instead of assuming ten frames prove readiness.
  await page.waitForFunction(() => window.__xrScene?.background?.isTexture);
  const sceneState = await page.evaluate(() => {
    const scene = window.__xrScene;
    const renderer = window.__xrRenderer;
    return {
      panorama: !!scene?.background?.isTexture,
      draws: renderer?.info.render.calls,
      finitePose: renderer?.xr
        .getCamera()
        .matrixWorld.elements.every(Number.isFinite),
    };
  });
  assert.equal(sceneState.panorama, true);
  assert.equal(sceneState.finitePose, true);
  assert(sceneState.draws > 0);
  console.log("XR scene", JSON.stringify(sceneState));
  await expectText(/vr active/i);
  await screenshot("vr-headset");
  pass(
    "Quest 3 emulator enters immersive VR, renders stereo frames, and exposes two controllers"
  );
  await page.evaluate(() => {
    window.__selectEvents = 0;
    window.__device.activeSession.addEventListener(
      "select",
      () => window.__selectEvents++
    );
    window.__device.position.x += 0.2;
    window.__device.controllers.right.updateButtonValue("trigger", 1);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() =>
    window.__device.controllers.right.updateButtonValue("trigger", 0)
  );
  await page.waitForFunction(() => window.__selectEvents === 1);
  await page.evaluate(() => window.__device.activeSession.end());
  await page.getByRole("button", { name: /^enter vr$/i }).waitFor();
  await page.getByRole("button", { name: /^enter vr$/i }).click();
  await page.waitForFunction(() => !!window.__device.activeSession);
  // The emulator captures pointer events while immersive; exercise SPA navigation by keyboard.
  await page.getByRole("link", { name: /back to tourism/i }).focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !window.__device.activeSession);
  pass(
    "VR exits, reenters, accepts tracked input, and ends its session on navigation"
  );
  await context.close();

  context = await newContext(1440);
  await chooseVr();
  await page.getByRole("dialog", { name: /vr.*unavailable/i }).waitFor();
  await page
    .getByRole("button", { name: /^close$/i })
    .last()
    .click();
  await page.getByRole("button", { name: /^conversation: off$/i }).click();
  const talk = page
    .getByRole("button", { name: /push to talk|release to send/i })
    .first();
  const vrStt = page.waitForResponse(
    r =>
      r.url().endsWith("/api/speech") &&
      r.request().headers()["content-type"]?.includes("multipart")
  );
  await talk.dispatchEvent("pointerdown", { pointerType: "mouse", button: 0 });
  await page.waitForTimeout(500);
  await talk.dispatchEvent("pointerup", { pointerType: "mouse", button: 0 });
  assert.equal((await vrStt).status(), 200);
  await expectText(/(You|STT):.*Tell me about Victoria Falls/i);
  await expectText(/Response:.*Victoria Falls is a strong first stop/i);
  await responsive("vr");
  pass(
    "desktop VR fallback supports push-to-talk transcription and AI response without a headset"
  );
  await context.close();

  context = await newContext(
    1440,
    `${iwer}
    window.__device=new IWER.XRDevice(IWER.metaQuest3,{stereoEnabled:true});window.__device.installRuntime();
    const request=navigator.xr.requestSession.bind(navigator.xr);
    navigator.xr.requestSession=async(...args)=>{
      const session=await request(...args);window.__lateSession=session;window.__lateSessionEnded=false;
      session.addEventListener('end',()=>{window.__lateSessionEnded=true;});
      await new Promise(resolve=>{window.__grantVr=resolve;});return session;
    };`
  );
  await chooseVr();
  await page.getByRole("button", { name: /^enter vr$/i }).click();
  await page.waitForFunction(() => Boolean(window.__grantVr));
  await page
    .locator('a[href="/tourism"]:visible')
    .first()
    .evaluate(link => link.click());
  await page.waitForURL("**/tourism");
  await page.evaluate(() => window.__grantVr());
  await page.waitForFunction(() => window.__lateSessionEnded === true);
  pass(
    "headset permission granted after navigation ends its session instead of leaving VR running"
  );
  await context.close();

  context = await newContext(
    1440,
    `Object.defineProperty(navigator,'xr',{value:{isSessionSupported:async()=>true,requestSession:async()=>{throw new DOMException('Denied','NotAllowedError')},addEventListener(){},removeEventListener(){}}});`
  );
  await chooseVr();
  await page.getByRole("button", { name: /^enter vr$/i }).click();
  await page
    .getByRole("dialog")
    .getByText(/(could not|unable|failed).*VR|VR.*(failed|could not)/i)
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^close$/i })
    .last()
    .click();
  assert(await page.getByRole("button", { name: /^enter vr$/i }).isEnabled());
  pass(
    "rejected headset launch displays feedback and leaves the launch control usable"
  );
  await context.close();
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(securityErrors, []);
  assert.deepEqual(blockedExternalRequests, []);
  pass(
    "all service/device journeys finish without uncaught browser or CSP errors"
  );
} catch (error) {
  if (page && !page.isClosed()) {
    await screenshot("failure").catch(() => {});
    await writeFile(
      `${output}/failure.txt`,
      await page
        .locator("body")
        .innerText()
        .catch(() => "")
    );
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await writeFile(`${output}/server.log`, serverLog);
  await writeFile(
    `${output}/report.json`,
    JSON.stringify(
      {
        checks,
        pageErrors,
        consoleErrors,
        securityErrors,
        blockedExternalRequests,
        ok: !process.exitCode,
      },
      null,
      2
    )
  );
  console.log(`${checks.length} passed; report: ${output}/report.json`);
}
