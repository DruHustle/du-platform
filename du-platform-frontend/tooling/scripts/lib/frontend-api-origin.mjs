import assert from "node:assert/strict";

// A healthy same-origin proxy does not prove the browser actually uses it:
// Vite can compile a dashboard environment override into the shipped client.
export function assertActiveFrontendApi(source, asset) {
  assert(
    !/\b[a-z0-9.-]+\.onrender\.com\b/i.test(source),
    `${asset}: browser JavaScript still points to the retired Render backend`
  );
}

// Follow lazy imports and Vite's dependency map as well as the HTML entry point.
export function referencedFrontendScripts(source, from = "/") {
  return [
    ...source.matchAll(/["']((?:\.\/|\/assets\/|assets\/)[^"'?#\s]+\.js)["']/g),
  ].map(([, reference]) => {
    const pathname = reference.startsWith("assets/")
      ? `/${reference}`
      : reference;
    return new URL(pathname, new URL(from, "https://frontend.invalid"))
      .pathname;
  });
}
