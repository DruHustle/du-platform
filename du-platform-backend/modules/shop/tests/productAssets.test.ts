import express from "express";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { createShopModuleRouter } from "../routes";

describe("catalogue asset API", () => {
  it("serves a packaged product image without exposing unrelated files", async () => {
    const app = express(); app.use("/api/shop", createShopModuleRouter());
    const server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("No test port");
      const base = `http://127.0.0.1:${address.port}`;
      const image = await fetch(`${base}/api/shop/assets/sports_rugby_jersey.jpg`);
      expect(image.status).toBe(200);
      expect(image.headers.get("content-type")).toMatch(/^image\/jpeg/);
      expect((await image.arrayBuffer()).byteLength).toBeGreaterThan(100);
      expect((await fetch(`${base}/api/shop/assets/missing.jpg`)).status).toBe(404);
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
