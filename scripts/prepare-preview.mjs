import fs from "node:fs";
// A preview has no configured isolated backend yet. Fail closed: no request,
// including anonymous POSTs, may be proxied to the production API.
const file = process.argv[2] || "vercel.json";
const config = JSON.parse(fs.readFileSync(file, "utf8"));
config.rewrites = config.rewrites.filter(r => !r.source.startsWith("/api"));
config.rewrites.unshift({
  source: "/api/:path*",
  destination: "/preview-api-unavailable.json",
});
config.headers.push({
  source: "/(.*)",
  headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
});
fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
