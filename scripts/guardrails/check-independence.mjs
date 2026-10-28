import fs from "node:fs";
import path from "node:path";
import { isBuiltin } from "node:module";
import ts from "typescript";

const repo = path.resolve(import.meta.dirname, "../..");
const errors = [];
for (const app of ["du-platform-frontend", "du-platform-backend"]) {
  const root = path.join(repo, app);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8")
  );
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };
  const inside = filename =>
    filename === root || filename.startsWith(root + path.sep);
  for (const [name, version] of Object.entries(dependencies)) {
    if (/^(?:workspace:|link:|file:)/.test(version))
      errors.push(`${app}: local package dependency ${name}`);
  }
  function inspect(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      if (
        [
          "node_modules",
          "dist",
          "coverage",
          ".git",
          ".cert",
          ".vercel",
        ].includes(item.name)
      )
        continue;
      const filename = path.join(directory, item.name);
      if (item.isDirectory()) {
        inspect(filename);
        continue;
      }
      if (item.name.startsWith("tsconfig") && item.name.endsWith(".json")) {
        const { config, error } = ts.readConfigFile(filename, ts.sys.readFile);
        if (error)
          errors.push(`${filename}: unreadable compiler configuration`);
        for (const base of [config?.extends].flat().filter(Boolean)) {
          if (base.startsWith(".") && !inside(path.resolve(directory, base)))
            errors.push(
              `${filename}: compiler settings outside the application`
            );
        }
      }
      if (!/\.(?:ts|tsx|js|mjs)$/.test(item.name)) continue;
      const source = ts.createSourceFile(
        filename,
        fs.readFileSync(filename, "utf8"),
        ts.ScriptTarget.Latest,
        true
      );
      function check(specifier) {
        if (specifier.startsWith(".")) {
          if (!inside(path.resolve(directory, specifier)))
            errors.push(
              `${filename}: import outside the application: ${specifier}`
            );
          return;
        }
        if (specifier.startsWith("@/") && app === "du-platform-frontend")
          return;
        if (isBuiltin(specifier)) return;
        const name = specifier.startsWith("@")
          ? specifier.split("/").slice(0, 2).join("/")
          : specifier.split("/")[0];
        if (!Object.hasOwn(dependencies, name))
          errors.push(`${filename}: undeclared import ${specifier}`);
      }
      function visit(node) {
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          check(node.moduleSpecifier.text);
        if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            node.expression.getText(source) === "require")
        ) {
          const argument = node.arguments[0];
          if (argument && ts.isStringLiteral(argument)) check(argument.text);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  inspect(root);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  "[guardrails:independence] Each app owns its imports, packages, and compiler configuration."
);
