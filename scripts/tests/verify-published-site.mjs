import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";

// A newly assigned production domain can briefly serve the previous deployment.
// Repeat the full, unchanged assertions; a persistent defect still fails closed.
export async function verifyAfterPropagation(verify, wait = setTimeout) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (await verify()) return;
    if (attempt < 4) await wait(15000);
  }
  throw new Error(
    "Published-site verification failed after propagation retries"
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await verifyAfterPropagation(() => {
    const result = spawnSync(process.execPath, ["scripts/tests/seo-live.mjs"], {
      stdio: "inherit",
      timeout: 120000,
    });
    return result.status === 0;
  });
}
