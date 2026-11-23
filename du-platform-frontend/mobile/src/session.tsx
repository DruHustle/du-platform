import { deleteSecurePayload, readSecurePayload, saveSecurePayload } from "./securePayload";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ApiError, request, type AuthResult, type User } from "./api";
import { signOutOnDevice } from "./signOut";

const SESSION_KEY = "du.native.session.v1";
const ORDER_KEY = "du.native.order.v1";
const PENDING_ORDER_KEY = "du.native.order.pending.v1";
const PENDING_CONTACT_KEY = "du.native.contact.pending.v1";
const PENDING_ORDER_COMMAND_KEY = "du.native.order.command.v1";
type AuthorizedOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; signal?: AbortSignal };
type Session = { acceptOnesa(user:User,token:string):Promise<void>; user: User | null; accessToken: string; loading: boolean; error: string; signIn(email: string, password: string): Promise<void>; register(fullName: string, email: string, password: string): Promise<void>; updateProfile(fullName: string): Promise<void>; authorized<T>(path: string, options?: AuthorizedOptions): Promise<T>; signOut(): Promise<void>; restore(): Promise<void> };
const Context = createContext<Session | null>(null);
export const useSession = () => { const value = useContext(Context); if (!value) throw new Error("Session provider missing"); return value; };

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const tokenRef = useRef("");
  const setToken = (value: string) => { tokenRef.current = value; setAccessToken(value); };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const running = useRef<Promise<void> | null>(null);
  const clear = useCallback(async () => {
    generation.current++;
    setUser(null); setToken(""); setLoading(false);
    await Promise.all([SESSION_KEY, ORDER_KEY, PENDING_ORDER_KEY, PENDING_CONTACT_KEY, PENDING_ORDER_COMMAND_KEY].map(key => deleteSecurePayload(key)));
  }, []);
  const restore = useCallback(async () => {
    if (running.current) return running.current;
    const version = generation.current;
    const task = (async () => {
      setLoading(true); setError("");
      try {
        const token = await readSecurePayload(SESSION_KEY);
        if (!token) { if (version === generation.current) { setUser(null); setToken(""); } return; }
        const refreshed = token.includes(".") ? {accessToken:token} : await request<{accessToken: string}>("/auth/token/refresh", { method: "POST", body: {}, token });
        const account = await request<{user: User}>("/auth/me", { token: refreshed.accessToken });
        if (version === generation.current) { setToken(refreshed.accessToken); setUser(account.user); }
      } catch (e) {
        if (version !== generation.current) return;
        if (e instanceof ApiError && e.status === 401) await clear();
        else setError("Account unavailable. Check your connection and try again.");
      } finally { if (version === generation.current) setLoading(false); }
    })();
    running.current = task;
    try { await task; } finally { if (running.current === task) running.current = null; }
  }, [clear]);
  useEffect(() => {
    void restore();
    const sub = AppState.addEventListener("change", state => { if (state === "active") void restore(); });
    return () => { generation.current++; sub.remove(); };
  }, [restore]);
  const accept = async (result: AuthResult) => {
    generation.current++;
    await Promise.all([ORDER_KEY, PENDING_ORDER_KEY, PENDING_CONTACT_KEY, PENDING_ORDER_COMMAND_KEY].map(key => deleteSecurePayload(key)));
    await SecureStore.setItemAsync(SESSION_KEY, result.sessionToken);
    setToken(result.accessToken); setUser(result.user); setLoading(false); setError("");
  };
  const acceptOnesa = async (account:User, token:string) => {
    generation.current++;
    await Promise.all([ORDER_KEY, PENDING_ORDER_KEY, PENDING_CONTACT_KEY, PENDING_ORDER_COMMAND_KEY].map(key => deleteSecurePayload(key)));
    await deleteSecurePayload(SESSION_KEY);
    await saveSecurePayload(SESSION_KEY,token);
    setToken(token); setUser(account); setLoading(false); setError("");
  };
  const signIn = async (email: string, password: string) => accept(await request<AuthResult>("/auth/native/login", { method: "POST", body: {email, password} }));
  const register = async (fullName: string, email: string, password: string) => accept(await request<AuthResult>("/auth/native/register", { method: "POST", body: {fullName, email, password, confirmPassword: password} }));
  const authorized = async <T,>(path: string, options: AuthorizedOptions = {}): Promise<T> => {
    const initial = tokenRef.current;
    if (!initial) throw new ApiError("Please sign in again.", 401, "AUTH_REQUIRED");
    try { return await request<T>(path, {...options, token: initial}); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      await restore();
      if (!tokenRef.current || tokenRef.current === initial) throw error;
      return request<T>(path, {...options, token: tokenRef.current});
    }
  };
  const updateProfile = async (fullName: string) => {
    const version = generation.current;
    const result = await authorized<{user: User}>("/auth/profile", {method: "PUT", body: {fullName}});
    if (version === generation.current) setUser(result.user);
  };
  const signOut = async () => {
    const token = await readSecurePayload(SESSION_KEY);
    await signOutOnDevice(
      async () => { if (token && !token.includes(".")) await request("/auth/logout", { method: "POST", body: {}, token }); },
      async () => { await clear(); setLoading(false); setError(""); }
    );
  };
  return <Context.Provider value={{acceptOnesa,user, accessToken, loading, error, signIn, register, updateProfile, authorized, signOut, restore}}>{children}</Context.Provider>;
}
export { ORDER_KEY, PENDING_ORDER_KEY, PENDING_CONTACT_KEY, PENDING_ORDER_COMMAND_KEY };
