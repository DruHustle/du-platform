import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("cookie preferences", () => {
  it("requires an explicit choice and persists both rejection and acceptance", async () => {
    const values = new Map<string, string>([
      ["du_cookie_consent_seen_v1", "shown"],
    ]);
    const dispatchEvent = vi.fn();
    vi.stubGlobal("window", {
      dispatchEvent,
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    const { getCookieConsent, setCookieConsent, filterOptionalTelemetry } =
      await import("./cookieConsent");
    expect(getCookieConsent()).toBeNull();
    setCookieConsent("rejected");
    expect(getCookieConsent()).toBe("rejected");
    setCookieConsent("accepted");
    expect(getCookieConsent()).toBe("accepted");
    const event = { type: "pageview" };
    expect(filterOptionalTelemetry(event)).toBe(event);
    setCookieConsent("rejected");
    expect(filterOptionalTelemetry(event)).toBeNull();
    expect(dispatchEvent).toHaveBeenCalledTimes(3);
  });

  it("keeps preferences for the visit when storage is blocked", async () => {
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      get localStorage() {
        throw new Error("SecurityError");
      },
    });
    const { getCookieConsent, setCookieConsent } = await import(
      "./cookieConsent"
    );
    expect(getCookieConsent()).toBeNull();
    expect(() => setCookieConsent("rejected")).not.toThrow();
    expect(getCookieConsent()).toBe("rejected");
  });
});
