import assert from "node:assert/strict";
const revision = process.env.EXPECTED_REVISION;
assert.match(
  revision || "",
  /^[a-f0-9]{40}$/,
  "Set EXPECTED_REVISION to the tested commit"
);
for (const origin of [
  "https://du-api.152-70-22-84.sslip.io",
  "https://www.diasporaunlocked.com",
]) {
  for (const path of ["/api/ping", "/api/health/db", "/api/ai/ready"]) {
    const response = await fetch(origin + path, {
      signal: AbortSignal.timeout(30000),
      headers: { "Cache-Control": "no-cache" },
    });
    assert.equal(response.status, 200, `${origin}${path} must be available`);
    const body = await response.json();
    if (path === "/api/ping")
      assert.equal(
        body.commit,
        revision,
        "The published backend must match the tested commit"
      );
    if (path === "/api/ai/ready")
      assert.equal(body.ready, true, "Onesa must be ready");
  }
  console.log(`PASS ${origin}: expected revision, database and Onesa ready`);
}
