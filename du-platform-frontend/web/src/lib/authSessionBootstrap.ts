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
      .catch(error => {
        if (Number(error?.response?.status) === 401) return null;
        throw error;
      })
      .finally(() => {
        if (currentUserInFlight === request) currentUserInFlight = null;
      });
  currentUserInFlight = request;

  let user: AuthUser | null;
  try {
    user = await request;
  } catch (error) {
    // A request started before a logout or account switch must not affect the
    // new session, even when the old request fails.
    if (generation !== cacheGeneration) return currentUserCache?.user ?? null;
    throw error;
  }
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
