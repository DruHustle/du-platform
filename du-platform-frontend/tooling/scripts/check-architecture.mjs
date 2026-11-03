import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apps = ["du-platform-frontend/web", "du-platform-frontend/mobile", "du-platform-backend"];
const allowedRootEntries = new Set([".git", ".github", "du-platform-frontend", "du-platform-backend"]);
for (const entry of fs.readdirSync(root))
  assert(allowedRootEntries.has(entry), `Unexpected repository-root entry: ${entry}`);
assert(!fs.existsSync(path.join(root, "shared")), "Root shared application directory must not exist");
const ignored = new Set(["node_modules", "dist", ".expo", ".git", "Pods", ".gradle", "build", ".local-root", ".cert", ".claude"]);
for (const name of apps) {
  const app = path.resolve(root, name);
  const manifest = JSON.parse(fs.readFileSync(path.join(app, "package.json"), "utf8"));
  for (const section of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
    for (const [dependency, version] of Object.entries(manifest[section] || {})) {
      assert(!/^(?:workspace:|file:|link:)/i.test(String(version)), `${name}: local dependency ${dependency}`);
    }
  }
  for (const config of ["tsconfig.json", "tsconfig.node.json"]) {
    const filename = path.join(app, config);
    if (!fs.existsSync(filename)) continue;
    const contents = JSON.parse(fs.readFileSync(filename, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""));
    if (typeof contents.extends === "string" && contents.extends.startsWith(".")) {
      const extended = path.resolve(app, contents.extends);
      assert(extended === app || extended.startsWith(app + path.sep), `${name}: compiler config extends outside the application`);
    }
    const base = path.resolve(app, contents.compilerOptions?.baseUrl || ".");
    assert(base === app || base.startsWith(app + path.sep), `${name}: compiler baseUrl escapes the application`);
    for (const targets of Object.values(contents.compilerOptions?.paths || {})) {
      for (const target of targets) {
        const resolved = path.resolve(base, target);
        assert(resolved === app || resolved.startsWith(app + path.sep), `${name}: compiler alias escapes the application`);
      }
    }
  }
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      if (ignored.has(entry.name)) continue;
      const file = path.join(dir,entry.name);
      assert(!entry.isSymbolicLink(), `${name}: symlink outside dependency installation: ${file}`);
      if (entry.isDirectory()) { visit(file); continue; }
      if (!/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) continue;
      const source = fs.readFileSync(file,"utf8");
      const imports = source.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\(|\bimport\s*)["']([^"']+)["']/g);
      for (const match of imports) {
        const target=match[1];
        assert(!target.startsWith("@shared/"), `${file}: obsolete shared alias ${target}`);
        if (target.startsWith(".")) {
          const resolved=path.resolve(path.dirname(file),target);
          assert(resolved === app || resolved.startsWith(app+path.sep), `${file}: cross-project import ${target}`);
        }
        assert(!target.startsWith("du-platform-frontend/") && !target.startsWith("du-platform-backend/"), `${file}: cross-project import ${target}`);
      }
    }
  }
  visit(app);
  const lock = name.endsWith("mobile") ? "package-lock.json" : "pnpm-lock.yaml";
  assert(fs.existsSync(path.join(app,lock)), `${name}: missing ${lock}`);
  assert(fs.existsSync(path.join(app,".env.example")), `${name}: missing environment example`);
  console.log(`[architecture] ${name}: source imports and dependencies are local`);
}
