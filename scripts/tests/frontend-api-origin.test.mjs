import assert from "node:assert/strict";
import { test } from "node:test";
import { assertActiveFrontendApi } from "../lib/frontend-api-origin.mjs";

test("rejects the actual stale browser API configuration even when a proxy is healthy", () => {
  assert.throws(
    () =>
      assertActiveFrontendApi(
        'const client = axios.create({baseURL:"https://du-platform.onrender.com/api"})',
        "/assets/index.js"
      ),
    /browser JavaScript still points to the retired Render backend/
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
