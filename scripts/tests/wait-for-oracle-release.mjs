import assert from "node:assert/strict";
const revision = process.env.EXPECTED_REVISION;
assert.match(revision || "", /^[a-f0-9]{40}$/);
const deadline = Date.now() + 20 * 60_000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(
      "https://du-api.152-70-22-84.sslip.io/api/ping",
      {
        signal: AbortSignal.timeout(15000),
        headers: { "Cache-Control": "no-cache" },
      }
    );
    if (response.ok && (await response.json()).commit === revision) {
      console.log("Oracle published expected commit " + revision);
      process.exit(0);
    }
  } catch {
    /* The previous image may be restarting during a verified release. */
  }
  console.log("Waiting for Oracle to release the tested commit.");
  await new Promise(done => setTimeout(done, 15000));
}
throw new Error(
  "Oracle did not publish the tested revision; Vercel remains blocked. Inspect the Oracle release worker."
);
