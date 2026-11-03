import { describe, expect, it, vi } from "vitest";
import { signOutOnDevice } from "../src/signOut";

describe("native sign-out", () => {
  it("clears local account data after successful server revocation", async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    const clear = vi.fn().mockResolvedValue(undefined);
    await signOutOnDevice(revoke, clear);
    expect(revoke).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });
  it("still clears local data offline and reports the unrevoked server session", async () => {
    const clear = vi.fn().mockResolvedValue(undefined);
    await expect(signOutOnDevice(async () => { throw new Error("offline"); }, clear))
      .rejects.toThrow("server session could not be revoked");
    expect(clear).toHaveBeenCalledOnce();
  });
});
