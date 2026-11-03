import React, { useEffect, useState } from "react";
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useLinkTo, useNavigation } from "@react-navigation/native";
import * as Crypto from "expo-crypto";
import { ApiError, request } from "../api";
import { PENDING_CONTACT_KEY, useSession } from "../session";
import { latestRequest } from "../requestLifecycle";
import { saveSecurePayload, readSecurePayload, deleteSecurePayload } from "../securePayload";
import { Action, Card, Copy, Field, Heading, Message, Screen } from "../ui";

const errorMessage=(e:unknown)=>e instanceof Error?e.message:"The service is temporarily unavailable.";
export function AssistantScreen() {
  const navigation=useNavigation<any>();const [text,setText]=useState("");const [messages,setMessages]=useState<{role:"user"|"assistant";content:string}[]>([]);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const session=useSession();const [requests]=useState(latestRequest);
  useEffect(()=>{setText("");setMessages([]);setBusy(false);setError("");return()=>requests.invalidate();},[session.epoch,requests]);
  const send=async()=>{
    if(busy||!text.trim())return;
    const epoch=session.capture();const pending=requests.begin();
    const current=()=>pending.isCurrent()&&session.isCurrent(epoch);
    const submitted=text;const conversation=[...messages,{role:"user" as const,content:submitted.trim()}];
    setBusy(true);setError("");
    try{
      const result=await request<{reply:string;truncated?:boolean}>("/ai/chat",{method:"POST",body:{messages:conversation,language:"en"},signal:pending.signal,timeoutMs:30_000});
      if(!current())return;
      if(!result?.reply?.trim()||result.truncated)throw new Error("The assistant could not complete a response. Please try again.");
      setMessages([...conversation,{role:"assistant",content:result.reply}]);setText(value=>value===submitted?"":value);
    }catch(e){if(current())setError(errorMessage(e));}finally{if(current())setBusy(false);}
  };
  return <Screen><Heading>Onesa assistant</Heading><Copy>Ask about Diaspora Unlocked, products, travel and business information. Onesa cannot book travel or accept payments.</Copy>{messages.map((m,i)=><Card key={i}><Copy>{m.role==="user"?"You":"Onesa"}</Copy><Copy>{m.content}</Copy></Card>)}<Card><Field label="Your message" value={text} onChangeText={setText} multiline maxLength={4000}/>{!!error&&<Message error message={error}/>}<Action title={busy?"Sending…":"Send message"} disabled={busy||!text.trim()} onPress={()=>void send()}/></Card><Action title="Contact the team" secondary onPress={()=>navigation.navigate("Contact")}/></Screen>;
}
export function ContactScreen() {
  const session=useSession();
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [subject,setSubject]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [feedback,setFeedback]=useState("");const [error,setError]=useState("");const [pending,setPending]=useState<{name:string;email:string;subject:string;message:string;requestId:string;language:string;module:string}|null>(null);
  useEffect(()=>{setPending(null);setName("");setEmail("");setSubject("");setMessage("");setFeedback("");setError("");setBusy(false);},[session.epoch]);
  useEffect(()=>{
    if(session.loading)return;
    const epoch=session.capture();let mounted=true;
    void session.storage(epoch,()=>readSecurePayload(PENDING_CONTACT_KEY)).then(raw=>{
      if(!raw||!mounted||!session.isCurrent(epoch))return;
      const saved=JSON.parse(raw);setPending(saved);setName(saved.name);setEmail(saved.email);setSubject(saved.subject);setMessage(saved.message);setError("A previous response was not confirmed. Retry the same message.");
    }).catch(()=>{if(mounted&&session.isCurrent(epoch))setError("Could not read your saved message on this device.");});
    return()=>{mounted=false;};
  },[session.epoch,session.loading]);
  const send=async()=>{
    if(busy)return;
    const epoch=session.capture();setBusy(true);setError("");
    try{
      const body=pending||{name:name.trim(),email:email.trim(),subject:subject.trim(),message:message.trim(),requestId:Crypto.randomUUID(),language:"en",module:"general"};
      if(!pending){await session.storage(epoch,()=>saveSecurePayload(PENDING_CONTACT_KEY,JSON.stringify(body)));if(!session.isCurrent(epoch))return;setPending(body);}
      if(!session.isCurrent(epoch))return;
      await request("/notifications/contact",{method:"POST",body});
      await session.storage(epoch,()=>deleteSecurePayload(PENDING_CONTACT_KEY));
      if(session.isCurrent(epoch)){setPending(null);setName("");setEmail("");setSubject("");setMessage("");setFeedback("Your message was received. The team will follow up when possible.");}
    }catch(e){
      if(!session.isCurrent(epoch))return;
      if(e instanceof ApiError&&e.status===400){
        try{await session.storage(epoch,()=>deleteSecurePayload(PENDING_CONTACT_KEY));if(session.isCurrent(epoch))setPending(null);}
        catch(cleanupError){if(session.isCurrent(epoch))setError(errorMessage(cleanupError));return;}
        if(session.isCurrent(epoch))setError(errorMessage(e));
      }else setError(`${errorMessage(e)} Retry the same message to avoid duplicates.`);
    }finally{if(session.isCurrent(epoch))setBusy(false);}
  };
  return <Screen><Heading>Contact and help</Heading><Copy>Send a message to the Diaspora Unlocked team. Please do not include passwords or payment details.</Copy><Card><Field label="Full name" value={name} onChangeText={setName} editable={!pending} autoComplete="name"/><Field label="Email address" value={email} onChangeText={setEmail} editable={!pending} keyboardType="email-address" autoCapitalize="none" autoComplete="email"/><Field label="Subject" value={subject} onChangeText={setSubject} editable={!pending}/><Field label="Message" value={message} onChangeText={setMessage} editable={!pending} multiline maxLength={4000}/>{!!error&&<Message error message={error}/>}{!!feedback&&<Message message={feedback}/>}<Action title={busy?"Sending…":pending?"Retry same message":"Send message"} disabled={busy||!name.trim()||!email.trim()||!subject.trim()||!message.trim()} onPress={()=>void send()}/></Card><Action title="Email info@diasporaunlocked.com" secondary onPress={()=>void Linking.openURL("mailto:info@diasporaunlocked.com").catch(()=>setError("Could not open your email app."))}/></Screen>;
}
export function SearchScreen() {
  const linkTo=useLinkTo();const [query,setQuery]=useState("");const [results,setResults]=useState<{title:string;category:string;summary?:string;href:string}[]|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const search=async()=>{if(busy||!query.trim())return;setBusy(true);setError("");setResults(null);try{const data=await request<{results:typeof results}>(`/search?q=${encodeURIComponent(query.trim())}`);if(!Array.isArray(data.results)||!data.results.every(item=>item&&typeof item.title==="string"&&typeof item.category==="string"&&typeof item.href==="string"&&item.href.startsWith("/")&&!item.href.startsWith("//")&&!item.href.includes("\\")&&(item.summary===undefined||typeof item.summary==="string")))throw new Error("The search response was invalid.");setResults(data.results);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}};
  return <Screen><Heading>Search</Heading><Field label="Search products, destinations and information" value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={()=>void search()}/><Action title={busy?"Searching…":"Search"} disabled={busy||!query.trim()} onPress={()=>void search()}/>{!!error&&<Message error message={error}/>}{results&&!results.length&&<Copy>No results found. Try another search.</Copy>}{results?.map((item,i)=><Card key={`${item.href}-${i}`}><Heading>{item.title}</Heading><Copy>{item.category}{item.summary?` · ${item.summary}`:""}</Copy><Action title="Open result" onPress={()=>{try{linkTo(item.href);}catch{setError("This result could not be opened. Please try again.");}}}/></Card>)}</Screen>;
}
export function ExternalScreen({route}:{route:{params:{path:string;title:string}}}) {
  const [error,setError]=useState("");const path=route.params.path;const valid=path.startsWith("/")&&!path.startsWith("//")&&!path.includes("\\");
  return <Screen><Heading>{route.params.title}</Heading><Copy>This section opens on the Diaspora Unlocked website. You may need to sign in there.</Copy>{!!error&&<Message error message={error}/>}<Action title="Open website" disabled={!valid} onPress={()=>{if(valid)void WebBrowser.openBrowserAsync(`https://www.diasporaunlocked.com${path}`).catch(()=>setError("Could not open the browser."));}}/></Screen>;
}
