import type express from "express";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../core/errorHandler";
import { logger } from "../../core/logger";

describe("request body errors", () => {
  it.each([
    ["entity.parse.failed", 400],
    ["entity.too.large", 413],
  ])(
    "returns an appropriate status for %s without logging request contents",
    (type, status) => {
      const log = vi.spyOn(logger, "error");
      try {
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        errorHandler(
          Object.assign(new Error("sensitive request contents"), { type }),
          {} as express.Request,
          res as unknown as express.Response,
          vi.fn()
        );
        expect(res.status).toHaveBeenCalledWith(status);
        expect(JSON.stringify(res.json.mock.calls)).not.toContain(
          "sensitive request contents"
        );
        expect(log).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    }
  );
});
