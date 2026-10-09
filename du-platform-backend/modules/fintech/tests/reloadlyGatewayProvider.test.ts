import { describe, expect, it } from "vitest";
import { resolveReloadlyAudience } from "../providers/reloadlyGatewayProvider";

describe("resolveReloadlyAudience", () => {
  it("prefers the explicit audience override when provided", () => {
    expect(
      resolveReloadlyAudience(
        "https://topups.reloadly.com",
        "https://topups-sandbox.reloadly.com",
        "https://topups.reloadly.com"
      )
    ).toBe("https://topups.reloadly.com");
  });

  it("derives the audience from the configured sandbox base url", () => {
    expect(
      resolveReloadlyAudience(
        "",
        "https://utilities-sandbox.reloadly.com",
        "https://utilities.reloadly.com"
      )
    ).toBe("https://utilities-sandbox.reloadly.com");
  });

  it("falls back when the base url is invalid", () => {
    expect(
      resolveReloadlyAudience(
        undefined,
        "not-a-valid-url",
        "https://utilities.reloadly.com"
      )
    ).toBe("https://utilities.reloadly.com");
  });
});
