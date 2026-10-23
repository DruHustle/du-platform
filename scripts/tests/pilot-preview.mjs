// Read-only deployed preview smoke check; CLI preserves Deployment Protection.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = new URL(process.env.PILOT_PREVIEW_URL || "http://invalid");
assert(
  base.protocol === "https:" && base.hostname.endsWith(".vercel.app"),
  "Only a Vercel preview URL is allowed"
);
function read(pathname) {
  let raw;
  try {
    raw = execFileSync(
      "vercel",
      [
        "curl",
        pathname,
        "--deployment",
        base.origin,
        ...(process.env.VERCEL_TOKEN
          ? ["--token", process.env.VERCEL_TOKEN]
          : []),
        "--",
        "--silent",
        "--show-error",
        "--include",
        "--max-time",
        "30",
      ],
      {
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch {
    throw new Error(`Protected preview request failed: ${pathname}`);
  }
  let status, headers;
  while (raw.startsWith("HTTP/")) {
    const end = raw.indexOf("\r\n\r\n");
    assert(end >= 0, "Missing HTTP headers");
    headers = raw.slice(0, end);
    status = Number(headers.match(/^HTTP\/[\d.]+ (\d+)/)?.[1]);
    raw = raw.slice(end + 4);
  }
  assert.equal(status, 200, pathname);
  assert(
    /x-robots-tag:\s*[^\r\n]*noindex/i.test(headers),
    `${pathname}: preview noindex header`
  );
  return { body: raw, headers };
}
for (const pathname of [
  "/",
  "/shop",
  "/shop/products",
  "/tourism",
  "/investment",
  "/technology",
  "/legal-notice",
  "/delivery-and-returns",
  "/shop/order-status",
]) {
  const { body, headers } = read(pathname);
  assert(/content-security-policy:[^\r\n]*script-src 'self'/i.test(headers));
  assert(
    body.includes(
      `href="https://www.diasporaunlocked.com${pathname === "/" ? "/" : pathname}"`
    ),
    `${pathname}: canonical`
  );
  if (pathname === "/shop/order-status")
    assert(body.includes('name="du-order-status-version" content="1"'));
  else
    assert(
      body.includes('class="public-preview"'),
      `${pathname}: substantive initial HTML`
    );
  console.log(`PASS preview HTML, CSP, noindex ${pathname}`);
}
const { body } = read("/api/shop/products");
assert.equal(JSON.parse(body).error.code, "PREVIEW_API_DISABLED");
console.log(
  "PASS preview API returns local unavailable response; production is not proxied"
);
