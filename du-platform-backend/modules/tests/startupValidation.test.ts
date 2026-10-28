import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/databaseRuntime", () => ({
  isMemoryFallbackEnabled: () => false,
}));
import { validateStartupConfiguration } from "../../core/startupValidation";

describe("production startup configuration", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    for (const name of [
      "AIVEN_MYSQL_URL",
      "AIVEN_MYSQL_HOST",
      "AIVEN_MYSQL_USER",
      "AIVEN_MYSQL_DATABASE",
    ])
      vi.stubEnv(name, "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("still rejects production without a database", () => {
    expect(() => validateStartupConfiguration()).toThrow(
      "Production requires AIVEN_MYSQL_URL"
    );
  });

  it("starts with database configuration without retired provider credentials", () => {
    vi.stubEnv("AIVEN_MYSQL_URL", "mysql://example.invalid/database");
    expect(() => validateStartupConfiguration()).not.toThrow();
  });
});
