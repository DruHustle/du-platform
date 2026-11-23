import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api";
import { authorizedSessionRequest, sessionLifecycle } from "../src/sessionLifecycle";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe("native account request boundaries", () => {
  it("does not retry an old account mutation after a new login", async () => {
    const lifecycle = sessionLifecycle();
    const first = deferred<string>();
    let token = "account-A";
    const refresh = vi.fn();
    const send = vi.fn().mockReturnValue(first.promise);
    const result = authorizedSessionRequest(lifecycle, () => token, refresh, send).catch(error => error);
    const next = lifecycle.begin(); token = "account-B"; lifecycle.finish(next);
    first.reject(new ApiError("Expired", 401));
    expect(await result).toMatchObject({ code: "SESSION_CHANGED" });
    expect(send).toHaveBeenCalledExactlyOnceWith("account-A");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not retry if the account changes while refresh is in progress", async () => {
    const lifecycle = sessionLifecycle();
    const renewal = deferred<void>();
    const entered = deferred<void>();
    let token = "account-A";
    const send = vi.fn().mockRejectedValue(new ApiError("Expired", 401));
    const result = authorizedSessionRequest(lifecycle, () => token, () => { entered.resolve(); return renewal.promise; }, send).catch(error => error);
    await entered.promise;
    const next = lifecycle.begin(); token = "account-B"; lifecycle.finish(next); renewal.resolve();
    expect(await result).toMatchObject({ code: "SESSION_CHANGED" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("rejects stale successful account data, including a renewed request (%s)", async renewed => {
    const lifecycle = sessionLifecycle();
    const response = deferred<string>();
    const entered = deferred<void>();
    let token = "account-A";
    const send = vi.fn((credential: string) => {
      if (renewed && credential === "account-A") return Promise.reject(new ApiError("Expired", 401));
      entered.resolve(); return response.promise;
    });
    const result = authorizedSessionRequest(lifecycle, () => token, async () => { token = "renewed-A"; }, send).catch(error => error);
    await entered.promise;
    const next = lifecycle.begin(); token = "account-B"; lifecycle.finish(next);
    response.resolve("private account-A data");
    expect(await result).toMatchObject({ code: "SESSION_CHANGED" });
    expect(send.mock.calls.map(call => call[0])).not.toContain("account-B");
  });

  it("still renews and retries once for the same account", async () => {
    const lifecycle = sessionLifecycle();
    let token = "expired-A";
    const send = vi.fn().mockRejectedValueOnce(new ApiError("Expired", 401)).mockResolvedValueOnce("saved-A");
    await expect(authorizedSessionRequest(lifecycle, () => token, async () => { token = "renewed-A"; }, send)).resolves.toBe("saved-A");
    expect(send.mock.calls.map(call => call[0])).toEqual(["expired-A", "renewed-A"]);
  });
});

describe("native account storage ordering", () => {
  it("finishes an old cleanup before writing the newly accepted session", async () => {
    const lifecycle = sessionLifecycle();
    let stored = "account-A";
    const blockedClear = deferred<void>();
    const entered = deferred<void>();
    const logout = lifecycle.begin();
    const oldClear = lifecycle.storage(logout, async () => { entered.resolve(); await blockedClear.promise; stored = ""; }).catch(error => error);
    await entered.promise;
    const login = lifecycle.begin();
    const newWrite = lifecycle.storage(login, async () => { stored = "account-B"; });
    blockedClear.resolve();
    expect(await oldClear).toMatchObject({ code: "SESSION_CHANGED" });
    await newWrite;
    expect(stored).toBe("account-B");
  });

  it("an old credential write cannot complete after a newer logout clears storage", async () => {
    const lifecycle = sessionLifecycle();
    const blockedWrite = deferred<void>();
    const entered = deferred<void>();
    let stored = "";
    const login = lifecycle.begin();
    const accepted = lifecycle.storage(login, async () => { entered.resolve(); await blockedWrite.promise; stored = "account-A"; }).catch(error => error);
    await entered.promise;
    const logout = lifecycle.begin();
    const cleared = lifecycle.storage(logout, async () => { stored = ""; });
    blockedWrite.resolve();
    expect(await accepted).toMatchObject({ code: "SESSION_CHANGED" });
    await cleared;
    expect(stored).toBe("");
  });

  it("rejects a late order receipt/contact write from a previous account before storage runs", async () => {
    const lifecycle = sessionLifecycle();
    const orderEpoch = lifecycle.capture();
    const next = lifecycle.begin(); lifecycle.finish(next);
    const saveReceipt = vi.fn().mockResolvedValue(undefined);
    await expect(lifecycle.storage(orderEpoch, saveReceipt)).rejects.toMatchObject({ code: "SESSION_CHANGED" });
    expect(saveReceipt).not.toHaveBeenCalled();
  });

  it("does not cancel queued logout cleanup when a later login attempt fails", async () => {
    const lifecycle = sessionLifecycle();
    const blocker = deferred<void>();
    const entered = deferred<void>();
    let stored = "account-A";
    const previous = lifecycle.storage(0, async () => { entered.resolve(); await blocker.promise; }).catch(() => undefined);
    await entered.promise;
    lifecycle.begin();
    const logout = lifecycle.clearStorage(async () => { stored = ""; });
    const failedLogin = lifecycle.begin(); lifecycle.finish(failedLogin);
    blocker.resolve(); await previous; await logout;
    expect(stored).toBe("");
  });

  it("keeps the queue usable after a storage failure", async () => {
    const lifecycle = sessionLifecycle();
    await expect(lifecycle.storage(0, async () => { throw new Error("storage failure"); })).rejects.toThrow("storage failure");
    await expect(lifecycle.storage(0, async () => "next read")).resolves.toBe("next read");
  });
});
