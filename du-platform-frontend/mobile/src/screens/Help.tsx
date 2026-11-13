import React, { useEffect, useRef, useState } from "react";
import { Linking, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useNavigation } from "@react-navigation/native";
import * as Crypto from "expo-crypto";
import { ApiError, request, requestOnesaReply, type ChatMessage } from "../api";
import { onesaProductLinks } from "../onesaProductLinks";
import { shopDestination, isSitePath } from "../shopDiscovery";
import { readSearchResponse, type SearchResponse } from "../searchResults";
import { readContactAttempt, sendContactAttempt, type ContactAttempt } from "../contact";
import { PENDING_CONTACT_KEY } from "../session";
import { saveSecurePayload, readSecurePayload, deleteSecurePayload } from "../securePayload";
import { Action, Card, Copy, Field, Heading, Message, Screen, styles } from "../ui";

const errorMessage=(e:unknown)=>e instanceof Error?e.message:"The service is temporarily unavailable.";
function AssistantReply({ content }: { content: string }) {
  const navigation = useNavigation<any>();
  const parts = onesaProductLinks(content);
  const links = parts.filter(part => part.destination);
  if (!links.length) return <Copy>{content}</Copy>;
  function open(part: (typeof parts)[number]) {
    const target = part.destination;
    if (target?.screen === "Shop") navigation.navigate("Main", { screen: "Shop", params: target.params });
    else if (target) navigation.navigate(target.screen, target.params);
  }
  return <Text style={styles.copy}
    accessibilityActions={links.map((part, index) => ({ name: String(index), label: part.text }))}
    onAccessibilityAction={({ nativeEvent }) => {
      const link = links.find((_, index) => String(index) === nativeEvent.actionName);
      if (link) open(link);
    }}>
    {parts.map((part, index) => part.destination
      ? <Text key={index} accessibilityRole="link" onPress={() => open(part)}
          style={{ textDecorationLine: "underline", fontWeight: "600" }}>{part.text}</Text>
      : part.text)}
  </Text>;
}

export function AssistantScreen() {
  const navigation = useNavigation<any>();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sharing, setSharing] = useState<"review" | "allowed" | "declined">("review");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const draftVersion = useRef(0);
  useEffect(() => () => active.current?.abort(), []);

  function stopSharing() {
    active.current?.abort();
    active.current = null;
    setBusy(false);
    setError("");
    setSharing("declined");
  }

  async function send() {
    if (sharing !== "allowed" || active.current || !text.trim()) return;
    const controller = new AbortController();
    active.current = controller;
    const submittedVersion = draftVersion.current;
    const conversation = [...messages, { role: "user" as const, content: text.trim() }];
    setBusy(true);
    setError("");
    try {
      const reply = await requestOnesaReply(conversation, controller.signal);
      if (controller.signal.aborted) return;
      setMessages([...conversation, { role: "assistant", content: reply }]);
      if (draftVersion.current === submittedVersion) setText("");
    } catch (failure) {
      if (!controller.signal.aborted) setError(errorMessage(failure));
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  return <Screen>
    <Heading>Onesa assistant</Heading>
    <Copy>Ask about Diaspora Unlocked, products, travel and business information. Onesa cannot book travel or accept payments.</Copy>
    <Card>
      <Heading>Sharing this chat</Heading>
      <Copy>When you send a message, Diaspora Unlocked shares it and recent messages in this chat with Google Gemini to generate a reply. Groq, Anthropic or Cerebras may process the same messages if a fallback provider is used.</Copy>
      {sharing === "review" ? <>
        <Action title="Allow sharing for this chat" onPress={() => setSharing("allowed")} />
        <Action title="Keep my draft private" secondary onPress={stopSharing} />
      </> : sharing === "allowed" ? <Action title="Revoke chat sharing" secondary onPress={stopSharing} /> : <>
        <Copy>Sharing is off. Your draft stays here.</Copy>
        <Action title="Review chat sharing" secondary onPress={() => setSharing("review")} />
      </>}
    </Card>
    {messages.map((message, index) => <Card key={index}>
      <Copy>{message.role === "user" ? "You" : "Onesa"}</Copy>
      {message.role === "assistant" ? <>
        <AssistantReply content={message.content} />
        <Action title="Report this reply" secondary onPress={() => navigation.navigate("Contact", { reportReply: message.content.slice(0, 4000) })} />
      </> : <Copy>{message.content}</Copy>}
    </Card>)}
    <Card>
      <Field label="Your message" value={text} multiline maxLength={4000} onChangeText={value => {
        draftVersion.current++;
        setText(value);
      }} />
      {!!error && <Message error message={error}/>}
      <Action title={busy ? "Sending…" : "Send message"} disabled={sharing !== "allowed" || busy || !text.trim()} onPress={() => void send()}/>
    </Card>
    <Action title="Contact the team" secondary onPress={() => navigation.navigate("Contact")}/>
  </Screen>;
}
export function ContactScreen({ route }: { route: { params?: { reportReply?: string } } }) {
  const selectedReply = route?.params?.reportReply;
  const [includedReply, setIncludedReply] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [receipt, setReceipt] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<ContactAttempt | null>(null);
  const sending = useRef(false);
  useEffect(() => {
    let active = true;
    setError("");
    void readSecurePayload(PENDING_CONTACT_KEY).then(raw => {
      if (!active) return;
      if (raw) {
        const saved = readContactAttempt(raw);
        setPending(saved);
        setName(saved.name); setEmail(saved.email); setSubject(saved.subject); setMessage(saved.message);
        setError("A previous message was not confirmed. Retry the same message.");
      }
      setRestored(true);
    }).catch(() => {
      if (active) setError("Could not read your saved message on this device.");
    });
    return () => { active = false; };
  }, [restoreAttempt]);

  async function send() {
    if (sending.current || !restored) return;
    sending.current = true;
    setBusy(true); setReceipt(""); setError("");
    try {
      const body = pending || {
        name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(),
        requestId: Crypto.randomUUID(), language: "en", module: "general",
      };
      if (!pending) {
        await saveSecurePayload(PENDING_CONTACT_KEY, JSON.stringify(body));
        setPending(body);
      }
      const confirmed = await sendContactAttempt(body);
      await deleteSecurePayload(PENDING_CONTACT_KEY);
      setPending(null); setName(""); setEmail(""); setSubject(""); setMessage("");
      setReceipt(confirmed);
    } catch (e) {
      if (e instanceof ApiError && e.status === 400) {
        try {
          await deleteSecurePayload(PENDING_CONTACT_KEY);
          setPending(null);
          setError(errorMessage(e));
        } catch {
          setError("Could not clear the saved request. Retry the same message.");
        }
      } else {
        setError(`${errorMessage(e)} Retry the same message to avoid duplicates.`);
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const editable = restored && !pending && !busy;
  return <Screen>
    <Heading>Contact and help</Heading>
    <Copy>Send a message to the Diaspora Unlocked team. Please do not include passwords or payment details.</Copy>
    {typeof selectedReply === "string" && selectedReply.length > 0 && selectedReply !== includedReply && <Card>
      <Heading>Report an Onesa reply</Heading>
      <Copy>Review the selected reply and edit or remove any details before sending it to the team.</Copy>
      <Copy>{selectedReply}</Copy>
      {pending ? <Copy>Finish your pending support message first. It is still in the form below.</Copy>
        : (subject || message) ? <Copy>Clear the subject and message if you want to use the selected reply instead.</Copy> : null}
      <Action title="Use selected reply in report" secondary disabled={!editable || !!subject || !!message} onPress={() => {
        if (!editable || subject || message) return;
        setSubject("Report an Onesa reply");
        setMessage(selectedReply.slice(0, 4000));
        setIncludedReply(selectedReply);
      }} />
    </Card>}
    <Card>
      <Field label="Full name" value={name} onChangeText={setName} editable={editable} autoComplete="name" maxLength={120} />
      <Field label="Email address" value={email} onChangeText={setEmail} editable={editable} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={254} />
      <Field label="Subject" value={subject} onChangeText={setSubject} editable={editable} maxLength={200} />
      <Field label="Message" value={message} onChangeText={setMessage} editable={editable} multiline maxLength={4000} />
      {!!error && <Message error message={error} />}
      {!!receipt && <Message message={`Your message was received. Reference: ${receipt}`} />}
      {!restored && !!error && <Action title="Retry loading saved message" secondary onPress={() => setRestoreAttempt(n => n + 1)} />}
      <Action title={busy ? "Sending…" : pending ? "Retry same message" : "Send message"}
        disabled={!restored || busy || !name.trim() || !email.trim() || !subject.trim() || !message.trim()}
        onPress={() => void send()} />
    </Card>
    <Action title="Email info@diasporaunlocked.com" secondary onPress={() =>
      void Linking.openURL("mailto:info@diasporaunlocked.com").catch(() => setError("Could not open your email app."))} />
  </Screen>;
}
export function SearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  function editQuery(value: string) {
    if (value.trim() !== query.trim()) {
      active.current?.abort();
      active.current = null;
      setResponse(null);
      setError("");
      setBusy(false);
    }
    setQuery(value);
  }

  async function search() {
    if (active.current || !query.trim()) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    try {
      const data = await request<unknown>(`/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
      if (!controller.signal.aborted) setResponse(readSearchResponse(data, response));
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e));
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }

  function openResult({ href, title }: { href: string; title: string }) {
    const shop = shopDestination(href, title);
    if (shop?.screen === "Shop") {
      navigation.navigate("Main", { screen: "Shop", params: shop.params });
    } else if (shop) {
      navigation.navigate(shop.screen, shop.params);
    } else if (href === "/onesa-ai-chat") {
      navigation.navigate("Main", { screen: "Assistant" });
    } else if (href === "/travel" || href === "/travel/flights" || href === "/travel/stays") {
      navigation.navigate("Main", { screen: "Travel", params: { section: href.split("/")[2] } });
    } else {
      navigation.navigate("External", { path: href, title });
    }
  }

  return <Screen>
    <Heading>Search</Heading>
    <Field label="Search products, destinations and information" value={query} onChangeText={editQuery}
      returnKeyType="search" onSubmitEditing={() => void search()}/>
    <Action title={busy ? "Searching…" : error || response?.partial ? "Retry search" : "Search"} disabled={busy || !query.trim()} onPress={() => void search()}/>
    {!!error && <Message error message={error}/>}
    {response?.partial && !error && <Message message="Some results are temporarily unavailable. You can open the results shown or retry your search."/>}
    {response && !response.results.length && !response.partial && !busy && !error && <Copy>No results found. Try another search.</Copy>}
    {response?.results.map((item, i) => <Card key={`${item.href}-${i}`}>
      <Heading>{item.title}</Heading>
      <Copy>{item.category === "Tourism" ? "Travel" : item.category}{item.summary ? ` · ${item.summary}` : ""}</Copy>
      <Action title={`Open ${item.title}`} onPress={() => openResult(item)}/>
    </Card>)}
  </Screen>;
}
export function ExternalScreen({route}:{route:{params:{path:string;title:string}}}) {
  const [error,setError]=useState("");const path=route.params.path;const valid=isSitePath(path);
  return <Screen><Heading>{route.params.title}</Heading><Copy>This section opens on the Diaspora Unlocked website. You may need to sign in there.</Copy>{!!error&&<Message error message={error}/>}<Action title="Open website" disabled={!valid} onPress={()=>{if(valid)void WebBrowser.openBrowserAsync(`https://www.diasporaunlocked.com${path}`).catch(()=>setError("Could not open the browser."));}}/></Screen>;
}
