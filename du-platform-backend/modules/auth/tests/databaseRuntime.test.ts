import { describe, expect, it } from "vitest";
import { isDbConnectionError } from "../../../lib/databaseRuntime";

describe("isDbConnectionError", () => {
  it("treats socket permission failures as connection errors when fallback is enabled", () => {
    expect(isDbConnectionError({ code: "EPERM" })).toBe(true);
    expect(isDbConnectionError({ code: "EACCES" })).toBe(true);
  });

  it("treats fatal pool and connection reset errors as connection errors when fallback is enabled", () => {
    expect(isDbConnectionError({ code: "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" })).toBe(true);
    expect(isDbConnectionError({ code: "PROTOCOL_ENQUEUE_AFTER_QUIT" })).toBe(true);
    expect(isDbConnectionError({ code: "ECONNRESET" })).toBe(true);
    expect(isDbConnectionError({ code: "EHOSTUNREACH" })).toBe(true);
  });
});
