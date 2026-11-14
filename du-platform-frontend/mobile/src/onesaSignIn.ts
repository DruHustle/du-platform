import { request, type User } from "./api";

type Settings = {
  enabled: boolean;
  authorize: string;
  clientId: string;
  redirectUri: string;
  audience: string;
};
export type OnesaResult = {
  user?: User;
  accessToken: string;
  linkRequired: boolean;
};
export const loadOnesa = () => request<Settings>("/auth/onesa/config/native");
export async function openOnesa(config: Settings): Promise<OnesaResult> {
  const [Crypto, Browser] = await Promise.all([
    import("expo-crypto"),
    import("expo-web-browser"),
  ]);
  const random = () =>
    Crypto.randomUUID().replace(/-/g, "") +
    Crypto.randomUUID().replace(/-/g, "");
  const state = random(),
    nonce = random(),
    verifier = random();
  const challenge = (
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      verifier,
      { encoding: Crypto.CryptoEncoding.BASE64 },
    )
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({
    response_type: "code",
    scope: "openid",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    audience: config.audience,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  const result = await Browser.openAuthSessionAsync(
    url.toString(),
    config.redirectUri,
  );
  if (result.type !== "success")
    throw new Error("Onesa sign-in was interrupted.");
  const returned = new URL(result.url);
  const params = new URLSearchParams(returned.search);
  returned.search = "";
  if (
    returned.href !== config.redirectUri ||
    params.get("state") !== state ||
    !params.get("code") ||
    params.has("error")
  )
    throw new Error("Unable to confirm the Onesa sign-in. Try again.");
  return request<OnesaResult>("/auth/onesa/exchange", {
    method: "POST",
    body: {
      client: "native",
      code: params.get("code"),
      state,
      nonce,
      verifier,
    },
  });
}
