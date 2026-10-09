import { api, markHasLoggedInBefore, type AuthUser } from "@/lib/api";

const CURRENT_USER_CACHE_TTL_MS = 60_000;

let currentUserCache: { checkedAt: number; user: AuthUser | null } | null =
  null;
let currentUserInFlight: Promise<AuthUser | null> | null = null;
let cacheGeneration = 0;

export async function resolveCurrentUserBootstrap(options?: {
  force?: boolean;
}) {
  const force = options?.force === true;
  if (
    !force &&
    currentUserCache &&
    Date.now() - currentUserCache.checkedAt < CURRENT_USER_CACHE_TTL_MS
  ) {
    return currentUserCache.user;
  }

  const generation = cacheGeneration;
  const request =
    currentUserInFlight ??
    api
      .get("/auth/me")
      .then(response => {
        const user = (response.data?.user ?? null) as AuthUser | null;
        if (user && generation === cacheGeneration) {
          markHasLoggedInBefore();
        }
        return user;
      })
      .catch(() => null)
      .finally(() => {
        if (currentUserInFlight === request) currentUserInFlight = null;
      });
  currentUserInFlight = request;

  const user = await request;
  if (generation !== cacheGeneration) return currentUserCache?.user ?? null;
  currentUserCache = { checkedAt: Date.now(), user };
  return user;
}

export function primeCurrentUserBootstrap(user: AuthUser | null) {
  cacheGeneration += 1;
  currentUserInFlight = null;
  currentUserCache = { checkedAt: Date.now(), user };
}

export function clearCurrentUserBootstrap() {
  cacheGeneration += 1;
  currentUserCache = null;
  currentUserInFlight = null;
}
