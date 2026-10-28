import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../services/authService";
import { sendResetEmail } from "../../../lib/email";
vi.mock("../../../lib/email", async original => ({
  ...(await original<typeof import("../../../lib/email")>()),
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
