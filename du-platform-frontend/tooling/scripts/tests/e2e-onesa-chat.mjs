import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium, webkit } from "playwright";

// Exercise the production UI without credentials or external service calls.
const root = resolve("du-platform-frontend/web/dist");
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};
await readFile(resolve(root, "index.html"));
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname
    );
    const file = resolve(
      root,
      `.${extname(pathname) ? pathname : "/index.html"}`
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
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
const channel = process.env.ONESA_BROWSER_CHANNEL || "chrome";
const engine = process.env.ONESA_BROWSER_ENGINE || "chromium";
assert(["chromium", "webkit"].includes(engine), "Unsupported test browser");
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  ...(engine === "chromium"
    ? { channel: channel === "chromium" ? undefined : channel }
    : {}),
  headless: true,
});
const errors = [],
  layoutChecks = [];
const output = process.env.ONESA_OUTPUT_DIR || `/tmp/du-onesa-chat-${engine}`;
await mkdir(output, { recursive: true });

try {
  for (const width of [375, 1440]) {
    for (const surface of ["page", "popup"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10_000);
      page.on("pageerror", error => errors.push(error.message));
      const requests = [];
      let healthReady = false,
        healthRequests = 0,
        releaseHealth;
      const initialHealth = new Promise(resolve => {
        releaseHealth = resolve;
      });
      let respond = async route =>
        route.fulfill({ json: { reply: "I am Onesa.", truncated: false } });
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.pathname === "/api/ai/ready") {
          healthRequests += 1;
          if (healthRequests === 1) await initialHealth;
          return route.fulfill({ json: { ready: healthReady } });
        }
        if (url.pathname === "/api/ai/chat") {
          requests.push(route.request().postDataJSON());
          return respond(route);
        }
        if (url.pathname.startsWith("/api/"))
          return route.fulfill({
            json: { ready: true, ok: true, user: null, results: [] },
          });
        if (url.hostname === "fonts.googleapis.com")
          return route.fulfill({ contentType: "text/css", body: "" });
        if (url.origin !== base) return route.abort();
        return route.continue();
      });

      await page.goto(
        `${base}${surface === "page" ? "/onesa-ai-chat" : "/"}?lng=en`
      );
      const cookieButton = page.getByRole("button", {
        name: /accept cookies/i,
      });
      if (await cookieButton.isVisible()) await cookieButton.click();
      if (surface === "popup")
        await page
          .locator('[data-onesa-bubble-trigger="true"]')
          .first()
          .click();
      const scope =
        surface === "popup"
          ? page.locator('[data-onesa-chat-modal="true"]')
          : page.locator(".chat-workspace");
      const input = scope.getByRole("textbox", { name: "Message to Onesa" });
      const send = scope.getByRole("button", { name: "Send", exact: true });
      const conversation = scope.getByRole("log");
      await conversation.waitFor();
      await scope.getByText("Checking…", { exact: true }).waitFor();
      releaseHealth();
      await scope.getByText("Offline", { exact: true }).waitFor();
      healthReady = true;
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await scope.getByText("Online", { exact: true }).waitFor();
      assert.equal(
        healthRequests,
        2,
        "Reconnection must bypass a cached failure without waiting 15 seconds"
      );
      assert(
        (await conversation.textContent()).trim().length > 0,
        "Opening chat must show an introductory assistant message"
      );
      assert.equal(
        requests.length,
        0,
        "Opening chat must not send a generation request"
      );
      assert(await send.isDisabled(), "Empty messages must not be sent");

      // Keep the actual composer and Close control visible when the viewport
      // is short, including the space remaining above an on-screen keyboard.
      // This exercises layout resizing; it does not simulate a native keyboard.
      if (surface === "popup" && width === 375) {
        for (const viewport of [
          { width: 320, height: 568 },
          { width: 844, height: 320 },
          { width: 390, height: 300 },
          { width: 1024, height: 600 },
        ]) {
          await page.setViewportSize(viewport);
          await input.focus();
          await page.waitForFunction(() => {
            const dialog = document.querySelector(
              '[data-onesa-chat-modal="true"]'
            );
            const elements = [
              dialog,
              dialog?.querySelector("textarea"),
              dialog?.querySelector('button[type="submit"]'),
              dialog?.querySelector('button[aria-label="Close"]'),
            ];
            return elements.every(element => {
              if (!element) return false;
              const box = element.getBoundingClientRect();
              return (
                box.width > 0 &&
                box.height > 0 &&
                box.left >= -1 &&
                box.top >= -1 &&
                box.right <= innerWidth + 1 &&
                box.bottom <= innerHeight + 1
              );
            });
          });
          for (const action of [
            send,
            scope.getByRole("button", { name: "Close", exact: true }),
          ]) {
            const box = await action.boundingBox();
            assert(
              box && box.width >= 44 && box.height >= 44,
              "Chat controls must retain 44px touch targets in short viewports"
            );
          }
          await page.screenshot({
            path: `${output}/popup-${viewport.width}x${viewport.height}.png`,
          });
          layoutChecks.push(viewport);
        }
        await page.setViewportSize({ width, height: 900 });
        // iOS can resize/pan only VisualViewport when the keyboard opens.
        // Change that browser API independently of the layout viewport and
        // verify the rendered composer, then restore the original getters.
        await page.evaluate(() => {
          Object.defineProperties(window.visualViewport, {
            height: { configurable: true, value: 280 },
            offsetTop: { configurable: true, value: 80 },
          });
          window.visualViewport.dispatchEvent(new Event("resize"));
          window.visualViewport.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(() => {
          const elements = [
            document.querySelector('[data-onesa-chat-modal="true"]'),
            document.querySelector(".onesa-chat-composer"),
            document.querySelector(
              '[data-onesa-chat-modal="true"] button[aria-label="Close"]'
            ),
          ];
          return (
            innerHeight === 900 &&
            elements.every(element => {
              if (!element) return false;
              const box = element.getBoundingClientRect();
              return box.height > 0 && box.top >= 79 && box.bottom <= 361;
            })
          );
        });
        await page.screenshot({
          path: `${output}/popup-visual-viewport-only.png`,
        });
        layoutChecks.push({
          visualViewportOnly: true,
          height: 280,
          offsetTop: 80,
        });
        await page.evaluate(() => {
          delete window.visualViewport.height;
          delete window.visualViewport.offsetTop;
          window.visualViewport.dispatchEvent(new Event("resize"));
          window.visualViewport.dispatchEvent(new Event("scroll"));
        });
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-onesa-chat-modal="true"]')
              .getBoundingClientRect().height > 280
        );
      }

      let release;
      const pending = new Promise(done => {
        release = done;
      });
      respond = async route => route.fulfill({ json: await pending });
      await input.fill("Tell me about Onesa");
      await input.evaluate(element => {
        element.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
            cancelable: true,
          })
        );
        element.form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
      });
      await scope.getByRole("button", { name: /Thinking/ }).waitFor();
      // Allow both network tasks from the same event batch to reach the handler.
      await page.waitForTimeout(100);
      assert.equal(
        requests.length,
        1,
        "Rapid Enter and submit must share one request"
      );
      release({ reply: "I am Onesa.", truncated: false });
      await scope.getByText("I am Onesa.", { exact: true }).waitFor();
      assert.equal(
        await scope.getByText("I am Onesa.", { exact: true }).count(),
        1
      );

      respond = async route =>
        route.fulfill({
          json: { reply: "A cut-off answer ending with", truncated: true },
        });
      await input.fill("Please give a complete answer");
      await send.click();
      await scope
        .getByRole("alert")
        .filter({ hasText: "Onesa couldn't finish this answer." })
        .waitFor();
      assert.equal(
        await scope
          .getByText("A cut-off answer ending with", { exact: true })
          .count(),
        0,
        "Cut-off replies must never be rendered"
      );
      assert.equal(
        await input.inputValue(),
        "Please give a complete answer",
        "An incomplete answer must keep the request available for retry"
      );

      respond = async route =>
        route.fulfill({
          status: 503,
          json: {
            code: "ONESA_INCOMPLETE_REPLY",
            message:
              "Onesa could not finish a complete response. Please try again.",
          },
        });
      const failure = page.waitForResponse(
        response =>
          response.url().endsWith("/api/ai/chat") && response.status() === 503
      );
      await send.click();
      await failure;
      await scope
        .getByRole("alert")
        .filter({ hasText: "Onesa couldn't finish this answer." })
        .waitFor();
      assert.equal(await input.inputValue(), "Please give a complete answer");

      respond = async route => route.fulfill({ json: { reply: {} } });
      const retryPrompt = "Please answer my travel question";
      await input.fill(retryPrompt);
      await send.click();
      await scope.getByRole("alert").waitFor();
      assert.equal(
        await input.inputValue(),
        retryPrompt,
        "Failed input must be restored"
      );
      assert.equal(
        await scope.locator("p").filter({ hasText: retryPrompt }).count(),
        0,
        "A failed request must not remain in conversation history"
      );

      respond = async route =>
        route.fulfill({ status: 429, json: { retryAfterMs: 2000 } });
      await send.click();
      await scope.getByRole("alert").filter({ hasText: /2s/ }).waitFor();
      assert(await send.isDisabled(), "Retry cooldown must disable submit");
      const count = requests.length;
      await input.press("Enter");
      await page.waitForTimeout(100);
      assert.equal(
        requests.length,
        count,
        "Enter must also respect the retry cooldown"
      );

      respond = async route =>
        route.fulfill({
          json: { reply: "Your retry succeeded.", truncated: false },
        });
      await page.waitForFunction(() => {
        const textarea = document.querySelector(
          'textarea[aria-label="Message to Onesa"]'
        );
        return (
          textarea &&
          !textarea.form.querySelector('button[type="submit"]').disabled
        );
      });
      await send.click();
      await scope.getByText("Your retry succeeded.").waitFor();
      assert.equal(
        requests
          .at(-1)
          .messages.filter(
            message =>
              message.role === "user" && message.content === retryPrompt
          ).length,
        1,
        "Retry must send the prompt once"
      );

      await input.fill("A message still being composed");
      const beforeComposition = requests.length;
      await input.evaluate(element =>
        element.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            isComposing: true,
            bubbles: true,
            cancelable: true,
          })
        )
      );
      await page.waitForTimeout(100);
      assert.equal(
        requests.length,
        beforeComposition,
        "IME confirmation must not submit a message"
      );
      await context.close();
      console.log(
        `PASS ${engine} ${width}px ${surface}: checking, offline recovery, welcome, single submit, blocks incomplete answers, failed input, retry cooldown, clean history, IME`
      );
    }
  }
  assert.deepEqual(
    errors,
    [],
    "Chat interactions must not raise browser errors"
  );
} finally {
  await writeFile(
    `${output}/report.json`,
    JSON.stringify({ engine, layoutChecks, errors }, null, 2)
  );
  await browser.close();
  await new Promise(done => server.close(done));
}
