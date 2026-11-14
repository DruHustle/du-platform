import { createHash, webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startOnesa, consumeOnesa } from "./onesaSignIn";
import { api } from "@/lib/api";
vi.mock("@/lib/api", () => ({ api: { post: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());
describe("Onesa web return", () => {
  it("binds a single callback to its PKCE transaction and original URL", async () => {
    const store = new Map<string, string>();
    const location = {
      origin: "https://du.example.test",
      search: "",
      assign: vi.fn(),
    };
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("location", location);
    vi.stubGlobal("window", { history: { replaceState: vi.fn() } });
    vi.stubGlobal("sessionStorage", {
      setItem: (k: string, v: string) => store.set(k, v),
      getItem: (k: string) => store.get(k),
      removeItem: (k: string) => store.delete(k),
    });
    const config = {
      enabled: true,
      authorize: "https://auth.example.test/authorize",
      redirectUri: location.origin + "/login",
      clientId: "web",
      audience: "du",
    };
    const next = "/travel/my-trips?lang=en#private-trips";
    await startOnesa(config, next);
    const auth = new URL(location.assign.mock.calls[0][0]).searchParams;
    location.search = "?code=returned&state=" + auth.get("state");
    vi.mocked(api.post).mockResolvedValue({
      data: { linkRequired: false, user: { id: 123 }, accessToken: "fixture" },
    });
    const callback = consumeOnesa()!;
    expect(callback.next).toBe(next);
    expect((await callback.promise).user?.id).toBe(123);
    const body = vi.mocked(api.post).mock.calls[0][1] as {
      verifier: string;
      nonce: string;
    };
    expect(createHash("sha256").update(body.verifier).digest("base64url")).toBe(
      auth.get("code_challenge"),
    );
    expect(body.nonce).toBe(auth.get("nonce"));
    expect(() => consumeOnesa()).toThrow();
    await startOnesa(config, "//other.example");
    location.search = "?code=returned&state=unrelated";
    expect(() => consumeOnesa()).toThrow();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
