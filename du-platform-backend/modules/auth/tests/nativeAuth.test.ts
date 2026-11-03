import express from "express";
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuthModuleRouter } from "../routes";
import { registerCoreMiddleware } from "../../../core/middleware";
import apiSpec from "../../../openapi.json";

// This suite must never write to a configured developer or production database.
vi.mock("../../../shared/databaseRuntime", () => ({
  db: null,
  isMemoryFallbackEnabled: () => true,
  isDbConnectionError: () => false,
}));

let server: Server;
let base: string;
const email = `native-${crypto.randomUUID()}@example.test`;
const password = "ExamplePassword123!";

beforeAll(async () => {
  const app = express();
  vi.stubEnv("CSRF_ENABLED", "true");
  registerCoreMiddleware(app);
  app.use("/api/auth", createAuthModuleRouter());
  server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  base = `http://127.0.0.1:${address.port}/api/auth`;
});

afterAll(async () => {
  if (server?.listening)
    await new Promise<void>(resolve => server.close(() => resolve()));
  vi.unstubAllEnvs();
});

async function post(path: string, body: unknown, token?: string) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("native authentication API", () => {
  it("shares accounts with the browser while keeping session credentials separate", async () => {
    const registered = await post("/native/register", {
      fullName: "Native Test User",
      email,
      password,
      confirmPassword: password,
    });
    expect(registered.status).toBe(201);
    expect(registered.headers.get("set-cookie")).toBeNull();
    const { data: created } = await registered.json();
    for (const field of apiSpec.components.schemas.NativeAuth.required)
      expect(created).toHaveProperty(field);
    expect(created.sessionToken).toMatch(/^[a-f0-9]{96}$/);
    expect(created.accessToken).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);

    const me = await fetch(base + "/me", {
      headers: { authorization: `Bearer ${created.accessToken}` },
    });
    expect((await me.json()).data.user.email).toBe(email);
    const anonymousProfile = await fetch(base + "/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: "Other" }) });
    expect(anonymousProfile.status).toBe(401);
    const profile = await fetch(base + "/profile", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${created.accessToken}` }, body: JSON.stringify({ fullName: "Updated User" }) });
    expect(profile.status).toBe(200);
    expect((await profile.json()).data.user.fullName).toBe("Updated User");
    const invalidProfile = await fetch(base + "/profile", { method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${created.accessToken}` }, body: JSON.stringify({ fullName: "Other", email: "other@example.test" }) });
    expect(invalidProfile.status).toBe(400);
    const refresh = await post("/token/refresh", {}, created.sessionToken);
    expect(refresh.status).toBe(200);
    expect((await refresh.json()).data.accessToken).toBeTruthy();

    const webLogin = await post("/login", { email, password });
    expect(webLogin.status).toBe(200);
    expect(webLogin.headers.get("set-cookie")).toContain("HttpOnly");
    const webCookie = webLogin.headers.get("set-cookie")!.split(";")[0];
    expect((await webLogin.json()).data.sessionToken).toBeUndefined();
    const crossSiteLogout = await fetch(base + "/logout", { method: "POST", headers: { cookie: webCookie, origin: "https://untrusted.example" } });
    expect(crossSiteLogout.status).toBe(403);

    const nativeLogin = await post("/native/login", { email, password });
    expect(nativeLogin.status).toBe(200);
    expect(nativeLogin.headers.get("set-cookie")).toBeNull();
    const { data: signedIn } = await nativeLogin.json();
    expect(signedIn.user.id).toBe(created.user.id);
    expect(signedIn.user.fullName).toBe("Updated User");
    expect(signedIn.sessionToken).not.toBe(created.sessionToken);
    expect((await post("/logout", {}, signedIn.sessionToken)).status).toBe(200);
    expect(
      (await post("/token/refresh", {}, signedIn.sessionToken)).status
    ).toBe(401);
    expect(
      (await post("/token/refresh", {}, created.sessionToken)).status
    ).toBe(200);
  });

  it("uses the same validation and credential failures as web login", async () => {
    expect(
      (await post("/native/login", { email: "invalid", password })).status
    ).toBe(400);
    expect(
      (await post("/native/login", { email, password: "wrong" })).status
    ).toBe(401);
    expect(
      (
        await post("/native/register", {
          fullName: "No",
          email: "bad",
          password: "short",
        })
      ).status
    ).toBe(400);
  });
});
