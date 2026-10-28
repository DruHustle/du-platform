import { readyShop } from "./shop-readiness-fixture.mjs";
import { getPublicShopSeedProducts } from "../../du-platform-backend/contracts/shopCatalog.ts";
import { createServer } from "node:https";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, webkit } from "playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const engine = process.env.PILOT_BROWSER || "chromium",
  out = process.env.PILOT_LAYOUT_OUTPUT_DIR || "/tmp/du-pilot-layout-" + engine;
await fs.mkdir(out, { recursive: true });
const catalogue = {
  readiness: readyShop(getPublicShopSeedProducts().map(p => p.id)),
  products: getPublicShopSeedProducts().map(p => ({ ...p, stock_qty: 3 })),
};
const config = JSON.parse(await fs.readFile("vercel.json", "utf8"));
const csp = config.headers
  .find(r => r.source === "/(.*)")
  .headers.find(h => h.key === "Content-Security-Policy").value;
const certDir = await fs.mkdtemp(path.join(tmpdir(), "du-pilot-https-"));
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-keyout",
    path.join(certDir, "key.pem"),
    "-out",
    path.join(certDir, "cert.pem"),
  ],
  { stdio: "ignore" }
);
const root = path.resolve("du-platform-frontend/dist");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
const server = createServer(
  {
    key: await fs.readFile(path.join(certDir, "key.pem")),
    cert: await fs.readFile(path.join(certDir, "cert.pem")),
  },
  async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "https://localhost").pathname
      );
      let file = path.resolve(
        root,
        "." +
          (pathname === "/"
            ? "/index.html"
            : path.extname(pathname)
              ? pathname
              : pathname + ".html")
      );
      if (!file.startsWith(root + path.sep)) throw new Error("Invalid path");
      const body = await fs.readFile(file);
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  }
);
await new Promise(done => server.listen(0, "127.0.0.1", done));
const base = "https://127.0.0.1:" + server.address().port;
const browser = await (engine === "webkit" ? webkit : chromium).launch(),
  checks = [],
  errors = [],
  violations = [],
  network = [];
const paths = [
  "/",
  "/shop",
  "/shop/products",
  "/shop/product/sables-rugby-home-kit",
  "/technology",
  "/investment",
  "/travel",
  "/travel/weather",
  "/travel/planner",
  "/legal-notice",
  "/privacy-policy",
  "/login?next=%2Fadmin",
];
try {
  for (const language of engine === "webkit"
    ? ["en"]
    : ["en", "de", "sn", "nd"])
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      await context.addInitScript(language => {
        localStorage.setItem("i18nextLng", language);
        localStorage.setItem("du_cookie_consent_v1", "rejected");
        window.__csp = [];
        document.addEventListener("securitypolicyviolation", e =>
          window.__csp.push({
            directive: e.effectiveDirective,
            uri: e.blockedURI,
          })
        );
      }, language);
      await context.route("**/*", async route => {
        const url = new URL(route.request().url());
        if (url.hostname === "fonts.googleapis.com")
          return route.fulfill({ contentType: "text/css", body: "" });
        if (url.origin !== base) return route.abort();
        if (url.pathname === "/api/shop/products")
          return route.fulfill({ json: catalogue });
        if (url.pathname.startsWith("/api/"))
          return route.fulfill({
            json: {
              ready: false,
              online: false,
              user: null,
              results: [],
              profile: null,
              products: [],
            },
          });
        if (route.request().resourceType() === "document") {
          const response = await route.fetch();
          return route.fulfill({
            response,
            headers: { ...response.headers(), "content-security-policy": csp },
          });
        }
        return route.continue();
      });
      const page = await context.newPage();
      const translations = JSON.parse(
        await fs.readFile(
          `du-platform-frontend/public/locales/${language}/translation.json`,
          "utf8"
        )
      );
      page.setDefaultTimeout(15000);
      page.on("pageerror", e =>
        errors.push({ language, width, message: e.message })
      );
      page.on("response", r => {
        if (new URL(r.url()).origin === base && r.status() >= 400)
          network.push({
            language,
            width,
            path: new URL(r.url()).pathname,
            status: r.status(),
          });
      });
      for (const path of paths) {
        await page.goto(base + path);
        await page.waitForFunction(
          language => document.documentElement.lang === language,
          language
        );
        await page.locator("main h1").waitFor({ state: "attached" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);
        if (path === "/shop/product/sables-rugby-home-kit") {
          const basketLabel = translations.shop.products.actions.checkout;
          assert.equal(typeof basketLabel, "string");
          const basket = page.getByRole("link", {
            name: basketLabel,
            exact: true,
          });
          await basket.waitFor({ state: "visible" });
          assert.equal(
            await basket.getAttribute("href"),
            "/shop/products?cart=1"
          );
          assert(
            !(await page.locator("main").innerText()).includes(
              "shop.products.actions."
            ),
            "Product actions must show translated labels rather than resource keys"
          );
        }
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          `${language} ${width} ${path} horizontal overflow`
        );
        if (path === "/" && width < 1024) {
          assert.equal(
            await page.locator("#home-hero-logo img").getAttribute("src"),
            "/images/brand/diaspora_unlocked_336.webp",
            "Keep the oversized master out of the critical Home render path"
          );
          const contrast = await page
            .locator('nav a[title][href="/shop"]')
            .first()
            .evaluate(link => {
              const bar = link.closest("nav").parentElement;
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 1;
              const ctx = canvas.getContext("2d");
              const paintBackground = () => {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, 1, 1);
                ctx.fillStyle = getComputedStyle(bar).backgroundColor;
                ctx.fillRect(0, 0, 1, 1);
              };
              const luminance = rgb =>
                rgb
                  .slice(0, 3)
                  .map(v => v / 255)
                  .map(v =>
                    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
                  )
                  .reduce(
                    (sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i],
                    0
                  );
              // A white hero is the worst backdrop for the translucent bar.
              return Math.min(
                ...Array.from(link.closest("nav").querySelectorAll("a")).map(
                  item => {
                    paintBackground();
                    const bg = luminance(
                      Array.from(ctx.getImageData(0, 0, 1, 1).data)
                    );
                    ctx.fillStyle = getComputedStyle(item).color;
                    ctx.fillRect(0, 0, 1, 1);
                    const fg = luminance(
                      Array.from(ctx.getImageData(0, 0, 1, 1).data)
                    );
                    return (
                      (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
                    );
                  }
                )
              );
            });
          assert(
            contrast >= 4.5,
            `Mobile navigation labels need 4.5:1 contrast over every hero (${contrast})`
          );
        }
        const clips = await page
          .locator(
            "main h1,main h2,main h3,main p,main dt,main dd,main button,main label"
          )
          .evaluateAll(nodes =>
            nodes
              .filter(n => {
                const s = getComputedStyle(n);
                return (
                  n.clientWidth > 1 &&
                  s.display !== "none" &&
                  !n.classList.contains("sr-only") &&
                  s.overflow !== "hidden" &&
                  n.scrollWidth > n.clientWidth + 3
                );
              })
              .map(n => ({
                tag: n.tagName,
                text: n.textContent.slice(0, 80),
                width: n.clientWidth,
                scroll: n.scrollWidth,
              }))
          );
        assert.deepEqual(
          clips,
          [],
          `${language} ${width} ${path} clipped text`
        );
        violations.push(
          ...(await page.evaluate(() => window.__csp)).map(v => ({
            ...v,
            path,
            language,
            width,
          }))
        );
        if (
          language === "en" &&
          [320, 390, 1440].includes(width) &&
          [
            "/",
            "/shop",
            "/shop/products",
            "/shop/product/sables-rugby-home-kit",
            "/travel",
            "/legal-notice",
          ].includes(path)
        ) {
          await page.screenshot({
            path: `${out}/${width}-${path.replace(/[^a-z0-9]/gi, "_")}.png`,
          });
        }
      }
      await page.goto(base + "/shop/products");
      await page
        .locator('a[href="#main-content"]')
        .waitFor({ state: "attached" });
      await page.keyboard.press(engine === "webkit" ? "Alt+Tab" : "Tab");
      const focus = await page.evaluate(() => ({
        tag: document.activeElement.tagName,
        text: document.activeElement.textContent,
        outline: getComputedStyle(document.activeElement).outlineStyle,
      }));
      assert(
        focus.tag === "A" &&
          focus.text.includes(language === "en" ? "Skip" : focus.text)
      );
      if (language === "en" && width === 390) {
        await page.goto(base + "/shop/products?cart=1");
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "200%")
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1
          ),
          "200% text zoom overflow"
        );
      }
      await page.waitForLoadState("networkidle");
      await context.close();
      checks.push({ language, width, pages: paths.length });
      console.log(
        `PASS ${engine} ${language} ${width}: ${paths.length} routes, CSP, overflow and keyboard`
      );
    }
  assert.deepEqual(errors, []);
  assert.deepEqual(violations, []);
  assert.deepEqual(network, []);
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
  await fs.rm(certDir, { recursive: true, force: true });
  await fs.writeFile(
    out + "/report.json",
    JSON.stringify({ checks, errors, violations, network }, null, 2)
  );
}
