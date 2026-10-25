import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
const work = await mkdtemp(
  path.join(
    process.platform === "darwin" ? "/private/tmp" : "/tmp",
    "du-custody-test-"
  )
);
const run = (exe, args, options = {}) =>
  execFileSync(exe, args, { stdio: ["ignore", "pipe", "pipe"], ...options });
const gpg = args =>
  run("gpg", [
    "--homedir",
    path.join(work, "gnupg"),
    "--batch",
    "--pinentry-mode",
    "loopback",
    ...args,
  ]);
try {
  await mkdir(path.join(work, "gnupg"), { mode: 0o700 });
  gpg([
    "--passphrase",
    "",
    "--quick-generate-key",
    "DU synthetic recovery <fixture@example.test>",
    "default",
    "default",
    "1d",
  ]);
  await writeFile(
    path.join(work, "recipient.asc"),
    gpg(["--armor", "--export", "fixture@example.test"])
  );
  const secret = randomBytes(48).toString("hex"),
    grant = randomBytes(32).toString("hex"),
    mail = JSON.stringify({
      text: "Synthetic queued message",
      to: "fixture@example.test",
    });
  const sealCode = `import {sealOrderAccess} from './du-platform-backend/modules/shop/orderAccess.ts';console.log(JSON.stringify({grant:sealOrderAccess(process.env.FIXTURE_GRANT),payload:sealOrderAccess(process.env.FIXTURE_MAIL)}));`;
  const sealed = JSON.parse(
    run(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", sealCode],
      {
        env: {
          ...process.env,
          NODE_ENV: "test",
          JWT_SECRET: secret,
          FIXTURE_GRANT: grant,
          FIXTURE_MAIL: mail,
        },
      }
    ).toString()
  );
  const fixture = JSON.stringify(sealed);
  await writeFile(path.join(work, "fixture.sql"), fixture, { mode: 0o600 });
  await writeFile(
    path.join(work, "passphrase"),
    randomBytes(48).toString("hex"),
    { mode: 0o600 }
  );
  await writeFile(
    path.join(work, "runtime.json"),
    JSON.stringify({ JWT_SECRET: secret }),
    { mode: 0o600 }
  );
  gpg([
    "--yes",
    "--passphrase-file",
    path.join(work, "passphrase"),
    "--symmetric",
    "--cipher-algo",
    "AES256",
    "--output",
    path.join(work, "fixture.sql.gpg"),
    path.join(work, "fixture.sql"),
  ]);
  const secretRecipient = path.join(work, "not-a-public-key.asc");
  await writeFile(
    secretRecipient,
    gpg(["--armor", "--export-secret-keys", "fixture@example.test"]),
    { mode: 0o600 }
  );
  assert.throws(() =>
    run("python3", [
      "scripts/operations/prepare-recovery-custody.py",
      "--archive",
      path.join(work, "fixture.sql.gpg"),
      "--passphrase-file",
      path.join(work, "passphrase"),
      "--runtime-key-file",
      path.join(work, "runtime.json"),
      "--key-recipient",
      secretRecipient,
      "--archive-directory",
      path.join(work, "rejected-archive"),
      "--key-directory",
      path.join(work, "rejected-keys"),
    ])
  );
  const result = JSON.parse(
    run("python3", [
      "scripts/operations/prepare-recovery-custody.py",
      "--archive",
      path.join(work, "fixture.sql.gpg"),
      "--passphrase-file",
      path.join(work, "passphrase"),
      "--runtime-key-file",
      path.join(work, "runtime.json"),
      "--key-recipient",
      path.join(work, "recipient.asc"),
      "--archive-directory",
      path.join(work, "archive-custody"),
      "--key-directory",
      path.join(work, "key-custody"),
    ]).toString()
  );
  assert.equal(result.independentTransferVerified, false);
  const digest = result.archiveSha256;
  gpg([
    "--yes",
    "--passphrase",
    "",
    "--decrypt",
    "--output",
    path.join(work, "restored-keys.tar"),
    path.join(work, "key-custody", digest + ".keys.tar.gpg"),
  ]);
  await mkdir(path.join(work, "restored"), { mode: 0o700 });
  run("tar", [
    "xf",
    path.join(work, "restored-keys.tar"),
    "-C",
    path.join(work, "restored"),
  ]);
  const recovered = gpg([
    "--passphrase-file",
    path.join(work, "restored", "backup-passphrase"),
    "--decrypt",
    path.join(work, "archive-custody", digest + ".sql.gpg"),
  ]).toString();
  assert.equal(recovered, fixture);
  const retained = JSON.parse(
    await readFile(path.join(work, "restored", "runtime-keys.json"), "utf8")
  );
  const openCode = `import assert from 'node:assert/strict';import {openOrderAccess} from './du-platform-backend/modules/shop/orderAccess.ts';const fixture=JSON.parse(process.env.FIXTURE_SEALED);assert.equal(openOrderAccess(fixture.grant),process.env.FIXTURE_GRANT);assert.equal(openOrderAccess(fixture.payload),process.env.FIXTURE_MAIL);`;
  const env = {
    ...process.env,
    NODE_ENV: "test",
    JWT_SECRET: retained.JWT_SECRET,
    FIXTURE_SEALED: recovered,
    FIXTURE_GRANT: grant,
    FIXTURE_MAIL: mail,
  };
  run(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", openCode],
    { env }
  );
  assert.throws(() =>
    run(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", openCode],
      { env: { ...env, JWT_SECRET: randomBytes(48).toString("hex") } }
    )
  );
  console.log(
    JSON.stringify({
      syntheticCustodyRoundTrip: true,
      encryptedOrderGrantRecovered: true,
      encryptedQueuedPayloadRecovered: true,
      wrongKeyRejected: true,
      independentOffHostTransferVerified: false,
      productionDataUsed: false,
    })
  );
} finally {
  try {
    run("gpgconf", [
      "--homedir",
      path.join(work, "gnupg"),
      "--kill",
      "gpg-agent",
    ]);
  } catch {}
  await rm(work, { recursive: true, force: true });
}
