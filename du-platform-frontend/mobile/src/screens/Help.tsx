import React, { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useNavigation } from "@react-navigation/native";
import * as Crypto from "expo-crypto";
import { ApiError, request, requestOnesaReply, type ChatMessage } from "../api";
import { shopDestination, isSitePath } from "../shopDiscovery";
import { readSearchResponse, type SearchResponse } from "../searchResults";
import { PENDING_CONTACT_KEY } from "../session";
import { saveSecurePayload, readSecurePayload, deleteSecurePayload } from "../securePayload";
import { Action, Card, Copy, Field, Heading, Message, Screen } from "../ui";

const errorMessage=(e:unknown)=>e instanceof Error?e.message:"The service is temporarily unavailable.";
export function AssistantScreen() {
  const navigation = useNavigation<any>();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const draftVersion = useRef(0);
  useEffect(() => () => active.current?.abort(), []);

  async function send() {
    if (active.current || !text.trim()) return;
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
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return <Screen>
    <Heading>Onesa assistant</Heading>
    <Copy>Ask about Diaspora Unlocked, products, travel and business information. Onesa cannot book travel or accept payments.</Copy>
    {messages.map((message, index) => <Card key={index}>
      <Copy>{message.role === "user" ? "You" : "Onesa"}</Copy>
      <Copy>{message.content}</Copy>
    </Card>)}
    <Card>
      <Field label="Your message" value={text} multiline maxLength={4000} onChangeText={value => {
        draftVersion.current++;
        setText(value);
      }} />
      {!!error && <Message error message={error}/>}
      <Action title={busy ? "Sending…" : "Send message"} disabled={busy || !text.trim()} onPress={() => void send()}/>
    </Card>
    <Action title="Contact the team" secondary onPress={() => navigation.navigate("Contact")}/>
  </Screen>;
}
export function ContactScreen() {
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [subject,setSubject]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [feedback,setFeedback]=useState("");const [error,setError]=useState("");const [pending,setPending]=useState<{name:string;email:string;subject:string;message:string;requestId:string;language:string;module:string}|null>(null);
  useEffect(()=>{void readSecurePayload(PENDING_CONTACT_KEY).then(raw=>{if(!raw)return;const saved=JSON.parse(raw);setPending(saved);setName(saved.name);setEmail(saved.email);setSubject(saved.subject);setMessage(saved.message);setError("A previous response was not confirmed. Retry the same message.");}).catch(()=>setError("Could not read your saved message on this device."));},[]);
  const send=async()=>{if(busy)return;setBusy(true);setError("");try{const body=pending||{name:name.trim(),email:email.trim(),subject:subject.trim(),message:message.trim(),requestId:Crypto.randomUUID(),language:"en",module:"general"};if(!pending){await saveSecurePayload(PENDING_CONTACT_KEY,JSON.stringify(body));setPending(body);}await request("/notifications/contact",{method:"POST",body});await deleteSecurePayload(PENDING_CONTACT_KEY);setPending(null);setName("");setEmail("");setSubject("");setMessage("");setFeedback("Your message was received. The team will follow up when possible.");}catch(e){if(e instanceof ApiError&&e.status===400){await deleteSecurePayload(PENDING_CONTACT_KEY);setPending(null);setError(errorMessage(e));}else setError(`${errorMessage(e)} Retry the same message to avoid duplicates.`);}finally{setBusy(false);}};
  return <Screen><Heading>Contact and help</Heading><Copy>Send a message to the Diaspora Unlocked team. Please do not include passwords or payment details.</Copy><Card><Field label="Full name" value={name} onChangeText={setName} editable={!pending} autoComplete="name"/><Field label="Email address" value={email} onChangeText={setEmail} editable={!pending} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/><Field label="Subject" value={subject} onChangeText={setSubject} editable={!pending}/><Field label="Message" value={message} onChangeText={setMessage} editable={!pending} multiline maxLength={4000}/>{!!error&&<Message error message={error}/>}{!!feedback&&<Message message={feedback}/>}<Action title={busy?"Sending…":pending?"Retry same message":"Send message"} disabled={busy||!name.trim()||!email.trim()||!subject.trim()||!message.trim()} onPress={()=>void send()}/></Card><Action title="Email info@diasporaunlocked.com" secondary onPress={()=>void Linking.openURL("mailto:info@diasporaunlocked.com").catch(()=>setError("Could not open your email app."))}/></Screen>;
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
