import type express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireCurrentUser } from "../../../middleware/currentUser";
import { findUserById } from "../../../lib/persistence/authStore";

vi.mock("../../../lib/persistence/authStore", () => ({
  findUserById: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

async function authenticate(version: unknown) {
  const req = {
    auth: { userId: 7, claims: { av: version } },
  } as express.Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  await requireCurrentUser(req, res as unknown as express.Response, next);
  return { res, next };
}

describe("current account authorization", () => {
  it("accepts only the current password version", async () => {
    vi.mocked(findUserById).mockResolvedValue({
      id: 7,
      auth_version: 2,
    } as any);
    expect((await authenticate(2)).next).toHaveBeenCalledOnce();
    for (const stale of [0, 1, undefined, "2", NaN]) {
      const result = await authenticate(stale);
      expect(result.res.status).toHaveBeenCalledWith(401);
      expect(result.next).not.toHaveBeenCalled();
    }
  });
  it("rejects deleted accounts and fails closed during a storage outage", async () => {
    vi.mocked(findUserById).mockResolvedValue(null);
    expect((await authenticate(0)).res.status).toHaveBeenCalledWith(401);
    vi.mocked(findUserById).mockRejectedValue(new Error("Synthetic outage"));
    const result = await authenticate(0);
    expect(result.res.status).toHaveBeenCalledWith(503);
    expect(result.next).not.toHaveBeenCalled();
  });
});
