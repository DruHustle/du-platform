import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(
  new URL("../check-architecture.mjs", import.meta.url),
);
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "du-architecture-"));
  for (const name of [
    "du-platform-frontend/web",
    "du-platform-frontend/mobile",
    "du-platform-backend",
  ]) {
    const app = path.join(root, name);
    await fs.mkdir(app, { recursive: true });
    await fs.writeFile(
      path.join(app, "package.json"),
      JSON.stringify({ dependencies: { react: "1.0.0" } }),
    );
    await fs.writeFile(
      path.join(app, name.endsWith("mobile") ? "package-lock.json" : "pnpm-lock.yaml"),
      "",
    );
    await fs.writeFile(path.join(app, ".env.example"), "");
  }
  return root;
}
function run(root) {
  return spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
}
async function withFixture(callback) {
  const root = await fixture();
  try {
    await callback(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("accepts independent application inputs", async () => {
  await withFixture(async root => {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });
});

test("rejects a cross-project source import", async () => {
  await withFixture(async root => {
    for (const source of [
      'import /* boundary */ "../../mobile/app";',
      'module.require("../../mobile/app");',
    ]) {
      await fs.writeFile(
        path.join(root, "du-platform-frontend/web/app.ts"),
        source,
      );
      const result = run(root);
      assert.notEqual(result.status, 0, source);
      assert.match(result.stderr, /cross-project import/, source);
    }
  });
});

test("rejects local dependency links and escaping compiler aliases", async () => {
  await withFixture(async root => {
    const app = path.join(root, "du-platform-backend");
    await fs.writeFile(
      path.join(app, "package.json"),
      JSON.stringify({ dependencies: { web: "file:../du-platform-frontend/web" } }),
    );
    assert.notEqual(run(root).status, 0);
    await fs.writeFile(path.join(app, "package.json"), "{}");
    await fs.writeFile(
      path.join(app, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { paths: { "@shared/*": ["../shared/*"] } },
      }),
    );
    assert.notEqual(run(root).status, 0);
  });
});

test("rejects extra repository-root files or folders", async () => {
  await withFixture(async root => {
    await fs.writeFile(path.join(root, "unexpected.txt"), "stray");
    assert.notEqual(run(root).status, 0);
  });
});

test("accepts declared package subpaths and Node builtins", async () => {
  await withFixture(async root => {
    const app = path.join(root, "du-platform-backend");
    await fs.writeFile(
      path.join(app, "package.json"),
      JSON.stringify({
        dependencies: { react: "1.0.0", "@scope/tool": "1.0.0" },
        devDependencies: { vitest: "1.0.0" },
        optionalDependencies: { optional: "1.0.0" },
        peerDependencies: { peer: "1.0.0" },
      }),
    );
    await fs.writeFile(
      path.join(app, "app.ts"),
      [
        'import React from "react";',
        'export { Tool } from "@scope/tool/nested";',
        'import optional from "optional/subpath";',
        'const peer = import("peer");',
        'import fs from "node:fs/promises";',
        'const path = require("path");',
        'import { describe } from "vitest";',
      ].join("\n"),
    );
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    await fs.writeFile(
      path.join(app, "app.ts"),
      'import Tool from "@scope/tool-extra/nested";',
    );
    const undeclared = run(root);
    assert.notEqual(undeclared.status, 0);
    assert.match(undeclared.stderr, /undeclared import @scope\/tool-extra/);
  });
});

test("rejects undeclared literal imports across JavaScript and TypeScript forms", async () => {
  await withFixture(async root => {
    const file = path.join(root, "du-platform-backend/app.ts");
    for (const source of [
      'import /* dependency */ value\nfrom /* source */ "missing-package";',
      'import /* side effect */ "missing-package";',
      'export { value } from /* source */ "missing-package";',
      'const lazy = import /* dynamic */ ("missing-package");',
      'const dependency = require /* runtime */ ("missing-package");',
      'const dependency = module.require("missing-package");',
      'import Imported = require("missing-package");',
      'type Imported = import("missing-package").Imported;',
      'const lazy = import(\u0060missing-package\u0060);',
    ]) {
      await fs.writeFile(file, source);
      const result = run(root);
      assert.notEqual(result.status, 0, source);
      assert.match(result.stderr, /undeclared import missing-package/, source);
    }
  });
});

test("ignores import-like text in comments and ordinary strings", async () => {
  await withFixture(async root => {
    await fs.writeFile(
      path.join(root, "du-platform-frontend/web/app.ts"),
      [
        '// import "../../mobile/private";',
        '/* export { secret } from "../../mobile/private"; */',
        'const example = \'require("../../mobile/private")\';',
        'const help = \'import("missing-package")\';',
      ].join("\n"),
    );
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
  });
});

test("checks application-local aliases and rejects alias traversal", async () => {
  await withFixture(async root => {
    const web = path.join(root, "du-platform-frontend/web");
    await fs.mkdir(path.join(web, "src"));
    await fs.writeFile(
      path.join(web, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { baseUrl: ".", paths: { "@/*": ["./src/*"] } },
      }),
    );
    await fs.writeFile(path.join(web, "src/local.ts"), "export const value = 1;");
    const file = path.join(web, "src/app.ts");
    await fs.writeFile(file, 'import { value } from "@/local";');
    const accepted = run(root);
    assert.equal(accepted.status, 0, accepted.stderr);
    await fs.writeFile(file, 'import "@/../../mobile/private";');
    const traversal = run(root);
    assert.notEqual(traversal.status, 0);
    assert.match(traversal.stderr, /cross-project alias import/);
    await fs.writeFile(file, "");
    await fs.writeFile(
      path.join(root, "du-platform-backend/app.ts"),
      'import "@/local";',
    );
    const backend = run(root);
    assert.notEqual(backend.status, 0);
    assert.match(backend.stderr, /undeclared import @\/local/);
  });
});

test("does not accept dependencies declared only in tooling or another app", async () => {
  await withFixture(async root => {
    const tooling = path.join(root, "du-platform-frontend/tooling");
    await fs.mkdir(tooling);
    await fs.writeFile(
      path.join(tooling, "package.json"),
      JSON.stringify({ dependencies: { "tooling-only": "1.0.0" } }),
    );
    await fs.writeFile(
      path.join(root, "du-platform-frontend/mobile/package.json"),
      JSON.stringify({ dependencies: { "mobile-only": "1.0.0" } }),
    );
    const file = path.join(root, "du-platform-backend/app.ts");
    for (const dependency of ["tooling-only", "mobile-only"]) {
      await fs.writeFile(file, 'import "' + dependency + '";');
      const result = run(root);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /undeclared import/);
    }
  });
});

test("supports JSONC configs and rejects escaping array extends", async () => {
  await withFixture(async root => {
    const app = path.join(root, "du-platform-backend");
    await fs.writeFile(
      path.join(app, "tsconfig.json"),
      '{\n// Local compiler configuration\n"compilerOptions": {"baseUrl": ".",},\n}',
    );
    const accepted = run(root);
    assert.equal(accepted.status, 0, accepted.stderr);
    await fs.writeFile(
      path.join(app, "tsconfig.node.json"),
      JSON.stringify({
        extends: ["./tsconfig.json", "../du-platform-frontend/web/tsconfig.json"],
      }),
    );
    const escaping = run(root);
    assert.notEqual(escaping.status, 0);
    assert.match(escaping.stderr, /compiler config extends outside the application/);
  });
});
