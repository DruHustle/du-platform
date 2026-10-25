import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

it("survives trailing compressed bytes with the real core parser", async () => {
  const fixture = fileURLToPath(
    new URL("./fixtures/compressed-body.mjs", import.meta.url)
  );
  const { stdout } = await promisify(execFile)(
    process.execPath,
    ["--max-old-space-size=128", "--import", "tsx", fixture],
    {
      env: { PATH: process.env.PATH, NODE_ENV: "test" },
      timeout: 8000,
      maxBuffer: 64 * 1024,
    }
  );
  expect(stdout).toContain(
    "PASS compressed trailing bytes and subsequent request"
  );
}, 10000);
