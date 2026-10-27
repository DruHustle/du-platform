import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit } from "playwright";

// Production assets, no backend or provider credentials. Playback is a controlled fixture.
const root = resolve("dist/public");
const output = process.env.VR_MUSIC_OUTPUT_DIR || "/tmp/du-vr-music";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = resolve(
      root,
      `.${extname(pathname) ? decodeURIComponent(pathname) : "/index.html"}`
    );
    if (!file.startsWith(root + sep)) throw new Error("Invalid path");
    const body = await readFile(file);
    response.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await readFile(resolve(root, "index.html"));
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const engine = process.env.VR_MUSIC_BROWSER_ENGINE || "chromium";
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  headless: true,
});
const errors = [],
  checks = [];
await mkdir(output, { recursive: true });
let page;
try {
  for (const width of [375, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    await context.route("**/*", route => {
      const url = new URL(route.request().url());
      if (url.hostname === "fonts.googleapis.com")
        return route.fulfill({ contentType: "text/css", body: "" });
      if (url.pathname === "/api/ai/chat")
        return route.fulfill({ json: { reply: "Local sample guidance." } });
      if (url.pathname.startsWith("/api/"))
        return route.fulfill({ json: { user: null } });
      if (url.origin !== base) return route.abort();
      return route.continue();
    });
    await context.addInitScript(() => {
      localStorage.setItem("du_cookie_consent_v1", "rejected");
      localStorage.setItem("i18nextLng", "en");
      // Music must work in the globe's WebGL fallback as well.
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return String(type).includes("webgl")
          ? null
          : getContext.call(this, type, ...args);
      };
      const proto = HTMLMediaElement.prototype;
      const play = proto.play,
        pause = proto.pause;
      const paused = Object.getOwnPropertyDescriptor(proto, "paused").get;
      const states = new WeakMap();
      const fixture = (window.__music = {
        plays: 0,
        defer: false,
        reject: false,
        pending: [],
        node: null,
      });
      const isMusic = node => node.dataset.onesaGlobeMusic === "true";
      Object.defineProperty(proto, "paused", {
        configurable: true,
        get() {
          return isMusic(this) ? !states.get(this) : paused.call(this);
        },
      });
      proto.pause = function () {
        if (!isMusic(this)) return pause.call(this);
        states.set(this, false);
        this.dispatchEvent(new Event("pause"));
      };
      proto.play = function () {
        if (!isMusic(this)) return play.call(this);
        fixture.node = this;
        fixture.plays++;
        if (fixture.reject)
          return Promise.reject(
            new DOMException("Blocked playback", "NotAllowedError")
          );
        const start = () => {
          states.set(this, true);
          this.dispatchEvent(new Event("play"));
        };
        if (fixture.defer)
          return new Promise((resolve, reject) =>
            fixture.pending.push({
              resolve: () => {
                start();
                resolve();
              },
              reject,
            })
          );
        start();
        return Promise.resolve();
      };
      fixture.latePlay = () => {
        states.set(fixture.node, true);
        fixture.node.dispatchEvent(new Event("play"));
      };
    });
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/travel/virtual-experience");
    const on = page.getByRole("button", { name: "Music: On", exact: true });
    const off = page.getByRole("button", { name: "Music: Off", exact: true });
    const stopped = async () => {
      await off.waitFor();
      assert.equal(await off.getAttribute("aria-pressed"), "false");
      assert(
        await page.evaluate(
          () => window.__music.node.paused && window.__music.node.muted
        )
      );
    };
    const playing = async () => {
      await on.waitFor();
      assert.equal(await on.getAttribute("aria-pressed"), "true");
      assert(
        await page.evaluate(
          () => !window.__music.node.paused && !window.__music.node.muted
        )
      );
    };
    await on.waitFor();
    await page.waitForFunction(() => window.__music.plays > 0);
    await playing();
    const touchTarget = await on.boundingBox();
    assert(
      touchTarget.width >= 44 && touchTarget.height >= 44,
      "Music toggle must have a usable touch target"
    );
    await on.click();
    await stopped();
    const calls = await page.evaluate(() => {
      const node = window.__music.node;
      for (const name of ["loadedmetadata", "canplay", "canplaythrough"])
        node.dispatchEvent(new Event(name));
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("pointerdown"));
      document.dispatchEvent(new Event("visibilitychange"));
      window.__music.latePlay();
      return window.__music.plays;
    });
    await page.waitForTimeout(3300);
    await stopped();
    assert.equal(
      await page.evaluate(() => window.__music.plays),
      calls,
      "Retries and readiness/focus events must respect Off"
    );
    for (let i = 0; i < 3; i++) {
      await off.click();
      await playing();
      await on.click();
      await stopped();
    }

    await page.evaluate(() => {
      window.__music.defer = true;
    });
    await off.click();
    await page.waitForFunction(() => window.__music.pending.length > 0);
    await on.click();
    await page.evaluate(() => {
      window.__music.defer = false;
      window.__music.pending.splice(0).forEach(pending => pending.resolve());
    });
    await stopped();

    await page.evaluate(() => {
      window.__music.reject = true;
    });
    await off.click();
    await stopped();
    await page.evaluate(() => {
      window.__music.reject = false;
      window.__music.defer = true;
    });
    await off.click();
    await on.click();
    await page.evaluate(() => {
      window.__music.defer = false;
    });
    await off.click();
    await page.evaluate(() =>
      window.__music.pending
        .splice(0)
        .forEach(pending =>
          pending.reject(new DOMException("Old request failed", "AbortError"))
        )
    );
    await playing();
    await on.click();
    await stopped();
    await page.screenshot({ path: `${output}/music-off-${width}.png` });
    await off.click();
    await page.locator("#vr-destination").selectOption({ index: 1 });
    assert(
      await page.evaluate(
        () => window.__music.node.paused && window.__music.node.muted
      )
    );
    await page.goto(base + "/travel/virtual-experience");
    await on.waitFor();
    await page.waitForFunction(() => window.__music.plays > 0);
    await page.getByRole("link", { name: /back to travel/i }).click();
    await page.waitForURL("**/travel");
    await page.waitForFunction(
      () => window.__music.node.paused && window.__music.node.muted
    );
    assert(
      await page.evaluate(
        () => window.__music.node.paused && window.__music.node.muted
      ),
      "Navigation must stop the captured audio element"
    );
    checks.push({ width, engine, ok: true });
    console.log(
      `PASS ${engine} ${width}: toggle, retries, late playback, failed and stale requests, destination and navigation cleanup`
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  await page?.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ checks, errors }, null, 2)
  );
  await browser.close();
  await new Promise(done => server.close(done));
}
