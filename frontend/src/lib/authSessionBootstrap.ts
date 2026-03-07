import { api, hasLoggedInBefore, type AuthUser } from "@/lib/api";

const CURRENT_USER_CACHE_TTL_MS = 60_000;

let currentUserCache: { checkedAt: number; user: AuthUser | null } | null = null;
let currentUserInFlight: Promise<AuthUser | null> | null = null;

export async function resolveCurrentUserBootstrap(options?: { force?: boolean }) {
  if (!hasLoggedInBefore()) {
    currentUserCache = { checkedAt: Date.now(), user: null };
    return null;
  }

  const force = options?.force === true;
  if (!force && currentUserCache && Date.now() - currentUserCache.checkedAt < CURRENT_USER_CACHE_TTL_MS) {
    return currentUserCache.user;
  }

  currentUserInFlight ??= api
    .get("/auth/me")
    .then((response) => (response.data?.user ?? null) as AuthUser | null)
    .catch(() => null)
    .finally(() => {
      currentUserInFlight = null;
    });

  const user = await currentUserInFlight;
  currentUserCache = { checkedAt: Date.now(), user };
  return user;
}

export function primeCurrentUserBootstrap(user: AuthUser | null) {
  currentUserCache = { checkedAt: Date.now(), user };
}

export function clearCurrentUserBootstrap() {
  currentUserCache = null;
  currentUserInFlight = null;
}
