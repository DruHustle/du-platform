import fs from "node:fs";
import assert from "node:assert/strict";
// Inspect the currently aliased production deployment before replacing it.
// Print only a validated public deployment ID, never full platform metadata.
const previous = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
assert.equal(previous.name, "du-platform");
assert.equal(previous.readyState, "READY");
assert.match(previous.id || "", /^dpl_[A-Za-z0-9]+$/);
console.log(`deployment=${previous.id}`);
