import { afterEach, describe, expect, it, vi } from "vitest";
import type express from "express";
const { findUserById } = vi.hoisted(() => ({ findUserById: vi.fn() }));
vi.mock("../../../lib/persistence/authStore", () => ({ findUserById }));
import { requireAdminAuth } from "../../../lib/admin";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("administrator identity checks", () => {
  const run = async (user: unknown, version = 1) => {
    vi.stubEnv("ADMIN_EMAILS", "owner@example.test");
    findUserById.mockResolvedValue(user);
    const response = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    await requireAdminAuth(
      { auth: { userId: 1, claims: { av: version } } } as express.Request,
      response as unknown as express.Response,
      next
    );
    return { response, next };
  };
  it("does not promote an unverified account just because its email is allowlisted", async () => {
    const { response, next } = await run(
      {
        id: 1,
        email: "owner@example.test",
        auth_version: 0,
        email_verified_at: null,
      },
      0
    );
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it("requires a fresh token after mailbox verification or password recovery", async () => {
    const { response, next } = await run(
      {
        id: 1,
        email: "owner@example.test",
        auth_version: 1,
        email_verified_at: new Date(),
      },
      0
    );
    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
  it("allows the verified owner with the current credential version", async () => {
    const { response, next } = await run({
      id: 1,
      email: "owner@example.test",
      auth_version: 1,
      email_verified_at: new Date(),
    });
    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
  });
  it("denies verified people outside the allowlist", async () => {
    const { response, next } = await run({
      id: 1,
      email: "reader@example.test",
      auth_version: 1,
      email_verified_at: new Date(),
    });
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it("fails closed with a safe response when the database is unavailable", async () => {
    findUserById.mockRejectedValue(new Error("private database details"));
    const response = {
        locals: {},
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      },
      next = vi.fn();
    await requireAdminAuth(
      { auth: { userId: 1, claims: { av: 1 } } } as express.Request,
      response as unknown as express.Response,
      next
    );
    expect(response.status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      "private database details"
    );
    expect(next).not.toHaveBeenCalled();
  });
});
