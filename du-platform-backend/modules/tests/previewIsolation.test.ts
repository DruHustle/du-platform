import { expect, it } from "vitest";
import express from "express";
import { registerCoreMiddleware } from "../../core/middleware";
it("rejects anonymous preview and marked test writes to a production API", async () => {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const app = express();
  registerCoreMiddleware(app);
  app.post("/api/pilot-fixture", (_req, res) => res.sendStatus(204));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(done => server.once("listening", done));
  try {
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    for (const headers of [
      { Origin: "https://du-pilot-abc.vercel.app" },
      { "X-Du-Test-Environment": "fixture" },
    ]) {
      const response = await fetch(base + "/api/pilot-fixture", {
        method: "POST",
        headers,
      });
      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("PREVIEW_WRITE_BLOCKED");
    }
  } finally {
    await new Promise<void>(done => server.close(() => done()));
    process.env.NODE_ENV = before;
  }
});
