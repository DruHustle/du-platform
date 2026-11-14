import {loadOnesa, openOnesa, type OnesaResult} from "../onesaSignIn";
import { AccountDeletion } from "../AccountDeletion";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { ApiError, request } from "../api";
import { useSession } from "../session";
import { Action, Card, Copy, Field, Heading, Loading, Message, Screen } from "../ui";

const message = (error: unknown) => error instanceof Error ? error.message : "Unable to complete your request. Please try again.";
type AccountRoute = { params?: { next?: string; entry?: "forgot" | "login" } };
export function AccountScreen({ route }: { route?: AccountRoute } = {}) {
  const session = useSession();
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const next = route?.params?.next;
  const entry = route?.params?.entry;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [onesa,setOnesa] = useState<Awaited<ReturnType<typeof loadOnesa>> | null>(null);
  const [linkToken,setLinkToken] = useState("");
  useEffect(()=>{void loadOnesa().then(setOnesa).catch(()=>{});},[]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!entry) return;
    setMode(entry === "forgot" ? "forgot" : "login");
    setFeedback("");
    setError("");
    setPassword("");
    navigation.setParams({ entry: undefined });
  }, [entry, navigation]);

  const finishSignIn = () => {
    if (!next) return;
    navigation.setParams({ next: undefined });
    if (next === "/travel/flights" || next === "/travel/stays" || next === "/travel/my-trips") {
      navigation.navigate("Travel", { section: next.slice("/travel/".length) });
    } else if (next === "/admin") {
      navigation.navigate("External", { path: "/admin", title: "Operations" });
    }
  };
  useEffect(() => { setProfileName(session.user?.fullName || ""); }, [session.user?.id, session.user?.fullName]);
  const run = async (action: () => Promise<void>) => { if (busy) return; setError(""); setFeedback(""); setBusy(true); try { await action(); } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  if (session.loading) return <Screen><Heading>Account</Heading><Loading label="Checking your account…" /></Screen>;
  if (session.error) return <Screen><Heading>Account</Heading><Message error message={session.error} /><Action title="Try again" onPress={() => void session.restore()} /><Action title="Sign out on this device" secondary disabled={busy} onPress={() => void run(() => session.signOut())} /></Screen>;
  if (session.user && mode !== "forgot") return <Screen><Heading>Your account</Heading><Card><Copy>Signed in as {session.user.email}</Copy><Field label="Full name" value={profileName} onChangeText={setProfileName} autoComplete="name" /><Action title={busy ? "Saving…" : "Save profile"} disabled={busy || !profileName.trim() || profileName.trim() === session.user.fullName} onPress={() => void run(async () => { await session.updateProfile(profileName.trim()); setFeedback("Profile updated."); })} />{feedback ? <Message message={feedback} /> : null}{error ? <Message error message={error} /> : null}</Card><Action title="Sign out" secondary disabled={busy} onPress={() => void run(() => session.signOut())} /><Action title="Email password reset instructions" secondary disabled={busy} onPress={() => void run(async () => {await request("/auth/forgot-password",{method:"POST",body:{email:session.user!.email,language:"en"}});setFeedback("If this address matches an account, reset instructions may be emailed to you.");})} /><Action title="Help and contact" secondary onPress={() => navigation.navigate("Contact")} /><AccountDeletion key={session.user.id} accountId={session.user.id} /></Screen>;
  return <Screen><Heading>{mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</Heading><Copy>Use the same Diaspora Unlocked account on your phone and the website.</Copy><Card>
    {mode === "login" && onesa?.enabled && !linkToken && <Action title="Sign in with Onesa" disabled={busy} onPress={()=>void run(async()=>{
      const result = await openOnesa(onesa);
      if (result.linkRequired) {setLinkToken(result.accessToken); return;}
      if (!result.user) throw new Error("Unable to load your account.");
      await session.acceptOnesa(result.user,result.accessToken); finishSignIn();
    })}/>}
    {mode === "login" && !!linkToken && <Copy>Confirm your existing Diaspora Unlocked email and password to link the accounts.</Copy>}
    {mode === "register" && <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />}
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    {mode !== "forgot" && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "register" ? "new-password" : "current-password"} />}
    {mode === "register" && <Copy>Use at least eight characters, including uppercase, lowercase, a number and a special character.</Copy>}
    {error ? <Message error message={error} /> : null}{feedback ? <Message message={feedback} /> : null}
    <Action title={busy ? "Please wait…" : mode === "forgot" ? "Send reset instructions" : mode === "register" ? "Create account" : linkToken ? "Link accounts and sign in" : "Sign in"} disabled={busy} onPress={() => void run(async () => {
      if (mode === "forgot") { await request("/auth/forgot-password", {method:"POST",body:{email:email.trim(),language:"en",next}}); setFeedback("If this address matches an account, reset instructions may be emailed to you."); }
      else if (mode === "register") {
        await session.register(name.trim(), email.trim(), password);
        setPassword("");
        setMode("login");
        finishSignIn();
      }
      else if (linkToken) {
        const result = await request<OnesaResult>("/auth/onesa/link",{method:"POST",body:{client:"native",accessToken:linkToken,email:email.trim(),password}});
        if (!result.user) throw new Error("Unable to load your account.");
        await session.acceptOnesa(result.user,result.accessToken);
        setLinkToken(""); setPassword(""); finishSignIn();
      } else { await session.signIn(email.trim(),password); setPassword(""); finishSignIn(); }
    })} />
  </Card><Action title={mode === "login" ? "Create an account" : "Back to sign in"} secondary onPress={() => {setMode(mode === "login" ? "register" : "login"); setError(""); setFeedback("");}} />{mode === "login" && <Action title="Forgot password?" secondary onPress={() => {setMode("forgot");setError("");setFeedback("");}} />}</Screen>;
}

type ResetRoute = { params?: { token?: string; next?: string } };
export function ResetPasswordScreen({ route }: { route: ResetRoute }) {
  const token = route.params?.token || "";
  return <ResetForm key={token} token={token} next={route.params?.next} />;
}

function ResetForm({ token, next }: { token: string; next?: string }) {
  const navigation = useNavigation<any>();
  const session = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");

  function goToAccount(entry: "forgot" | "login") {
    navigation.popTo("Main", { screen: "Account", params: { entry, next } });
  }

  async function submit() {
    if (busy || complete) return;
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await request("/auth/reset-password", { method: "POST", body: { token, password, confirmPassword: confirm } });
      setPassword("");
      setConfirm("");
      setComplete(true);
      // The API revokes sessions on reset. Refresh the account shown behind this screen.
      if (session.user) void session.restore();
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "AUTH_INVALID_RESET_TOKEN") {
        setExpired(true);
        setPassword("");
        setConfirm("");
      } else {
        setError(message(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  return <Screen>
    <Heading>Choose a new password</Heading>
    {!token || expired ? <Card>
      <Message error message={expired ? "This reset link has expired or has already been used." : "This link is missing its reset token. Request a new link on the account screen."}/>
      <Action title="Request a new reset link" onPress={() => goToAccount("forgot")} />
    </Card> : complete ? <Card>
      <Message message="Password changed. You can sign in with your new password."/>
      <Action title="Continue to sign in" onPress={() => goToAccount("login")} />
    </Card> : <Card>
      <Copy>Reset links can only be used once. Use at least eight characters, including uppercase, lowercase, a number and a special character.</Copy>
      <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
      {!!error && <Message error message={error} />}
      <Action title={busy ? "Saving…" : "Reset password"} disabled={busy || !password || !confirm} onPress={() => void submit()} />
    </Card>}
  </Screen>;
}
