import type express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerBackendApiRoutes } from "../../api/backend";

describe("backend liveness revision", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["oracle-tested-revision", ""])(
    "reports the image revision without a hosting-provider variable: %s",
    revision => {
      vi.stubEnv("APP_REVISION", revision);
      const routes = new Map<string, Function>();
      const app = {
        get: (path: string, handler: Function) => routes.set(path, handler),
        post: vi.fn(),
      };
      registerBackendApiRoutes(app as unknown as express.Express, {
        db: null,
        serverStartedAt: Date.now(),
      });
      const json = vi.fn();
      routes.get("/api/ping")!({}, { json });
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          service: "du-platform",
          commit: revision || null,
        })
      );
    }
  );
});
