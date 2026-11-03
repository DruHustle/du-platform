import React, { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { request, type TravelCriteria, type TravelQuote } from "../api";
import { useSession } from "../session";
import { travelLink } from "../links";
import { defaultNativeSearch, isSavedTravel, normalizedNativeSearch, savedSearchDestination, type NativeSearch, type SavedTravel } from "../travelState";
import { latestRequest } from "../requestLifecycle";
import { Action, Card, Copy, Field, Heading, Loading, Message, Screen } from "../ui";

function safeSupplierLink(provider: string, raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false;
    if (provider === "Kiwi.com") return ["kiwi.com", "www.kiwi.com"].includes(url.hostname) && /^\/u\/[a-zA-Z0-9_-]{1,100}$/.test(url.pathname) && !url.search;
    if (provider === "Pilot") return ["pilotplans.com", "www.pilotplans.com"].includes(url.hostname)
      && /^\/stays\/[a-zA-Z0-9_-]{1,200}$/.test(url.pathname)
      && Array.from(url.searchParams).every(([key, value]) => ["checkInDate", "checkOutDate", "rooms", "currency"].includes(key) && /^[a-zA-Z0-9,_.-]{1,150}$/.test(value));
  } catch { /* Invalid provider URL. */ }
  return false;
}
const errorMessage = (e: unknown) => e instanceof Error ? e.message : "Travel research is temporarily unavailable.";
function validQuote(value: unknown): value is TravelQuote {
  if (!value || typeof value !== "object") return false;
  const quote = value as Partial<TravelQuote>;
  return typeof quote.id === "string" && typeof quote.identity === "string" && typeof quote.title === "string"
    && typeof quote.currency === "string" && typeof quote.price === "number" && Number.isFinite(quote.price) && quote.price >= 0
    && typeof quote.bookingUrl === "string" && (quote.provider === "Kiwi.com" || quote.provider === "Pilot")
    && (quote.category === "flights" || quote.category === "stays");
}

export function TravelScreen({ route }: { route?: { params?: { section?: string } } }) {
  const session = useSession();
  const [form, setForm] = useState(defaultNativeSearch);
  const [quotes, setQuotes] = useState<TravelQuote[] | null>(null);
  const [readBusy, setReadBusy] = useState(false);
  const [writeBusy, setWriteBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [checked, setChecked] = useState<TravelQuote | null>(null);
  const [tripName, setTripName] = useState("");
  const [saved, setSaved] = useState<SavedTravel[] | null>(null);
  const [savedError, setSavedError] = useState("");
  const [savedLoading, setSavedLoading] = useState(false);
  const [requests] = useState(latestRequest);
  const accountGeneration = useRef(0);
  const savedGeneration = useRef(0);
  const busy = readBusy || writeBusy;
  const { category, criteria } = form;
  const link = travelLink(route?.params?.section);

  const clearResults = () => {
    requests.invalidate(); setReadBusy(false); setQuotes(null); setChecked(null); setError(""); setFeedback("");
  };
  const replaceSearch = (next: NativeSearch) => { clearResults(); setForm(next); };
  const changeCriteria = (changes: Partial<TravelCriteria>) => replaceSearch({ ...form, criteria: { ...criteria, ...changes } });
  useEffect(() => () => requests.invalidate(), [requests]);
  useEffect(() => {
    if (link.category) { clearResults(); setForm(current => ({ ...current, category: link.category! })); }
  }, [route?.params, link.category]);

  const loadSaved = async () => {
    if (!session.user) return;
    const account = accountGeneration.current;
    const requestVersion = ++savedGeneration.current;
    const current = () => account === accountGeneration.current && requestVersion === savedGeneration.current;
    setSavedLoading(true); setSavedError("");
    try {
      const rows = await session.authorized<SavedTravel[]>("/travel/saved");
      if (!Array.isArray(rows) || rows.length > 30 || !rows.every(isSavedTravel)) throw new Error("The saved trip response was invalid.");
      if (current()) setSaved(rows);
    } catch (e) { if (current()) setSavedError(errorMessage(e)); }
    finally { if (current()) setSavedLoading(false); }
  };
  useEffect(() => {
    accountGeneration.current++; savedGeneration.current++;
    setSaved(null); setSavedError(""); setSavedLoading(false); setWriteBusy(false);
    if (session.user) void loadSaved();
    return () => { accountGeneration.current++; savedGeneration.current++; };
  }, [session.user?.id]);

  const search = async () => {
    if (busy) return;
    const input = normalizedNativeSearch(form);
    const pending = requests.begin();
    setReadBusy(true); setError(""); setFeedback(""); setQuotes(null); setChecked(null);
    try {
      const result = await request<{ quotes: TravelQuote[] }>("/travel/search", { method: "POST", body: input, signal: pending.signal, timeoutMs: 30_000 });
      if (!Array.isArray(result?.quotes) || result.quotes.length > 20 || !result.quotes.every(q => validQuote(q) && q.category === input.category))
        throw new Error("The travel response was invalid. Please try again.");
      if (pending.isCurrent()) setQuotes(result.quotes);
    } catch (e) { if (pending.isCurrent()) setError(errorMessage(e)); }
    finally { if (pending.isCurrent()) setReadBusy(false); }
  };
  const save = async () => {
    if (busy || !tripName.trim() || !session.user) return;
    const input = normalizedNativeSearch(form);
    const account = accountGeneration.current;
    setWriteBusy(true); setError("");
    try {
      await session.authorized("/travel/saved", { method: "POST", body: { name: tripName.trim(), kind: "search", draft: { criteria: input.criteria, searches: [input], estimates: [], quotes: [] } } });
      if (account === accountGeneration.current) { setFeedback("Search saved to your account."); await loadSaved(); }
    } catch (e) { if (account === accountGeneration.current) setError(errorMessage(e)); }
    finally { if (account === accountGeneration.current) setWriteBusy(false); }
  };
  const check = async (quote: TravelQuote) => {
    if (busy) return;
    const pending = requests.begin();
    setReadBusy(true); setError(""); setChecked(null);
    try {
      const result = await request<{ quote: TravelQuote; changed: boolean }>("/travel/revalidate", { method: "POST", body: quote, signal: pending.signal, timeoutMs: 30_000 });
      if (!validQuote(result?.quote) || result.quote.identity !== quote.identity || result.quote.provider !== quote.provider || !safeSupplierLink(result.quote.provider, result.quote.bookingUrl))
        throw new Error("Provider link could not be verified.");
      if (pending.isCurrent()) {
        setChecked(result.quote);
        setFeedback(result.changed ? "The provider's price or details changed. Review the updated option before opening it." : "Provider details checked. Review them before continuing.");
      }
    } catch (e) { if (pending.isCurrent()) setError(errorMessage(e)); }
    finally { if (pending.isCurrent()) setReadBusy(false); }
  };
  const removeSaved = async (item: SavedTravel) => {
    if (busy) return;
    const account = accountGeneration.current;
    setWriteBusy(true);
    try {
      await session.authorized(`/travel/saved/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      if (account === accountGeneration.current) await loadSaved();
    } catch (e) { if (account === accountGeneration.current) setSavedError(errorMessage(e)); }
    finally { if (account === accountGeneration.current) setWriteBusy(false); }
  };
  const openWebsite = (path: string) => void WebBrowser.openBrowserAsync(`https://www.diasporaunlocked.com${path}`).catch(() => setError("Could not open the browser."));

  return <Screen>
    <Heading>Travel</Heading>
    <Copy>Research journeys to, from and within Southern Africa. Prices and availability can change; the provider handles any booking.</Copy>
    {link.website && <Card><Copy>This Travel page is available on the website.</Copy><Action title="Open requested Travel page" secondary onPress={() => openWebsite(link.website!)} /></Card>}
    <Card>
      <Heading>Find options</Heading>
      <Action title={category === "flights" ? "✓ Flights" : "Flights"} secondary={category !== "flights"} disabled={writeBusy} onPress={() => replaceSearch({ ...form, category: "flights" })} />
      <Action title={category === "stays" ? "✓ Stays" : "Stays"} secondary={category !== "stays"} disabled={writeBusy} onPress={() => replaceSearch({ ...form, category: "stays" })} />
      {category === "flights" && <Field label="From airport code (e.g. FRA)" value={criteria.origin} onChangeText={origin => changeCriteria({ origin })} editable={!writeBusy} autoCapitalize="characters" maxLength={3} />}
      <Field label="Destination airport code (e.g. HRE)" value={criteria.destination} onChangeText={destination => changeCriteria({ destination })} editable={!writeBusy} autoCapitalize="characters" maxLength={3} />
      <Field label={category === "flights" ? "Departure date (YYYY-MM-DD)" : "Check-in date (YYYY-MM-DD)"} value={criteria.departure} onChangeText={departure => changeCriteria({ departure })} editable={!writeBusy} maxLength={10} />
      <Field label={category === "flights" ? "Return date (YYYY-MM-DD)" : "Check-out date (YYYY-MM-DD)"} value={criteria.returnDate} onChangeText={returnDate => changeCriteria({ returnDate })} editable={!writeBusy} maxLength={10} />
      <Copy>Search for one adult in EUR. Additional travellers, currencies and car hire can be researched on the website.</Copy>
      <Action title={busy ? "Please wait…" : "Search providers"} disabled={busy} onPress={() => void search()} />
      {!!error && <Message error message={error} />}{!!feedback && <Message message={feedback} />}
    </Card>
    {quotes && !quotes.length && <Copy>No options were returned for this search. Try different dates or locations.</Copy>}
    {quotes?.map(quote => <Card key={quote.id}>
      <Heading>{quote.title}</Heading><Copy>{quote.provider} · {quote.currency} {quote.price.toFixed(2)}</Copy>
      <Copy>Supplier observation, not a booking or guaranteed price.</Copy>
      <Action title="Check current provider details" disabled={busy} onPress={() => void check(quote)} />
      {checked?.identity === quote.identity && <>
        <Copy>Checked price: {checked.currency} {checked.price.toFixed(2)}</Copy>
        <Action title={`Continue to ${checked.provider}`} secondary onPress={() => {
          if (safeSupplierLink(checked.provider, checked.bookingUrl)) void Linking.openURL(checked.bookingUrl).catch(() => setError("Could not open the provider. Try again."));
        }} />
      </>}
    </Card>)}
    <Card>
      <Heading>Saved searches</Heading>
      {session.user ? <>
        <Field label="Name this search" value={tripName} onChangeText={setTripName} maxLength={100} editable={!writeBusy} />
        <Action title="Save this search" disabled={busy || !tripName.trim()} onPress={() => void save()} />
        {savedLoading && <Loading />}
        {!!savedError && <><Message error message={savedError} /><Action title="Retry saved searches" secondary onPress={() => void loadSaved()} /></>}
        {saved && !saved.length && !savedError && <Copy>No saved searches yet.</Copy>}
        {saved?.map(item => {
          const destination = savedSearchDestination(item);
          return <Card key={item.id}>
            <Copy>{item.name} · {item.draft.criteria.origin} → {item.draft.criteria.destination}</Copy>
            {destination.kind === "website" && <Copy>{destination.reason}</Copy>}
            <Action title={destination.kind === "native" ? "Load into search" : "Open saved trip on website"} secondary disabled={writeBusy} onPress={() => {
              if (destination.kind === "website") { openWebsite(destination.path); return; }
              replaceSearch(destination.search); setTripName(item.name); setFeedback("Saved details loaded. Search again for current options.");
            }} />
            <Action title="Delete saved search" secondary disabled={busy} onPress={() => void removeSaved(item)} />
          </Card>;
        })}
      </> : <Copy>Sign in on the Account tab to save travel searches.</Copy>}
    </Card>
    <Card><Heading>More Travel</Heading><Copy>Explore destinations and immersive experiences on the website. If a device cannot run an immersive preview, the destination guide remains available.</Copy><Action title="Open destination guide in browser" secondary onPress={() => openWebsite("/travel")} /></Card>
  </Screen>;
}
