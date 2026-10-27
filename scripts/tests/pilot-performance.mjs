// Comparable local lab measurements; no production API or provider calls.
import assert from "node:assert/strict";
import { createServer } from "node:https";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).map(value => {
    const i = value.indexOf("=");
    assert(i > 2, "Use --name=value arguments");
    return [value.slice(2, i), value.slice(i + 1)];
  })
);
assert(
  args.before && args.after && args.catalogue && args.out,
  "Set --before, --after, --catalogue and --out to local paths"
);
const catalogue = JSON.parse(await fs.readFile(args.catalogue, "utf8"));
assert(
  Array.isArray(catalogue.data?.products),
  "Use a saved public catalogue response"
);
assert(
  catalogue.data.products.every(p =>
    String(p.image_url).startsWith("/images/")
  ),
  "Measurement fixtures must use local images"
);
const csp = JSON.parse(await fs.readFile("vercel.json", "utf8"))
  .headers.find(row => row.source === "/(.*)")
  .headers.find(row => row.key === "Content-Security-Policy").value;
const temporary = await fs.mkdtemp(path.join(tmpdir(), "du-performance-"));
const servers = [],
  results = [];
let browser;
const relative = url => new URL(url).pathname;
try {
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
      path.join(temporary, "key.pem"),
      "-out",
      path.join(temporary, "cert.pem"),
    ],
    { stdio: "ignore" }
  );
  const tls = {
    key: await fs.readFile(path.join(temporary, "key.pem")),
    cert: await fs.readFile(path.join(temporary, "cert.pem")),
  };
  const origins = {};
  for (const variant of ["before", "after"]) {
    const root = path.resolve(args[variant]),
      cache = new Map();
    await fs.access(path.join(root, "index.html"));
    const server = createServer(tls, async (req, res) => {
      try {
        const pathname = decodeURIComponent(
          new URL(req.url, "https://localhost").pathname
        );
        res.setHeader("Content-Security-Policy", csp);
        if (pathname.startsWith("/api/")) {
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          return res.end(
            JSON.stringify(
              pathname === "/api/shop/products"
                ? catalogue
                : {
                    success: true,
                    data: { ready: false, user: null, commercialReady: false },
                    error: null,
                  }
            )
          );
        }
        let file = path.resolve(
          root,
          "." + (pathname === "/" ? "/index.html" : pathname)
        );
        assert(file.startsWith(root + path.sep));
        try {
          if (!(await fs.stat(file)).isFile()) throw new Error();
        } catch {
          try {
            await fs.access(file + ".html");
            file += ".html";
          } catch {
            file = path.join(root, "404.html");
            res.statusCode = 404;
          }
        }
        const ext = path.extname(file);
        const type =
          {
            ".js": "application/javascript",
            ".css": "text/css",
            ".html": "text/html",
            ".json": "application/json",
            ".webp": "image/webp",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".woff2": "font/woff2",
            ".svg": "image/svg+xml",
          }[ext] || "application/octet-stream";
        res.setHeader("Content-Type", type);
        res.setHeader(
          "Cache-Control",
          ext === ".html" ? "no-cache" : "public,max-age=86400"
        );
        let bytes = cache.get(file);
        if (!bytes) {
          bytes = await fs.readFile(file);
          if (/\.(js|css|html|json)$/.test(file)) bytes = gzipSync(bytes);
          cache.set(file, bytes);
        }
        if (/\.(js|css|html|json)$/.test(file))
          res.setHeader("Content-Encoding", "gzip");
        res.end(bytes);
      } catch {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise(done => server.listen(0, "127.0.0.1", done));
    servers.push(server);
    origins[variant] = "https://127.0.0.1:" + server.address().port;
  }
  browser = await chromium.launch();
  for (const route of ["/", "/shop", "/travel"])
    for (let run = 1; run <= 3; run++)
      for (const variant of ["before", "after"]) {
        const context = await browser.newContext({
          ignoreHTTPSErrors: true,
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 1,
          isMobile: true,
          reducedMotion: "reduce",
        });
        try {
          await context.addInitScript(() => {
            localStorage.setItem("du_cookie_consent_v1", "rejected");
            localStorage.setItem("i18nextLng", "en");
            window.__lcp = null;
            new PerformanceObserver(list => {
              const e = list.getEntries().at(-1);
              window.__lcp = {
                time: e.startTime,
                url: e.url,
                element: e.element?.outerHTML,
              };
            }).observe({ type: "largest-contentful-paint", buffered: true });
          });
          const page = await context.newPage(),
            external = [];
          page.on("request", request => {
            if (
              !request.url().startsWith(origins[variant]) &&
              !/^(data|blob):/.test(request.url())
            )
              external.push(request.url());
          });
          const cdp = await context.newCDPSession(page);
          await cdp.send("Network.enable");
          await cdp.send("Network.emulateNetworkConditions", {
            offline: false,
            latency: 100,
            downloadThroughput: 200000,
            uploadThroughput: 100000,
          });
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
          await page.goto(origins[variant] + route);
          await page.waitForTimeout(6500);
          const sample = await page.evaluate(() => ({
            lcp: Math.round(window.__lcp?.time || 0),
            lcpUrl: window.__lcp?.url,
            lcpElement: window.__lcp?.element,
            fcp: Math.round(
              performance.getEntriesByName("first-contentful-paint")[0]
                ?.startTime || 0
            ),
            domContentLoaded: Math.round(
              performance.getEntriesByType("navigation")[0]
                .domContentLoadedEventEnd
            ),
            resources: performance.getEntriesByType("resource").map(r => ({
              url: r.name,
              start: r.startTime,
              end: r.responseEnd,
              bytes: r.transferSize,
              type: r.initiatorType,
            })),
          }));
          assert.deepEqual(
            external,
            [],
            "No external services may be contacted during performance tests"
          );
          results.push({
            variant,
            path: route,
            run,
            ...sample,
            lcpUrl: sample.lcpUrl ? relative(sample.lcpUrl) : "",
            resources: sample.resources.map(r => ({
              ...r,
              url: relative(r.url),
            })),
            transferBytes: sample.resources.reduce((n, r) => n + r.bytes, 0),
            requests: sample.resources.length,
          });
          console.log(
            `${variant} ${route} ${run}: FCP ${sample.fcp} ms; LCP ${sample.lcp} ms`
          );
        } finally {
          await context.close();
        }
      }
  await fs.writeFile(
    args.out,
    JSON.stringify(
      {
        baseline: args["before-revision"] || "unspecified",
        updated: args["after-revision"] || "working tree",
        date: new Date().toISOString(),
        method: {
          browser: "Playwright bundled Chromium",
          viewport: [390, 844],
          cpuThrottle: 4,
          latencyMs: 100,
          downloadBytesPerSecond: 200000,
          uploadBytesPerSecond: 100000,
          samplesPerRoute: 3,
          observationMsAfterLoad: 6500,
          cache:
            "cold contexts; normal within-visit caching; no request interception",
          order: "paired before/after visits per route and repetition",
          servers:
            "local HTTPS with identical gzip/cache/CSP and saved public API fixtures",
          limits:
            "Local lab only; not Lighthouse or field Core Web Vitals. Run without concurrent builds/browser suites.",
        },
        samples: results,
      },
      null,
      2
    ) + "\n"
  );
} finally {
  if (browser) await browser.close();
  await Promise.all(
    servers.map(server => new Promise(done => server.close(done)))
  );
  await fs.rm(temporary, { recursive: true, force: true });
}
