import { describe, expect, it, vi } from "vitest";
import { signOutOnDevice } from "../src/signOut";

describe("native sign-out", () => {
  it("clears local account data before successful server revocation", async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn().mockResolvedValue(undefined);
    await signOutOnDevice(revoke, clear);
    expect(revoke).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    expect(clear.mock.invocationCallOrder[0]).toBeLessThan(revoke.mock.invocationCallOrder[0]);
  });
  it("still clears local data offline and reports the unrevoked server session", async () => {
    const clear = vi.fn().mockResolvedValue(undefined);
    await expect(signOutOnDevice(async () => { throw new Error("offline"); }, clear))
      .rejects.toThrow("server session could not be revoked");
    expect(clear).toHaveBeenCalledOnce();
  });
  it("does not erase a newer login when an older revocation completes", async () => {
    let stored = "account-A";
    let finish!: () => void;
    let began!: () => void;
    const started = new Promise<void>(resolve => { began = resolve; });
    const revocation = new Promise<void>(resolve => { finish = resolve; });
    const logout = signOutOnDevice(async () => { began(); await revocation; }, async () => { stored = ""; });
    await started;
    expect(stored).toBe("");
    stored = "account-B";
    finish(); await logout;
    expect(stored).toBe("account-B");
  });
});
