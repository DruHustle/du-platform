import crypto from "node:crypto";
import type express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { createJwtToken } from "../../../utils/jwt";

const secret = "regression-test-secret-at-least-32-characters";
const future = () => Math.floor(Date.now() / 1000) + 600;

function sign(claims: unknown) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString(
    "base64url"
  );
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const input = `${header}.${payload}`;
  return `${input}.${crypto.createHmac("sha256", secret).update(input).digest("base64url")}`;
}

function authenticate(token: string) {
  const req = {
    headers: { authorization: `Bearer ${token}` },
  } as express.Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  requireJwtAuth(req, res as unknown as express.Response, next);
  return { req, res, next };
}

describe("JWT authentication", () => {
  beforeEach(() => vi.stubEnv("JWT_SECRET", secret));
  afterEach(() => vi.unstubAllEnvs());

  it("accepts an issued, unexpired access token", () => {
    const result = authenticate(createJwtToken({ sub: 7 }));
    expect(result.req.auth?.userId).toBe(7);
    expect(result.next).toHaveBeenCalledOnce();
  });

  it.each([undefined, null, "9999999999", 0])(
    "rejects missing, invalid or expired exp %s",
    exp => {
      const result = authenticate(sign({ sub: 7, exp }));
      expect(result.res.status).toHaveBeenCalledWith(401);
      expect(result.next).not.toHaveBeenCalled();
    }
  );

  it("rejects extra JWT segments and tampered signatures", () => {
    const token = sign({ sub: 7, exp: future() });
    for (const invalid of [`${token}.extra`, `${token.slice(0, -1)}!`]) {
      expect(authenticate(invalid).res.status).toHaveBeenCalledWith(401);
    }
  });

  it.each([7.5, true, [], Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid subjects %s",
    sub => {
      const result = authenticate(sign({ sub, exp: future() }));
      expect(result.res.status).toHaveBeenCalledWith(401);
      expect(result.next).not.toHaveBeenCalled();
    }
  );

  it.each(["tomorrow", null, future()])(
    "rejects invalid or future activation times %s",
    nbf => {
      expect(
        authenticate(sign({ sub: 7, exp: future(), nbf })).res.status
      ).toHaveBeenCalledWith(401);
    }
  );

  it.each([NaN, Infinity, 0, -1])(
    "does not issue a token with invalid duration %s",
    expiresInSeconds => {
      expect(() => createJwtToken({ sub: 7 }, { expiresInSeconds })).toThrow();
    }
  );
});
