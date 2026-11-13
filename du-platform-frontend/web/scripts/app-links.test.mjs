import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeAppLinks } from "./build-app-links.mjs";

test("publish configured store identities independently and remove obsolete associations", async t => {
  const output = await mkdtemp(path.join(os.tmpdir(), "du-app-links-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  const dir = path.join(output, ".well-known");
  const read = async file => JSON.parse(await readFile(path.join(dir, file), "utf8"));
  const fingerprint = Array(32).fill("ac").join(":");
  const rotatedFingerprint = Array(32).fill("09").join(":");
  await writeAppLinks(output, { IOS_APP_ID_PREFIX: "ABCDEFGHIJ" });
  assert.deepEqual((await read("apple-app-site-association")).applinks.details, [{
    appIDs: ["ABCDEFGHIJ.com.diasporaunlocked.app"],
    components: ["/reset-password", "/shop", "/shop/*", "/travel", "/travel/*"].map(route => ({ "/": route })),
  }]);
  await assert.rejects(read("assetlinks.json"), { code: "ENOENT" });
  await writeAppLinks(output, { PLAY_APP_SIGNING_CERT_SHA256: [fingerprint, rotatedFingerprint, fingerprint].join(",") });
  const [statement] = await read("assetlinks.json");
  assert.deepEqual(statement.relation, ["delegate_permission/common.handle_all_urls"]);
  assert.equal(statement.target.package_name, "com.diasporaunlocked.app");
  assert.deepEqual(statement.target.sha256_cert_fingerprints, [fingerprint.toUpperCase(), rotatedFingerprint]);
  await assert.rejects(read("apple-app-site-association"), { code: "ENOENT" });
  await assert.rejects(writeAppLinks(output, { IOS_APP_ID_PREFIX: "incorrect.prefix" }), /IOS_APP_ID_PREFIX/);
  await assert.rejects(writeAppLinks(output, { PLAY_APP_SIGNING_CERT_SHA256: "AA:11:22" }), /PLAY_APP_SIGNING_CERT_SHA256/);
  await writeAppLinks(output, {});
  await assert.rejects(read("assetlinks.json"), { code: "ENOENT" });
});
