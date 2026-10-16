import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertActiveFrontendApi,
  referencedFrontendScripts,
} from "../lib/frontend-api-origin.mjs";

test("rejects the actual stale browser API configuration even when a proxy is healthy", () => {
  for (const host of [
    "du-platform.onrender.com",
    "imsop-app.onrender.com",
    "learning-hub-yfe1.onrender.com",
  ]) {
    assert.throws(
      () =>
        assertActiveFrontendApi(
          `axios.create({baseURL:"https://${host}/api"})`,
          "/assets/lazy-route.js"
        ),
      /browser JavaScript still points to the retired Render backend/
    );
  }
});

test("follows entry scripts, lazy routes and Vite dependency maps without external URLs", () => {
  assert.deepEqual(
    referencedFrontendScripts(
      '<script src="/assets/index.js"></script><script src="https://external.example/other.js"></script>'
    ),
    ["/assets/index.js"]
  );
  assert.deepEqual(
    referencedFrontendScripts(
      'import("./Operations.js");const deps=["assets/vendor.js"];',
      "/assets/index.js"
    ),
    ["/assets/Operations.js", "/assets/vendor.js"]
  );
});

test("accepts same-origin browser routing and active custom backend origins", () => {
  for (const baseURL of ["/api", "https://du-api.152-70-22-84.sslip.io/api"]) {
    assert.doesNotThrow(() =>
      assertActiveFrontendApi(
        `axios.create({baseURL:${JSON.stringify(baseURL)}})`,
        "index.js"
      )
    );
  }
});
