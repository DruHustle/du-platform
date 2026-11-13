import { passwordResetLink } from "../../../domain/passwordResetProtocol";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../services/authService";
import { sendResetEmail } from "../../../shared/email";
vi.mock("../../../shared/email", async original => ({
  ...(await original<typeof import("../../../shared/email")>()),
  sendResetEmail: vi.fn(),
}));
afterEach(() => vi.restoreAllMocks());

describe("password reset service", () => {
  it("uses one atomic operation and hashes before consuming the token", async () => {
    const repository = {
      resetPasswordWithToken: vi.fn().mockResolvedValue(true),
    };
    await expect(
      new AuthService(repository as any).resetPassword({
        token: "fixture",
        password: "StrongPassword123!",
      })
    ).resolves.toHaveProperty("message");
    expect(repository.resetPasswordWithToken).toHaveBeenCalledWith(
      "fixture",
      expect.stringMatching(/^[a-f0-9]{32}:[a-f0-9]{128}$/)
    );
  });
  it("reports an invalid or already consumed link without claiming success", async () => {
    const repository = {
      resetPasswordWithToken: vi.fn().mockResolvedValue(false),
    };
    await expect(
      new AuthService(repository as any).resetPassword({
        token: "fixture",
        password: "StrongPassword123!",
      })
    ).rejects.toMatchObject({ code: "AUTH_INVALID_RESET_TOKEN" });
  });
  it("does not reveal account existence or log provider credentials when reset email fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendResetEmail).mockRejectedValue(
      new Error("private-provider-key")
    );
    const repository = {
      findByEmail: vi
        .fn()
        .mockResolvedValueOnce({ id: 1, email: "fixture@example.test" })
        .mockResolvedValueOnce(null),
      queuePasswordReset: vi
        .fn()
        .mockRejectedValue(new Error("private-storage-secret")),
    };
    const service = new AuthService(repository as any);
    const responses = await Promise.all([
      service.forgotPassword({ email: "fixture@example.test" }),
      service.forgotPassword({ email: "missing@example.test" }),
    ]);
    expect(responses[0]).toEqual(responses[1]);
    expect(sendResetEmail).not.toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-|@/);
  });
});

describe("password recovery task link", () => {
  it("links only to the configured frontend and an approved task, with the token in the fragment", () => {
    const url = new URL(passwordResetLink("https://example.test", "de", "opaque", "/travel/my-trips"));
    expect(url.origin + url.pathname).toBe("https://example.test/reset-password");
    expect(url.searchParams.get("lng")).toBe("de");
    expect(url.searchParams.get("next")).toBe("/travel/my-trips");
    expect(url.search).not.toContain("opaque");
    expect(url.hash).toBe("#token=opaque");
  });

  it.each([undefined, "/shop/order-status?token=private", "/travel/flights?name=private", "https://example.test", "//example.test"])(
    "omits unrecognised or sensitive destinations from a recovery email",
    next => {
      const url = new URL(passwordResetLink("https://du.example.test", "en", "opaque", next));
      expect(url.searchParams.has("next")).toBe(false);
    }
  );
});
