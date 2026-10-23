import { safeSessionStorage } from "@/lib/browserStorage";

type Attempt = {
  fingerprint: string;
  requestId: string;
  version: number;
  action: string;
};
const attempts = new Map<string, Attempt>();
const key = (scope: string) => `du_order_command_v1:${scope}`;

// Persist only a digest and non-secret command metadata, never payment references,
// notes, customer details, grants or raw command payloads.
export function pendingOrderCommand(scope: string): Attempt | null {
  try {
    const value = JSON.parse(safeSessionStorage.getItem(key(scope)) || "null");
    if (
      value &&
      /^[a-f0-9]{64}$/.test(value.fingerprint) &&
      /^[a-f0-9-]{36}$/.test(value.requestId) &&
      Number.isSafeInteger(value.version) &&
      value.version >= 0 &&
      typeof value.action === "string"
    )
      attempts.set(scope, value);
  } catch {
    /* Optional tab storage. */
  }
  return attempts.get(scope) || null;
}
export async function prepareOrderCommand<
  T extends { version: number; action: string },
>(scope: string, payload: T) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const fingerprint = Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2, "0")
  ).join("");
  let attempt = pendingOrderCommand(scope);
  if (!attempt || attempt.fingerprint !== fingerprint) {
    attempt = {
      fingerprint,
      requestId: crypto.randomUUID(),
      version: payload.version,
      action: payload.action,
    };
    attempts.set(scope, attempt);
    safeSessionStorage.setItem(key(scope), JSON.stringify(attempt));
  }
  return { ...payload, requestId: attempt.requestId };
}
export function clearOrderCommand(scope: string, requestId: string) {
  if (pendingOrderCommand(scope)?.requestId !== requestId) return;
  attempts.delete(scope);
  safeSessionStorage.removeItem(key(scope));
}
export function reconcileOrderCommand(
  scope: string,
  workspace: any
): "applied" | "changed" | "unresolved" | null {
  const attempt = pendingOrderCommand(scope);
  if (!attempt) return null;
  const applied = workspace.history?.some(
    (event: any) =>
      (event.request_id === attempt.requestId ||
        event.command_id === attempt.requestId) &&
      event.action === attempt.action
  );
  const changed =
    Number(workspace.state?.version ?? workspace.version) > attempt.version;
  if (applied || changed) clearOrderCommand(scope, attempt.requestId);
  return applied ? "applied" : changed ? "changed" : "unresolved";
}
