import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn() },
  markHasLoggedInBefore: vi.fn(),
}));

import { api, markHasLoggedInBefore, type AuthUser } from "@/lib/api";
import {
  clearCurrentUserBootstrap,
  primeCurrentUserBootstrap,
  resolveCurrentUserBootstrap,
} from "./authSessionBootstrap";

const oldUser: AuthUser = {
  id: 1,
  fullName: "Old User",
  email: "old@example.com",
};
const newUser: AuthUser = {
  id: 2,
  fullName: "New User",
  email: "new@example.com",
};

function pendingLookup() {
  let resolve!: (value: { data: { user: AuthUser | null } }) => void;
  const promise = new Promise<{ data: { user: AuthUser | null } }>(done => {
    resolve = done;
  });
  vi.mocked(api.get).mockReturnValueOnce(promise);
  return (user: AuthUser | null) => resolve({ data: { user } });
}

describe("current user bootstrap", () => {
  beforeEach(() => {
    clearCurrentUserBootstrap();
    vi.clearAllMocks();
  });

  it("deduplicates concurrent lookups and caches the user", async () => {
    const complete = pendingLookup();
    const first = resolveCurrentUserBootstrap();
    const second = resolveCurrentUserBootstrap();
    complete(oldUser);
    expect(await first).toEqual(oldUser);
    expect(await second).toEqual(oldUser);
    expect(await resolveCurrentUserBootstrap()).toEqual(oldUser);
    expect(api.get).toHaveBeenCalledOnce();
  });

  it("does not restore a logged-out user when an old lookup finishes", async () => {
    const complete = pendingLookup();
    const lookup = resolveCurrentUserBootstrap();
    clearCurrentUserBootstrap();
    complete(oldUser);
    expect(await lookup).toBeNull();
    expect(markHasLoggedInBefore).not.toHaveBeenCalled();
    const next = pendingLookup();
    const fresh = resolveCurrentUserBootstrap();
    next(null);
    expect(await fresh).toBeNull();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it("does not overwrite a newly signed-in user with an old lookup", async () => {
    const complete = pendingLookup();
    const lookup = resolveCurrentUserBootstrap();
    primeCurrentUserBootstrap(newUser);
    complete(oldUser);
    expect(await lookup).toEqual(newUser);
    expect(await resolveCurrentUserBootstrap()).toEqual(newUser);
  });

  it("keeps a new lookup in flight when an older lookup completes", async () => {
    const oldComplete = pendingLookup();
    const oldLookup = resolveCurrentUserBootstrap();
    clearCurrentUserBootstrap();
    const newComplete = pendingLookup();
    const newLookup = resolveCurrentUserBootstrap();
    oldComplete(oldUser);
    await oldLookup;
    const deduplicated = resolveCurrentUserBootstrap();
    newComplete(newUser);
    expect(await newLookup).toEqual(newUser);
    expect(await deduplicated).toEqual(newUser);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
