import { AccountDeletion } from "../AccountDeletion";
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { request } from "../api";
import { useSession } from "../session";
import { Action, Card, Copy, Field, Heading, Loading, Message, Screen } from "../ui";

const message = (error: unknown) => error instanceof Error ? error.message : "Unable to complete your request. Please try again.";
export function AccountScreen() {
  const session = useSession();
  const navigation = useNavigation<any>();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setProfileName(session.user?.fullName || ""); }, [session.user?.id, session.user?.fullName]);
  const run = async (action: () => Promise<void>) => { if (busy) return; setError(""); setFeedback(""); setBusy(true); try { await action(); } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  if (session.loading) return <Screen><Heading>Account</Heading><Loading label="Checking your account…" /></Screen>;
  if (session.error) return <Screen><Heading>Account</Heading><Message error message={session.error} /><Action title="Try again" onPress={() => void session.restore()} /><Action title="Sign out on this device" secondary disabled={busy} onPress={() => void run(() => session.signOut())} /></Screen>;
  if (session.user) return <Screen><Heading>Your account</Heading><Card><Copy>Signed in as {session.user.email}</Copy><Field label="Full name" value={profileName} onChangeText={setProfileName} autoComplete="name" /><Action title={busy ? "Saving…" : "Save profile"} disabled={busy || !profileName.trim() || profileName.trim() === session.user.fullName} onPress={() => void run(async () => { await session.updateProfile(profileName.trim()); setFeedback("Profile updated."); })} />{feedback ? <Message message={feedback} /> : null}{error ? <Message error message={error} /> : null}</Card><Action title="Sign out" secondary disabled={busy} onPress={() => void run(() => session.signOut())} /><Action title="Email password reset instructions" secondary disabled={busy} onPress={() => void run(async () => {await request("/auth/forgot-password",{method:"POST",body:{email:session.user!.email,language:"en"}});setFeedback("If this address matches an account, reset instructions may be emailed to you.");})} /><Action title="Help and contact" secondary onPress={() => navigation.navigate("Contact")} /><AccountDeletion key={session.user.id} accountId={session.user.id} /></Screen>;
  return <Screen><Heading>{mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back"}</Heading><Copy>Use the same Diaspora Unlocked account on your phone and the website.</Copy><Card>
    {mode === "register" && <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" />}
    <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    {mode !== "forgot" && <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "register" ? "new-password" : "current-password"} />}
    {mode === "register" && <Copy>Use at least eight characters, including uppercase, lowercase, a number and a special character.</Copy>}
    {error ? <Message error message={error} /> : null}{feedback ? <Message message={feedback} /> : null}
    <Action title={busy ? "Please wait…" : mode === "forgot" ? "Send reset instructions" : mode === "register" ? "Create account" : "Sign in"} disabled={busy} onPress={() => void run(async () => {
      if (mode === "forgot") { await request("/auth/forgot-password", {method:"POST",body:{email:email.trim(),language:"en"}}); setFeedback("If this address matches an account, reset instructions may be emailed to you."); }
      else if (mode === "register") { await session.register(name.trim(),email.trim(),password); setPassword(""); }
      else { await session.signIn(email.trim(),password); setPassword(""); }
    })} />
  </Card><Action title={mode === "login" ? "Create an account" : "Back to sign in"} secondary onPress={() => {setMode(mode === "login" ? "register" : "login"); setError(""); setFeedback("");}} />{mode === "login" && <Action title="Forgot password?" secondary onPress={() => {setMode("forgot");setError("");setFeedback("");}} />}</Screen>;
}

export function ResetPasswordScreen({route}: {route: {params?: {token?: string}}}) {
  const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [busy,setBusy]=useState(false); const [feedback,setFeedback]=useState(""); const [error,setError]=useState("");
  const token=route.params?.token || "";
  return <Screen><Heading>Choose a new password</Heading><Copy>Use the link from your reset email. Reset links can only be used once.</Copy>{!token ? <Message error message="This link is missing its reset token. Request a new link on the account screen." /> : <Card><Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" /><Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />{error ? <Message error message={error} /> : null}{feedback ? <Message message={feedback} /> : null}<Action title={busy ? "Saving…" : "Reset password"} disabled={busy || Boolean(feedback)} onPress={() => {if(busy)return;setError("");if(password!==confirm){setError("Passwords do not match.");return;}setBusy(true);void request("/auth/reset-password",{method:"POST",body:{token,password,confirmPassword:confirm}}).then(()=>{setPassword("");setConfirm("");setFeedback("Password changed. You can sign in with your new password.");}).catch(e=>setError(message(e))).finally(()=>setBusy(false));}} /></Card>}</Screen>;
}
