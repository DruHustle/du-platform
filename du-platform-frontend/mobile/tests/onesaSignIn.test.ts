import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { openOnesa } from "../src/onesaSignIn";
import { request } from "../src/api";
import { openAuthSessionAsync } from "expo-web-browser";
vi.mock("../src/api", () => ({ request: vi.fn() }));
vi.mock("expo-crypto", () => ({
  randomUUID: () => randomUUID(),
  CryptoDigestAlgorithm: { SHA256: "sha" },
  CryptoEncoding: { BASE64: "base64" },
  digestStringAsync: async (_a: string, value: string) =>
    createHash("sha256").update(value).digest("base64"),
}));
vi.mock("expo-web-browser", () => ({ openAuthSessionAsync: vi.fn() }));
const config = {
  enabled: true,
  authorize: "https://auth.example.test/authorize",
  clientId: "native",
  redirectUri: "diasporaunlocked://auth/onesa/callback",
  audience: "du",
};
describe("native Onesa browser callback", () => {
  it("sends the verifier only to the exchange and rejects an unexpected callback", async () => {
    let challenge = "";
    vi.mocked(openAuthSessionAsync).mockImplementation(
      async (url, redirect) => {
        expect(redirect).toBe(config.redirectUri);
        const params = new URL(url).searchParams;
        challenge = params.get("code_challenge")!;
        expect(params.get("code_challenge_method")).toBe("S256");
        expect(params.has("code_verifier")).toBe(false);
        return {
          type: "success",
          url: redirect + "?code=granted&state=" + params.get("state"),
        };
      },
    );
    vi.mocked(request).mockResolvedValue({
      accessToken: "fixture",
      user: { id: 72 },
      linkRequired: false,
    });
    expect((await openOnesa(config)).user?.id).toBe(72);
    const body = vi.mocked(request).mock.calls[0][1]?.body as {
      client: string;
      verifier: string;
    };
    expect(body.client).toBe("native");
    expect(createHash("sha256").update(body.verifier).digest("base64url")).toBe(
      challenge,
    );
    vi.mocked(openAuthSessionAsync).mockResolvedValue({
      type: "success",
      url: "diasporaunlocked://other?code=no&state=no",
    });
    await expect(openOnesa(config)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
