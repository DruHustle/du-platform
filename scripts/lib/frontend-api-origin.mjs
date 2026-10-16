import assert from "node:assert/strict";

// A healthy same-origin proxy does not prove the browser actually uses it:
// Vite can compile a dashboard environment override into the shipped client.
export function assertActiveFrontendApi(source, asset) {
  assert(
    !source.includes("du-platform.onrender.com"),
    `${asset}: browser JavaScript still points to the retired Render backend`
  );
}
