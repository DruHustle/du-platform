import type express from "express";
import { describe, expect, it } from "vitest";
import { resolveSessionToken } from "../../../shared/authSession";

describe("session cookie parsing", () => {
  it("treats malformed percent encoding as a missing session", () => {
    const req = {
      headers: { cookie: "du_session=%E0%A4%A" },
    } as express.Request;
    expect(resolveSessionToken(req)).toBeNull();
  });

  it("preserves valid session cookies and opaque bearer sessions", () => {
    expect(
      resolveSessionToken({
        headers: { cookie: "other=x; du_session=test%20session" },
      } as express.Request)
    ).toBe("test session");
    expect(
      resolveSessionToken({
        headers: { authorization: "Bearer opaque-session" },
      } as express.Request)
    ).toBe("opaque-session");
  });

  it.each(["Bearer jwt.access.token", "Bearer ", "Basic invalid", ""])(
    "never falls back to a session cookie after explicit authorization %s",
    authorization => {
      expect(
        resolveSessionToken({
          headers: { authorization, cookie: "du_session=valid-cookie" },
        } as express.Request)
      ).toBeNull();
    }
  );
});
