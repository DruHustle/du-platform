import express from "express";
import { createServer, type Server } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createAuthModuleRouter } from "../routes";
import { errorHandler } from "../../../core/errorHandler";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { requireAdminAuth } from "../../../shared/admin";
import { registerCoreMiddleware } from "../../../core/middleware";

vi.mock("../../../shared/databaseRuntime", () => ({
  db: null,
  isMemoryFallbackEnabled: () => true,
  isDbConnectionError: () => false,
}));
const issuer = "https://auth.example.test/",
  audience = "https://api.diasporaunlocked.com",
  ns = "https://onesa.eu/claims/";
const id = randomUUID(),
  verifier = "v".repeat(48),
  nonce = "n".repeat(43),
  state = "s".repeat(43);
const challenge = createHash("sha256").update(verifier).digest("base64url");
const users = [
  {
    email: "traveler@example.test",
    fullName: "Existing Traveler",
    password: "ExamplePassword1!",
  },
  {
    email: "another@example.test",
    fullName: "Second Traveler",
    password: "OtherPassword2!",
  },
];
const subject = "managed|fixture";
let server: Server,
  base: string,
  key: CryptoKey,
  token: string,
  idToken: string,
  providerUp = true,
  numeric: number;
const http = globalThis.fetch;
const sign = (payload: Record<string, unknown>, aud: string) =>
  new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "fixture" })
    .setIssuedAt()
    .setExpirationTime("4m")
    .setIssuer(issuer)
    .setAudience(aud)
    .setSubject(subject)
    .sign(key);
const claims = {
  [ns + "user_id"]: id,
  [ns + "products"]: ["diaspora-unlocked"],
  [ns + "roles"]: ["user"],
  email: users[1].email,
};
async function call(
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return http(base + path, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function exchange(client: "web" | "native", whichCode = "fresh") {
  return call("/auth/onesa/exchange", {
    client,
    code: whichCode,
    state,
    nonce,
    verifier,
  });
}
beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  key = pair.privateKey;
  const pub = {
    ...(await exportJWK(pair.publicKey)),
    kid: "fixture",
    alg: "RS256",
  };
  for (const [name, value] of Object.entries({
    CORS_ORIGINS: "https://du.example.test",
    ONESA_IDENTITY_ENABLED: "true",
    ONESA_ISSUER: issuer,
    ONESA_JWKS_JSON: JSON.stringify({ keys: [pub] }),
    ONESA_WEB_CLIENT_ID: "web",
    ONESA_NATIVE_CLIENT_ID: "native",
    ONESA_WEB_CLIENT_SECRET: "controlled-fixture",
    ONESA_WEB_CALLBACK: "https://du.example.test/login",
  }))
    vi.stubEnv(name, value);
  token = await sign(claims, audience);
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) !== issuer + "oauth/token")
        throw Error("Unexpected external request");
      if (!providerUp) throw Error("Issuer offline");
      const form = new URLSearchParams(String(init?.body)),
        client = form.get("client_id")!;
      expect(
        createHash("sha256")
          .update(form.get("code_verifier")!)
          .digest("base64url"),
      ).toBe(challenge);
      expect(form.get("redirect_uri")).toBe(
        client === "web"
          ? "https://du.example.test/login"
          : "diasporaunlocked://auth/onesa/callback",
      );
      expect(form.get("client_secret")).toBe(
        client === "web" ? "controlled-fixture" : null,
      );
      idToken = await sign(
        {
          nonce: form.get("code") === "bad-nonce" ? "wrong" : nonce,
          email: users[1].email,
        },
        client,
      );
      return Response.json({
        token_type: "Bearer",
        access_token: token,
        id_token: idToken,
      });
    },
  );
  const app = express();
  registerCoreMiddleware(app);
  app.use("/auth", createAuthModuleRouter());
  app.get("/operations", requireJwtAuth, requireAdminAuth, (_req, res) =>
    res.sendStatus(200),
  );
  app.use(errorHandler);
  server = createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw Error("Missing port");
  base = "http://127.0.0.1:" + addr.port;
  for (const user of users) {
    const created = await call("/auth/native/register", user);
    expect(created.status).toBe(201);
    if (user === users[0]) numeric = (await created.json()).data.user.id;
  }
});
afterAll(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await new Promise<void>((r) => server.close(() => r()));
});
describe("Onesa sign-in with an existing DU account", () => {
  it("binds both proven accounts, returns the old profile and bounds cookie renewal to the issuer token", async () => {
    const config = await call("/auth/onesa/config/web");
    expect((await config.json()).data.clientId).toBe("web");
    expect((await (await exchange("web")).json()).data.linkRequired).toBe(true);
    const link = (user: (typeof users)[number], client = "web") =>
      call("/auth/onesa/link", {
        client,
        accessToken: token,
        email: user.email,
        password: user.password,
      });
    expect(
      (await link({ ...users[0], password: "wrong-password" })).status,
    ).toBe(401);
    const response = await link(users[0]);
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    expect(response.headers.get("set-cookie")).toMatch(
      /HttpOnly.*Max-Age=2[0-4][0-9]/,
    );
    expect((await response.json()).data.user.id).toBe(numeric);
    expect((await link(users[0])).status).toBe(200);
    expect((await link(users[1])).status).toBe(409);
    const different = await sign(
      { ...claims, [ns + "user_id"]: randomUUID() },
      audience,
    );
    expect(
      (
        await call("/auth/onesa/link", {
          client: "web",
          accessToken: different,
          email: users[0].email,
          password: users[0].password,
        })
      ).status,
    ).toBe(409);
    const native = await exchange("native");
    expect(native.headers.get("set-cookie")).toBeNull();
    expect((await native.json()).data.user.email).toBe(users[0].email);
    expect((await exchange("web", "bad-nonce")).status).toBe(401);
    providerUp = false;
    expect((await exchange("web")).status).toBe(401);
    const me = await call("/auth/me", undefined, {
      authorization: "Bearer " + token,
    });
    expect((await me.json()).data.user.fullName).toBe(users[0].fullName);
    expect(
      (
        await call("/operations", undefined, {
          authorization: "Bearer " + token,
        })
      ).status,
    ).toBe(403);
    const cookieRefresh = await call(
      "/auth/token/refresh",
      {},
      { cookie, origin: "https://du.example.test", "x-csrf-token": "test" },
    );
    expect((await cookieRefresh.json()).data.accessToken).toBe(token);
    const invalid = [
      await sign(claims, "other-api"),
      await sign({ ...claims, [ns + "products"]: ["portal"] }, audience),
      await sign({ ...claims, [ns + "roles"]: "user" }, audience),
      idToken,
    ];
    for (const bad of invalid)
      expect(
        (await call("/auth/me", undefined, { authorization: "Bearer " + bad }))
          .status,
      ).toBe(401);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 301000);
    expect(
      (await call("/auth/me", undefined, { authorization: "Bearer " + token }))
        .status,
    ).toBe(401);
    expect(
      (
        await call(
          "/auth/token/refresh",
          {},
          { cookie, origin: "https://du.example.test", "x-csrf-token": "test" },
        )
      ).status,
    ).toBe(401);
    vi.useRealTimers();
    expect(
      (
        await call("/auth/native/login", {
          email: users[0].email,
          password: users[0].password,
        })
      ).status,
    ).toBe(200);
  });
});
