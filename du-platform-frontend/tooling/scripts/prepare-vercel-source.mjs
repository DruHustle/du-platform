import fs from "node:fs/promises";
import path from "node:path";
import { productionProxy } from "./lib/backend-deployment.mjs";

// Vercel's project root is nested in the repository. Stage only the web app
// so the CLI never uploads the API, local credentials or installed packages.
const requested = process.argv[2];
if (!requested) throw new Error("Provide an empty staging directory.");
const flags = process.argv.slice(3);
if (flags.length > 1 || (flags.length === 1 && flags[0] !== "--production"))
  throw new Error("The only optional staging argument is --production.");
const target = path.resolve(requested);
const source = path.resolve("du-platform-frontend/web");
if (
  target === source ||
  target.startsWith(source + path.sep) ||
  source.startsWith(target + path.sep)
)
  throw new Error(
    "The staging directory must not contain or be inside the web application."
  );
// Preview staging remains offline and is isolated by prepare-preview.mjs.
// Production staging requires fresh, exact-revision backend readiness before
// any deployable source is written. Historical VM backends are refused.
const preparedConfig =
  flags[0] === "--production"
    ? await productionProxy(
        JSON.parse(await fs.readFile(path.join(source, "vercel.json"), "utf8"))
      )
    : null;
await fs.mkdir(target, { recursive: true });
if ((await fs.readdir(target)).length)
  throw new Error("The staging directory must be empty.");
const excluded = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".vercel",
  ".cert",
  ".claude",
  ".local-root",
  ".aws",
  ".codex",
  ".agents",
  ".DS_Store",
]);
await fs.cp(source, path.join(target, "du-platform-frontend/web"), {
  recursive: true,
  filter: async entry => {
    const name = path.basename(entry);
    if (
      excluded.has(name) ||
      /^\.env(?:\.|$)/.test(name) ||
      /\.(?:pem|key|p12|jks)$/i.test(name)
    )
      return false;
    const stat = await fs.lstat(entry);
    if (stat.isSymbolicLink())
      throw new Error(`Unexpected web source symlink: ${entry}`);
    return true;
  },
});
if (preparedConfig)
  await fs.writeFile(
    path.join(target, "du-platform-frontend/web/vercel.json"),
    JSON.stringify(preparedConfig, null, 2) + "\n"
  );
await fs.writeFile(
  path.join(target, ".vercelignore"),
  [
    ".vercel",
    "**/node_modules",
    "**/.env*",
    "**/.cert",
    "**/*.pem",
    "**/*.key",
    "",
  ].join("\n")
);
console.log(`Prepared web-only deployment source at ${target}`);
