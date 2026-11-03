import { ApiError } from "./api";

export class SessionChangedError extends ApiError {
  constructor() { super("Your account changed. Please try again.", 409, "SESSION_CHANGED"); }
}

/** Serial storage prevents an older asynchronous clear/write from finishing after a new login. */
export function sessionLifecycle() {
  let generation = 0;
  let changing = false;
  let storageTail: Promise<unknown> = Promise.resolve();
  const current = (version: number) => version === generation;
  const assert = (version: number) => { if (!current(version)) throw new SessionChangedError(); };
  const serialize = <T,>(operation: () => Promise<T>) => {
    const work = storageTail.then(operation);
    storageTail = work.then(() => undefined, () => undefined);
    return work;
  };
  return {
    capture: () => generation,
    current,
    assert,
    changing: () => changing,
    begin() { changing = true; return ++generation; },
    finish(version: number) { if (current(version)) changing = false; },
    // Once logout has been requested, its already-queued cleanup must run even
    // if a later login attempt fails. Queue ordering puts it before any newer
    // accepted credential write, so it cannot erase that newer credential.
    clearStorage<T>(operation: () => Promise<T>): Promise<T> { return serialize(operation); },
    storage<T>(version: number, operation: () => Promise<T>): Promise<T> {
      return serialize(async () => {
        assert(version);
        const result = await operation();
        assert(version);
        return result;
      });
    },
  };
}

export type SessionLifecycle = ReturnType<typeof sessionLifecycle>;

export async function authorizedSessionRequest<T>(
  lifecycle: SessionLifecycle,
  token: () => string,
  refresh: () => Promise<void>,
  send: (credential: string) => Promise<T>,
): Promise<T> {
  const version = lifecycle.capture();
  if (lifecycle.changing()) throw new SessionChangedError();
  const initial = token();
  if (!initial) throw new ApiError("Please sign in again.", 401, "AUTH_REQUIRED");
  try {
    const result = await send(initial);
    lifecycle.assert(version);
    return result;
  } catch (error) {
    lifecycle.assert(version);
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    try { await refresh(); } finally { lifecycle.assert(version); }
    const renewed = token();
    if (!renewed || renewed === initial) throw error;
    const result = await send(renewed);
    lifecycle.assert(version);
    return result;
  }
}
