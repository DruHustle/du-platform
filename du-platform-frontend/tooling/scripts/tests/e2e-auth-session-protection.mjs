const baseUrl = String(
  process.env.E2E_BASE_URL || "http://127.0.0.1:3000"
).replace(/\/+$/, "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseUrl).hostname))
  throw new Error("Use a local sandbox server.");
const unique = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const email = `e2e-${unique}@example.com`;
const password = "Str0ngPass!123";

function getSessionCookie(response) {
  if (typeof response.headers.getSetCookie === "function") {
    const cookies = response.headers.getSetCookie();
    const match = cookies.find(value => value.startsWith("du_session="));
    if (match) {
      return match.split(";")[0];
    }
  }

  const rawCookie = response.headers.get("set-cookie");
  if (!rawCookie) return "";
  return rawCookie.split(";")[0] || "";
}

const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    fullName: "E2E Security User",
    email,
    password,
    confirmPassword: password,
  }),
});

if (!registerResponse.ok) {
  throw new Error(`Registration failed with status ${registerResponse.status}`);
}

const sessionCookie = getSessionCookie(registerResponse);
if (!sessionCookie) {
  throw new Error("No session cookie was returned by register.");
}

const maliciousLogout = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: {
    Cookie: sessionCookie,
    Origin: "https://evil.example",
  },
});
const maliciousPayload = await maliciousLogout.json().catch(() => ({}));

const missingTokenLogout = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { Cookie: sessionCookie, Origin: baseUrl },
});
if (missingTokenLogout.status !== 403)
  throw new Error("Cookie-backed logout must require a CSRF header.");

const validLogout = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: {
    Cookie: sessionCookie,
    Origin: baseUrl,
    "X-CSRF-Token": "local-test",
  },
});
const validPayload = await validLogout.json().catch(() => ({}));

const result = {
  baseUrl,
  registerStatus: registerResponse.status,
  registerCacheControl: registerResponse.headers.get("cache-control"),
  maliciousLogoutStatus: maliciousLogout.status,
  maliciousLogoutCode: maliciousPayload?.error?.code ?? null,
  validLogoutStatus: validLogout.status,
  validLogoutOk: validPayload?.success === true,
};

console.log(JSON.stringify(result, null, 2));

if (result.registerCacheControl !== "no-store") process.exitCode = 1;
if (result.maliciousLogoutStatus !== 403) process.exitCode = 1;
if (result.maliciousLogoutCode !== "CSRF_ORIGIN_BLOCKED") process.exitCode = 1;
if (result.validLogoutStatus !== 200 || result.validLogoutOk !== true)
  process.exitCode = 1;
