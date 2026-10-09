import { api, markHasLoggedInBefore, type AuthUser } from "@/lib/api";

const CURRENT_USER_CACHE_TTL_MS = 60_000;

let currentUserCache: { checkedAt: number; user: AuthUser | null } | null = null;
let currentUserInFlight: Promise<AuthUser | null> | null = null;

export async function resolveCurrentUserBootstrap(options?: { force?: boolean }) {
  const force = options?.force === true;
  if (!force && currentUserCache && Date.now() - currentUserCache.checkedAt < CURRENT_USER_CACHE_TTL_MS) {
    return currentUserCache.user;
  }

  currentUserInFlight ??= api
    .get("/auth/me")
    .then((response) => {
      const user = (response.data?.user ?? null) as AuthUser | null;
      if (user) {
        markHasLoggedInBefore();
      }
      return user;
    })
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
