import * as oidc from "openid-client";
import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from "jose";
import { z } from "zod";
import { AppError } from "../../core/errorHandler";

export const ONESA_PRODUCT = "diaspora-unlocked";
const claimsRoot = "https://onesa.eu/claims/";
const grant = z.array(z.string());
const clientKind = z.enum(["web", "native"]);
export type ClientKind = z.infer<typeof clientKind>;
export const exchangeInput = z
  .object({
    client: clientKind,
    code: z.string().min(1).max(4096),
    state: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
    nonce: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
    verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  })
  .strict();

export const enabled = () => process.env.ONESA_IDENTITY_ENABLED === "true";
function identity() {
  if (!enabled())
    throw new AppError(404, "ONESA_DISABLED", "Onesa sign-in is unavailable.");
  const issuer = process.env.ONESA_ISSUER || "https://auth.onesa.eu/";
  const audience =
    process.env.ONESA_AUDIENCE || "https://api.diasporaunlocked.com";
  if (!/^https:\/\/[a-z0-9.-]+\/$/.test(issuer))
    throw new Error("Invalid configured Onesa issuer");
  const jwks = JSON.parse(
    process.env.ONESA_JWKS_JSON || "null",
  ) as JSONWebKeySet;
  if (
    !jwks?.keys?.length ||
    jwks.keys.some((k) => k.kty !== "RSA" || k.d || !k.kid)
  )
    throw new Error("Configure current and next public Onesa signing keys");
  return { issuer, audience, key: createLocalJWKSet(jwks) };
}
function registration(kind: ClientKind) {
  const web = kind === "web";
  const id = web
    ? process.env.ONESA_WEB_CLIENT_ID
    : process.env.ONESA_NATIVE_CLIENT_ID;
  const redirect = web
    ? process.env.ONESA_WEB_CALLBACK
    : "diasporaunlocked://auth/onesa/callback";
  if (
    !id ||
    !redirect ||
    (web &&
      (!/^https:\/\/[^/?#]+\/login$/.test(redirect) ||
        !process.env.ONESA_WEB_CLIENT_SECRET)) ||
    id ===
      (web
        ? process.env.ONESA_NATIVE_CLIENT_ID
        : process.env.ONESA_WEB_CLIENT_ID)
  )
    throw new Error(
      "Configure distinct Onesa web and native client registrations",
    );
  return { id, redirect };
}
export function clientSettings(kind: ClientKind) {
  if (!enabled()) return { enabled: false };
  const { issuer, audience } = identity();
  const { id, redirect } = registration(kind);
  return {
    enabled: true,
    authorize: issuer + "authorize",
    audience,
    clientId: id,
    redirectUri: redirect,
  };
}
export async function verifyOnesaAccess(token: string) {
  const { issuer, audience, key } = identity();
  const { payload } = await jwtVerify(token, key, {
    issuer,
    audience,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub"],
  });
  const id = z
    .string()
    .uuid()
    .parse(payload[claimsRoot + "user_id"])
    .toLowerCase();
  const products = grant.parse(payload[claimsRoot + "products"]);
  const roles = grant.parse(payload[claimsRoot + "roles"]);
  const now = Math.floor(Date.now() / 1000);
  if (
    !payload.sub ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.iat! > now ||
    payload.exp! <= payload.iat! ||
    payload.exp! - payload.iat! > 300 ||
    !products.includes(ONESA_PRODUCT) ||
    !roles.includes("user")
  )
    throw new Error("Invalid Onesa product grant");
  return { id, issuer, subject: payload.sub, expires: payload.exp! };
}
export async function exchangeCode(input: z.infer<typeof exchangeInput>) {
  const { issuer, key } = identity();
  const { id, redirect } = registration(input.client);
  const metadata = {
    issuer,
    authorization_endpoint: issuer + "authorize",
    token_endpoint: issuer + "oauth/token",
  };
  const config = new oidc.Configuration(
    metadata,
    id,
    undefined,
    input.client === "web"
      ? oidc.ClientSecretPost(process.env.ONESA_WEB_CLIENT_SECRET!)
      : oidc.None(),
  );
  config.timeout = 8;
  const callback = new URL(redirect);
  callback.search = new URLSearchParams({
    code: input.code,
    state: input.state,
  }).toString();
  const tokens = await oidc.authorizationCodeGrant(config, callback, {
    expectedState: input.state,
    expectedNonce: input.nonce,
    pkceCodeVerifier: input.verifier,
  });
  const access = await verifyOnesaAccess(tokens.access_token);
  const profile = await jwtVerify(tokens.id_token!, key, {
    issuer,
    audience: id,
    algorithms: ["RS256"],
    requiredClaims: ["sub", "iat", "exp", "nonce"],
  });
  if (
    profile.payload.sub !== access.subject ||
    profile.payload.nonce !== input.nonce
  )
    throw new Error("Mismatched Onesa identity");
  return tokens.access_token;
}
