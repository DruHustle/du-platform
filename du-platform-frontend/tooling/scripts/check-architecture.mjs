import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isBuiltin } from "node:module";
import ts from "typescript";

const root = process.cwd();
const apps = [
  "du-platform-frontend/web",
  "du-platform-frontend/mobile",
  "du-platform-backend",
];
const allowedRootEntries = new Set([
  ".git",
  ".github",
  "du-platform-frontend",
  "du-platform-backend",
]);
for (const entry of fs.readdirSync(root))
  assert(
    allowedRootEntries.has(entry),
    "Unexpected repository-root entry: " + entry,
  );
assert(
  !fs.existsSync(path.join(root, "shared")),
  "Root shared application directory must not exist",
);
const ignored = new Set([
  "node_modules",
  "dist",
  ".expo",
  ".git",
  "Pods",
  ".gradle",
  "build",
  ".local-root",
  ".cert",
  ".claude",
]);
for (const name of apps) {
  const app = path.resolve(root, name);
  const inside = filename =>
    filename === app || filename.startsWith(app + path.sep);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(app, "package.json"), "utf8"),
  );
  const dependencies = new Set();
  for (const section of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    for (const [dependency, version] of Object.entries(manifest[section] || {})) {
      assert(
        !/^(?:workspace:|file:|link:)/i.test(String(version)),
        name + ": local dependency " + dependency,
      );
      dependencies.add(dependency);
    }
  }
  const aliases = [];
  for (const config of ["tsconfig.json", "tsconfig.node.json"]) {
    const filename = path.join(app, config);
    if (!fs.existsSync(filename)) continue;
    const { config: contents, error } = ts.readConfigFile(filename, ts.sys.readFile);
    assert(!error, name + ": unreadable compiler configuration " + config);
    for (const extended of [contents.extends].flat().filter(Boolean)) {
      if (typeof extended === "string" && extended.startsWith(".")) {
        assert(
          inside(path.resolve(app, extended)),
          name + ": compiler config extends outside the application",
        );
      }
    }
    const base = path.resolve(app, contents.compilerOptions?.baseUrl || ".");
    assert(inside(base), name + ": compiler baseUrl escapes the application");
    for (const [alias, targets] of Object.entries(
      contents.compilerOptions?.paths || {},
    )) {
      for (const target of targets) {
        assert(
          inside(path.resolve(base, target)),
          name + ": compiler alias escapes the application",
        );
      }
      aliases.push({ alias, targets, base });
    }
  }

  function isLocalAlias(target, filename) {
    for (const { alias, targets, base } of aliases) {
      const star = alias.indexOf("*");
      let replacement = "";
      if (star === -1) {
        if (alias !== target) continue;
      } else {
        const prefix = alias.slice(0, star);
        const suffix = alias.slice(star + 1);
        if (
          !target.startsWith(prefix) ||
          !target.endsWith(suffix) ||
          target.length < prefix.length + suffix.length
        )
          continue;
        replacement = target.slice(prefix.length, target.length - suffix.length);
      }
      for (const candidate of targets) {
        assert(
          inside(path.resolve(base, candidate.replace("*", replacement))),
          filename + ": cross-project alias import " + target,
        );
      }
      return true;
    }
    return false;
  }

  function checkImport(target, filename) {
    assert(
      !target.startsWith("@shared/"),
      filename + ": obsolete shared alias " + target,
    );
    assert(
      !target.startsWith("du-platform-frontend/") &&
        !target.startsWith("du-platform-backend/"),
      filename + ": cross-project import " + target,
    );
    if (target.startsWith(".")) {
      assert(
        inside(path.resolve(path.dirname(filename), target)),
        filename + ": cross-project import " + target,
      );
      return;
    }
    if (isBuiltin(target) || isLocalAlias(target, filename)) return;
    const dependency = target.startsWith("@")
      ? target.split("/").slice(0, 2).join("/")
      : target.split("/")[0];
    assert(
      dependencies.has(dependency),
      filename + ": undeclared import " + target,
    );
  }

  function inspectImports(filename) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const checkLiteral = literal => {
      if (literal && ts.isStringLiteralLike(literal))
        checkImport(literal.text, filename);
    };
    function visitNode(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        checkLiteral(node.moduleSpecifier);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      )
        checkLiteral(node.arguments[0]);
      if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      )
        checkLiteral(node.moduleReference.expression);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
        checkLiteral(node.argument.literal);
      ts.forEachChild(node, visitNode);
    }
    visitNode(source);
  }

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const file = path.join(dir, entry.name);
      assert(
        !entry.isSymbolicLink(),
        name + ": symlink outside dependency installation: " + file,
      );
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) inspectImports(file);
    }
  }
  visit(app);
  const lock = name.endsWith("mobile") ? "package-lock.json" : "pnpm-lock.yaml";
  assert(fs.existsSync(path.join(app, lock)), name + ": missing " + lock);
  assert(
    fs.existsSync(path.join(app, ".env.example")),
    name + ": missing environment example",
  );
  console.log("[architecture] " + name + ": source imports and dependencies are local");
}
