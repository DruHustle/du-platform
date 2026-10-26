// Read-only deployed preview smoke check; CLI preserves Deployment Protection.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = new URL(process.env.PILOT_PREVIEW_URL || "http://invalid");
assert(
  base.protocol === "https:" && base.hostname.endsWith(".vercel.app"),
  "Only a Vercel preview URL is allowed"
);
async function read(pathname) {
  let raw;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      raw = execFileSync(
        "vercel",
        [
          "curl",
          pathname,
          "--deployment",
          base.origin,
          "--scope",
          process.env.VERCEL_SCOPE || "druhustles-projects",
          // Vercel reads VERCEL_TOKEN from the inherited environment. Its
          // native curl parser forwards an explicit --token to system curl.
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
      break;
    } catch (error) {
      if (attempt < 2) {
        await new Promise(done => setTimeout(done, 2000));
        continue;
      }
      // Keep diagnostics useful without printing a command, token or bypass header.
      const detail = String(error.stderr || "")
        .split(/\r?\n/)
        .filter(
          line =>
            /\berror:/i.test(line) &&
            !/authorization|x-vercel-protection-bypass/i.test(line)
        )
        .join(" ")
        .replace(/[A-Za-z0-9_.-]{30,}/g, "[redacted]")
        .slice(0, 500);
      throw new Error(
        `Protected preview request failed: ${pathname}. ${detail}`
      );
    }
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
  const { body, headers } = await read(pathname);
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
for (const route of [
  "/api/shop/products",
  "/api/admin/service-inbox",
  "/api/notifications/contact",
  "/api/auth/forgot-password",
]) {
  const { body } = await read(route);
  assert.equal(JSON.parse(body).error.code, "PREVIEW_API_DISABLED");
}
console.log(
  "PASS preview API returns local unavailable response; production is not proxied"
);
