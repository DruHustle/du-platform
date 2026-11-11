import { deleteSecurePayload } from "./securePayload";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ApiError, request, type AuthResult, type User } from "./api";
import { signOutOnDevice } from "./signOut";
import { authorizedSessionRequest, sessionLifecycle, SessionChangedError } from "./sessionLifecycle";

const SESSION_KEY = "du.native.session.v1";
const ORDER_KEY = "du.native.order.v1";
const PENDING_ORDER_KEY = "du.native.order.pending.v1";
const PENDING_CONTACT_KEY = "du.native.contact.pending.v1";
const PENDING_ORDER_COMMAND_KEY = "du.native.order.command.v1";
const accountKeys = [SESSION_KEY, ORDER_KEY, PENDING_ORDER_KEY, PENDING_CONTACT_KEY, PENDING_ORDER_COMMAND_KEY];
const deleteAccountStorage = async () => { for (const key of accountKeys) await deleteSecurePayload(key); };
type AuthorizedOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal };
type Session = {
  user: User | null; accessToken: string; loading: boolean; error: string; epoch: number;
  capture(): number; isCurrent(epoch: number): boolean;
  storage<T>(epoch: number, operation: () => Promise<T>): Promise<T>;
  signIn(email: string, password: string): Promise<void>;
  register(fullName: string, email: string, password: string): Promise<void>;
  updateProfile(fullName: string): Promise<void>;
  authorized<T>(path: string, options?: AuthorizedOptions): Promise<T>;
  signOut(): Promise<void>; restore(): Promise<void>;
};
const Context = createContext<Session | null>(null);
export const useSession = () => { const value = useContext(Context); if (!value) throw new Error("Session provider missing"); return value; };

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [lifecycle] = useState(sessionLifecycle);
  const [epoch, setEpoch] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const tokenRef = useRef("");
  const setToken = useCallback((value: string) => { tokenRef.current = value; setAccessToken(value); }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const running = useRef<{ version: number; promise: Promise<void> } | null>(null);
  const begin = useCallback(() => { const version = lifecycle.begin(); setEpoch(version); return version; }, [lifecycle]);
  const clearRejectedSession = useCallback(async (expected: number) => {
    if (!lifecycle.current(expected)) return;
    const version = begin();
    setUser(null); setToken(""); setLoading(false);
    try {
      await lifecycle.clearStorage(deleteAccountStorage);
      if (lifecycle.current(version)) { lifecycle.finish(version); setError(""); }
    } catch {
      if (lifecycle.current(version)) setError("Could not remove account data from this device. Try signing out again.");
      // Keep restoration paused after a storage failure; a stale credential
      // must not silently sign the account back in on the next foreground event.
    }
  }, [begin, lifecycle, setToken]);
  const restore = useCallback(async () => {
    if (lifecycle.changing()) return;
    const version = lifecycle.capture();
    if (running.current?.version === version) return running.current.promise;
    const task = (async () => {
      setEpoch(version); setLoading(true); setError("");
      try {
        const token = await lifecycle.storage(version, () => SecureStore.getItemAsync(SESSION_KEY));
        if (!token) { if (lifecycle.current(version)) { setUser(null); setToken(""); } return; }
        const refreshed = await request<{ accessToken: string }>("/auth/token/refresh", { method: "POST", body: {}, token });
        lifecycle.assert(version);
        const account = await request<{ user: User }>("/auth/me", { token: refreshed.accessToken });
        lifecycle.assert(version);
        setToken(refreshed.accessToken); setUser(account.user);
      } catch (e) {
        if (!lifecycle.current(version)) return;
        if (e instanceof ApiError && e.status === 401) await clearRejectedSession(version);
        else setError("Account unavailable. Check your connection and try again.");
      } finally { if (lifecycle.current(version)) setLoading(false); }
    })();
    const entry = { version, promise: task };
    running.current = entry;
    try { await task; } finally { if (running.current === entry) running.current = null; }
  }, [clearRejectedSession, lifecycle, setToken]);
  useEffect(() => {
    void restore();
    const sub = AppState.addEventListener("change", state => { if (state === "active") void restore(); });
    return () => { const version = lifecycle.begin(); lifecycle.finish(version); sub.remove(); };
  }, [lifecycle, restore]);

  const authenticate = async (path: string, body: unknown) => {
    const hadAccount = Boolean(tokenRef.current);
    let version = begin();
    let persisting = true;
    setUser(null); setToken(""); setLoading(true); setError("");
    try {
      // Queue this immediately, before the network wait. Even if the new login
      // fails, an older in-progress acceptance cannot leave its credential on
      // disk and unexpectedly restore that account later. Guest drafts survive
      // a failed login; an existing account's private data is removed.
      await lifecycle.clearStorage(hadAccount ? deleteAccountStorage : () => deleteSecurePayload(SESSION_KEY));
      lifecycle.assert(version);
      persisting = false;
      const result = await request<AuthResult>(path, { method: "POST", body });
      lifecycle.assert(version);
      // Invalidate work begun while sign-in was pending as well as work from
      // the previous account. Only this accepted identity may now persist data.
      version = begin(); persisting = true;
      await lifecycle.storage(version, async () => {
        await deleteAccountStorage();
        await SecureStore.setItemAsync(SESSION_KEY, result.sessionToken);
      });
      lifecycle.assert(version);
      setToken(result.accessToken); setUser(result.user); setLoading(false); setError("");
      lifecycle.finish(version);
    } catch (e) {
      if (lifecycle.current(version)) {
        setLoading(false);
        if (persisting) {
          setUser(null); setToken("");
          setError("Account data could not be updated securely on this device. Try signing out, then sign in again.");
        } else lifecycle.finish(version);
      }
      throw e;
    }
  };
  const signIn = (email: string, password: string) => authenticate("/auth/native/login", { email, password });
  const register = (fullName: string, email: string, password: string) => authenticate("/auth/native/register", { fullName, email, password, confirmPassword: password });
  const authorized = <T,>(path: string, options: AuthorizedOptions = {}): Promise<T> =>
    authorizedSessionRequest(lifecycle, () => tokenRef.current, restore, token => request<T>(path, { ...options, token }));
  const updateProfile = async (fullName: string) => {
    const version = lifecycle.capture();
    const result = await authorized<{ user: User }>("/auth/profile", { method: "PUT", body: { fullName } });
    if (lifecycle.current(version)) setUser(result.user);
  };
  const signOut = async () => {
    const version = begin();
    let token: string | null = null;
    let localCleared = false;
    setUser(null); setToken(""); setLoading(false); setError("");
    try {
      await signOutOnDevice(
        async () => { if (token) await request("/auth/logout", { method: "POST", body: {}, token }); },
        async () => {
          token = await lifecycle.clearStorage(async () => {
            const previous = await SecureStore.getItemAsync(SESSION_KEY);
            await deleteAccountStorage();
            return previous;
          });
          localCleared = true;
          if (lifecycle.current(version)) lifecycle.finish(version);
        },
      );
    } catch (e) {
      if (!lifecycle.current(version)) return;
      if (!localCleared) setError("Could not remove account data from this device. Try signing out again.");
      throw e;
    }
  };
  const storage = <T,>(version: number, operation: () => Promise<T>) => lifecycle.storage(version, () => {
    if (lifecycle.changing()) throw new SessionChangedError();
    return operation();
  });
  return <Context.Provider value={{ user, accessToken, loading, error, epoch, capture: lifecycle.capture, isCurrent: lifecycle.current, storage, signIn, register, updateProfile, authorized, signOut, restore }}>{children}</Context.Provider>;
}
export { ORDER_KEY, PENDING_ORDER_KEY, PENDING_CONTACT_KEY, PENDING_ORDER_COMMAND_KEY };
