import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const revision = "a".repeat(40);
for (const fail of [false, true])
  test(`Oracle release ${fail ? "rolls back failed readiness" : "preserves secrets and releases only DU"}`, async () => {
    const fixture = await mkdtemp(
      path.join(tmpdir(), "du-oracle-release-test-")
    );
    try {
      const root = path.join(fixture, "app"),
        bin = path.join(fixture, "bin");
      await mkdir(root);
      await mkdir(bin);
      const original = {
        name: "du-platform",
        services: { app: { image: "du-platform:previous" } },
      };
      const runtime = {
        services: {
          app: {
            environment: {
              APP_REVISION: "previous",
              SECRET_FIXTURE: "literal$$value\nsecond line",
            },
          },
        },
      };
      await writeFile(
        path.join(root, "compose.yaml"),
        JSON.stringify(original)
      );
      await writeFile(
        path.join(root, "compose.runtime.json"),
        JSON.stringify(runtime)
      );
      const commands = {
        uname: "#!/bin/sh\necho aarch64\n",
        flock: "#!/bin/sh\nexit 0\n",
        docker: `#!/bin/sh\necho "$*" >> "$FIXTURE_LOG"\ncase "$1" in build) cat > /dev/null ;; image) echo "$FIXTURE_REVISION" ;; esac\n`,
        curl: `#!/bin/sh\ncase "$*" in *api/ping*) printf '{"commit":"%s"}' "$FIXTURE_REVISION" ;; *api/ai/ready*) printf '{"ready":${fail ? "false" : "true"}}' ;; *) printf '{"ok":true}' ;; esac\n`,
      };
      for (const [name, code] of Object.entries(commands))
        await writeFile(path.join(bin, name), code, { mode: 0o755 });
      // Relocate host paths only. Execute the actual shell/Python manifest update,
      // verification and rollback logic against disposable files, never the VM.
      const source = (await readFile("deploy/oracle/deploy.sh", "utf8"))
        .replace("root=/opt/du-platform", `root='${root}'`)
        .replace(
          "/var/lock/du-platform-deploy.lock",
          path.join(fixture, "lock")
        );
      const script = path.join(fixture, "deploy.sh");
      await writeFile(script, source);
      const result = spawnSync("bash", [script, revision], {
        input: "fixture archive",
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          FIXTURE_LOG: path.join(fixture, "commands"),
          FIXTURE_REVISION: revision,
        },
      });
      assert.equal(result.status, fail ? 1 : 0, result.stderr);
      const manifest = JSON.parse(
        await readFile(path.join(root, "compose.yaml"), "utf8")
      );
      const config = JSON.parse(
        await readFile(path.join(root, "compose.runtime.json"), "utf8")
      );
      assert.equal(
        manifest.services.app.image,
        fail ? "du-platform:previous" : `du-platform:oracle-${revision}`
      );
      assert.equal(
        config.services.app.environment.APP_REVISION,
        fail ? "previous" : revision
      );
      assert.equal(
        config.services.app.environment.SECRET_FIXTURE,
        runtime.services.app.environment.SECRET_FIXTURE
      );
      assert(!result.stdout.includes("SECRET_FIXTURE"));
      assert(!result.stdout.includes("literal$$value"));
      const commandsLog = await readFile(
        path.join(fixture, "commands"),
        "utf8"
      );
      assert.equal(
        commandsLog
          .split("\n")
          .filter(line =>
            line.includes("up -d --no-deps --wait --wait-timeout 180 app")
          ).length,
        fail ? 2 : 1
      );
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
test("Oracle release rejects malformed revisions before any host changes", () => {
  for (const revision of ["main", "uname -a", "a".repeat(40) + "; id", ""]) {
    const result = spawnSync("bash", ["deploy/oracle/deploy.sh", revision], {
      encoding: "utf8",
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /full commit SHA is required/);
  }
});
