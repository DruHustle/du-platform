import { api, type AuthUser } from "@/lib/api";
import { safeRedirectPath } from "@/lib/safeRedirect";
export interface OnesaSettings {
  enabled: boolean;
  authorize: string;
  clientId: string;
  audience: string;
  redirectUri: string;
}
interface Transaction {
  state: string;
  nonce: string;
  verifier: string;
  next: string;
  created: number;
}
export interface OnesaResult {
  user?: AuthUser;
  linkRequired: boolean;
  accessToken: string;
}
const key = "du.onesa.transaction";
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...Array.from(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
const random = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
export async function startOnesa(config: OnesaSettings, next: string) {
  if (config.redirectUri !== location.origin + "/login")
    throw new Error("Onesa is not configured for this origin.");
  const tx: Transaction = {
    state: random(),
    nonce: random(),
    verifier: random(),
    next: safeRedirectPath(next),
    created: Date.now(),
  };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(tx.verifier),
  );
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({
    response_type: "code",
    scope: "openid",
    client_id: config.clientId,
    audience: config.audience,
    redirect_uri: config.redirectUri,
    state: tx.state,
    nonce: tx.nonce,
    code_challenge: base64url(new Uint8Array(digest)),
    code_challenge_method: "S256",
  }).toString();
  sessionStorage.setItem(key, JSON.stringify(tx));
  location.assign(url.toString());
}
export function consumeOnesa() {
  const params = new URLSearchParams(location.search);
  if (!params.has("code") && !params.has("error")) return;
  const raw = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);
  const tx: Transaction = raw ? JSON.parse(raw) : null;
  const next = safeRedirectPath(tx?.next);
  window.history.replaceState(
    null,
    "",
    "/login?next=" + encodeURIComponent(next),
  );
  if (
    !tx ||
    Date.now() - tx.created > 600000 ||
    params.get("state") !== tx.state ||
    !params.get("code") ||
    params.has("error")
  )
    throw new Error("Onesa sign-in was interrupted. Try again.");
  return {
    next,
    promise: api
      .post<OnesaResult>("/auth/onesa/exchange", {
        client: "web",
        code: params.get("code"),
        verifier: tx.verifier,
        nonce: tx.nonce,
        state: tx.state,
      })
      .then((r) => r.data),
  };
}
