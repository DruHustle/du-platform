import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { chromium } from "playwright";

// Exercise the production UI without credentials or external service calls.
const root = resolve("dist/public");
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
const browser = await chromium.launch({
  channel: process.env.ONESA_BROWSER_CHANNEL || "chrome",
  headless: true,
});
const errors = [];

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
      let respond = async route =>
        route.fulfill({ json: { reply: "I am Onesa.", truncated: false } });
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
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
      await scope
        .getByText(/I am an expert on Zimbabwe and the African continent/)
        .waitFor();
      assert(await send.isDisabled(), "Empty messages must not be sent");

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
      release({ reply: "I am Onesa.", truncated: true });
      await scope
        .getByText("This answer was cut short. Ask Onesa to continue.")
        .waitFor();
      assert.equal(
        await scope.getByText("I am Onesa.", { exact: true }).count(),
        1
      );

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
        `PASS ${width}px ${surface}: welcome, single submit, incomplete answer, failed input, retry cooldown, clean history, IME`
      );
    }
  }
  assert.deepEqual(
    errors,
    [],
    "Chat interactions must not raise browser errors"
  );
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
}
