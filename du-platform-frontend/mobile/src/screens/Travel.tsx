import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { AirportField, useAirportDirectory } from "../AirportField";
import { airportCode } from "../travelAirports";
import * as WebBrowser from "expo-web-browser";
import { request, type TravelCriteria, type TravelQuote } from "../api";
import { useSession } from "../session";
import { travelLink } from "../links";
import { nativeSavedSearch, prepareNativeSearch, type SavedTravel } from "../nativeTravelSearch";
import { Action, Card, Copy, Field, Heading, Loading, Message, Screen } from "../ui";

const day=(n:number)=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
function safeSupplierLink(provider:string, raw:string) {
  try {const url=new URL(raw);if(url.protocol!=="https:"||url.username||url.password||url.port||url.hash)return false;
    if(provider==="Kiwi.com")return ["kiwi.com","www.kiwi.com"].includes(url.hostname)&&/^\/u\/[a-zA-Z0-9_-]{1,100}$/.test(url.pathname)&&!url.search;
    if(provider==="Pilot")return ["pilotplans.com","www.pilotplans.com"].includes(url.hostname)&&/^\/stays\/[a-zA-Z0-9_-]{1,200}$/.test(url.pathname)&&Array.from(url.searchParams).every(([key,value])=>["checkInDate","checkOutDate","rooms","currency"].includes(key)&&/^[a-zA-Z0-9,_.-]{1,150}$/.test(value));
  } catch {} return false;
}
const errorMessage=(e:unknown)=>e instanceof Error?e.message:"Travel research is temporarily unavailable.";
function validQuote(value: unknown): value is TravelQuote {
  if (!value || typeof value !== "object") return false;
  const quote=value as Partial<TravelQuote>;
  return typeof quote.id==="string" && typeof quote.identity==="string" && typeof quote.title==="string" && typeof quote.currency==="string" && typeof quote.price==="number" && Number.isFinite(quote.price) && quote.price>=0 && typeof quote.bookingUrl==="string" && (quote.provider==="Kiwi.com" || quote.provider==="Pilot") && (quote.category==="flights" || quote.category==="stays");
}
export function TravelScreen({route}: {route?: {params?: {section?: string}}}) {
  const session=useSession();const [category,setCategory]=useState<"flights"|"stays">("flights");const [origin,setOrigin]=useState("FRA");const [destination,setDestination]=useState("HRE");const [departure,setDeparture]=useState(day(30));const [returnDate,setReturnDate]=useState(day(37));const [quotes,setQuotes]=useState<TravelQuote[]|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [feedback,setFeedback]=useState("");const [checked,setChecked]=useState<TravelQuote|null>(null);const [tripName,setTripName]=useState("");const [saved,setSaved]=useState<SavedTravel[]|null>(null);const [savedError,setSavedError]=useState("");const [savedLoading,setSavedLoading]=useState(false);
  const [nationality, setNationality] = useState("");
  const accountGeneration=useRef(0);
  const categoryRef = useRef(category);
  const providerRequest = useRef<AbortController | null>(null);
  const directory = useAirportDirectory();
  const link = travelLink(route?.params?.section);
  const navigation = useNavigation<{ setParams: (params: { section: string }) => void }>();

  const clearResults = useCallback(() => {
    if (providerRequest.current) {
      providerRequest.current.abort();
      providerRequest.current = null;
      setBusy(false);
    }
    setQuotes(null);
    setChecked(null);
    setError("");
    setFeedback("");
  }, []);

  useEffect(() => () => {
    providerRequest.current?.abort();
    providerRequest.current = null;
  }, []);

  useEffect(() => {
    if (link.category && link.category !== categoryRef.current) {
      clearResults();
      categoryRef.current = link.category;
      setCategory(link.category);
    }
  }, [clearResults, link.category]);

  const changeCategory = (next: "flights" | "stays") => {
    clearResults();
    categoryRef.current = next;
    setCategory(next);
    navigation.setParams({ section: next });
  };
  const criteria = (): TravelCriteria => {
    const from = airportCode(origin, directory.airports);
    const to = airportCode(destination, directory.airports);
    if (category === "flights" && !from) throw new Error("Choose a departure airport or enter its three-letter code.");
    if (!to) throw new Error("Choose a destination airport or enter its three-letter code.");
    if (category === "flights" && from === to) throw new Error("Choose different departure and destination airports.");
    return {origin: from, destination: to, tripType: "return", departure: departure.trim(), returnDate: returnDate.trim(),
      adults: 1, childAges: [], rooms: 1, currency: "EUR", pickup: "HRE", dropoff: "HRE", pickupTime: "10:00", dropoffTime: "10:00"};
  };
  const loadSaved=async()=>{if(!session.user)return;const generation=accountGeneration.current;setSavedLoading(true);setSavedError("");try{const rows=await session.authorized<SavedTravel[]>("/travel/saved");if(!Array.isArray(rows)||rows.length>30||!rows.every(row=>typeof row?.id==="string"&&typeof row.name==="string"&&typeof row.draft?.criteria?.origin==="string"&&typeof row.draft.criteria.destination==="string"&&typeof row.draft.criteria.departure==="string"&&typeof row.draft.criteria.returnDate==="string"))throw new Error("The saved trip response was invalid.");if(generation===accountGeneration.current)setSaved(rows);}catch(e){if(generation===accountGeneration.current)setSavedError(errorMessage(e));}finally{if(generation===accountGeneration.current)setSavedLoading(false);}};
  useEffect(()=>{accountGeneration.current++;setSaved(null);setSavedError("");setSavedLoading(false);if(session.user)void loadSaved();return()=>{accountGeneration.current++;};},[session.user?.id]);
  async function readProvider(operation: (signal: AbortSignal) => Promise<void>) {
    if (busy || providerRequest.current) return;
    const controller = new AbortController();
    providerRequest.current = controller;
    setBusy(true);
    setError("");
    setFeedback("");
    setChecked(null);
    try {
      await operation(controller.signal);
    } catch (failure) {
      if (!controller.signal.aborted) setError(errorMessage(failure));
    } finally {
      if (providerRequest.current === controller) {
        providerRequest.current = null;
        setBusy(false);
      }
    }
  }

  const search = () => readProvider(async signal => {
    setQuotes(null);
    const result = await request<{ quotes: TravelQuote[] }>("/travel/search", {
      method: "POST",
      body: prepareNativeSearch(category, criteria(), nationality),
      timeoutMs: 30_000,
      signal,
    });
    if (!Array.isArray(result?.quotes) || result.quotes.length > 20 ||
        !result.quotes.every(quote => validQuote(quote) && quote.category === category)) {
      throw new Error("The travel response was invalid. Please try again.");
    }
    if (!signal.aborted) setQuotes(result.quotes);
  });
  const save=async()=>{if(busy||!tripName.trim()||!session.user)return;setBusy(true);setError("");try{const search = prepareNativeSearch(category, criteria(), nationality); await session.authorized("/travel/saved",{method:"POST",body:{name:tripName.trim(),kind:"search",draft:{criteria:search.criteria,searches:[search],estimates:[],quotes:[]}}});setFeedback("Search saved to your account.");await loadSaved();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}};
  const check = (quote: TravelQuote) => readProvider(async signal => {
    const result = await request<{ quote: TravelQuote; changed: boolean }>("/travel/revalidate", {
      method: "POST",
      body: quote,
      timeoutMs: 30_000,
      signal,
    });
    if (!validQuote(result?.quote) || result.quote.identity !== quote.identity ||
        result.quote.provider !== quote.provider || result.quote.category !== category ||
        !safeSupplierLink(result.quote.provider, result.quote.bookingUrl)) {
      throw new Error("Provider link could not be verified.");
    }
    if (signal.aborted) return;
    setChecked(result.quote);
    setFeedback(result.changed
      ? "The provider's price or details changed. Review the updated option before opening it."
      : "Provider details checked. Review them before continuing.");
  });
  return <Screen><Heading>Travel</Heading><Copy>Research journeys to, from and within Southern Africa. Prices and availability can change; the provider handles any booking.</Copy>{link.website && <Card><Copy>This Travel page is available on the website.</Copy><Action title="Open requested Travel page" secondary onPress={()=>void WebBrowser.openBrowserAsync(`https://www.diasporaunlocked.com${link.website}`).catch(()=>setError("Could not open the browser."))}/></Card>}<Card><Heading>Find options</Heading><View style={{flexDirection: "row", flexWrap: "wrap", gap: 8}}>
      {(["flights", "stays"] as const).map(option => {
        const label = option === "flights" ? "Flights" : "Stays";
        return <View key={option} style={{flexGrow: 1, flexBasis: 100}}>
          <Action title={category === option ? `✓ ${label}` : label} secondary={category !== option}
            selected={category === option} disabled={busy} onPress={() => changeCategory(option)}/>
        </View>;
      })}
    </View>
    <Copy>Enter a city name or a three-letter airport code.</Copy>
    {directory.unavailable && <><Copy>City lookup is unavailable. You can still enter a three-letter airport code.</Copy>
      <Action secondary title="Retry city lookup" onPress={directory.retry}/></>}
    {category === "flights" && <AirportField label="Flying from" testID="From airport code (e.g. FRA)"
      airports={directory.airports} value={origin} disabled={busy} onChange={value => { clearResults(); setOrigin(value); }}/>}
    <AirportField label={category === "flights" ? "Flying to" : "Stay near"} testID="Destination airport code (e.g. HRE)"
      airports={directory.airports} value={destination} disabled={busy} onChange={value => { clearResults(); setDestination(value); }}/>
    <Field label={category==="flights"?"Departure date (YYYY-MM-DD)":"Check-in date (YYYY-MM-DD)"} value={departure}
      editable={!busy} onChangeText={value => { clearResults(); setDeparture(value); }} maxLength={10}/>
    <Field label={category==="flights"?"Return date (YYYY-MM-DD)":"Check-out date (YYYY-MM-DD)"} value={returnDate}
      editable={!busy} onChangeText={value => { clearResults(); setReturnDate(value); }} maxLength={10}/>
    {category === "stays" && <Field label="Guest nationality (two-letter country code)" value={nationality} maxLength={2} autoCapitalize="characters" autoCorrect={false} editable={!busy} onChangeText={value => {
    setNationality(value.toUpperCase()); clearResults();
  }} />}<Copy>Search for one adult. Additional travellers and car hire can be researched on the website.</Copy><Action title={busy?"Please wait…":"Search providers"} disabled={busy} onPress={()=>void search()}/>{!!error&&<Message error message={error}/>}{!!feedback&&<Message message={feedback}/>}</Card>
  {quotes && !quotes.length && <Copy>No options were returned for this search. Try different dates or locations.</Copy>}{quotes?.map(quote=><Card key={quote.id}><Heading>{quote.title}</Heading><Copy>{quote.provider} · {quote.currency} {quote.price.toFixed(2)}</Copy><Copy>Supplier observation, not a booking or guaranteed price.</Copy><Action title="Check current provider details" disabled={busy} onPress={()=>void check(quote)} />{checked?.identity===quote.identity&&<><Copy>Checked price: {checked.currency} {checked.price.toFixed(2)}</Copy><Action title={`Continue to ${checked.provider}`} secondary onPress={()=>{if(safeSupplierLink(checked.provider,checked.bookingUrl))void Linking.openURL(checked.bookingUrl).catch(()=>setError("Could not open the provider. Try again."));}} /></>}</Card>)}
  <Card><Heading>Saved searches</Heading>{session.user?<><Field label="Name this search" value={tripName} onChangeText={setTripName} maxLength={100}/><Action title="Save this search" disabled={busy||!tripName.trim()} onPress={()=>void save()}/>{savedLoading&&<Loading/>}{!!savedError&&<><Message error message={savedError}/><Action title="Retry saved searches" secondary onPress={()=>void loadSaved()}/></>}{saved&&!saved.length&&!savedError&&<Copy>No saved searches yet.</Copy>}{saved?.map(item=>{
    const selected = nativeSavedSearch(item);
    return <Card key={item.id}><Copy>{item.name} · {(selected?.criteria ?? item.draft.criteria).origin} → {(selected?.criteria ?? item.draft.criteria).destination}</Copy><Action title={selected ? "Load into search" : "Open saved trip on website"} secondary disabled={busy} onPress={()=>{
      if (!selected) {
        void WebBrowser.openBrowserAsync("https://www.diasporaunlocked.com/travel/my-trips").catch(()=>setError("Could not open the browser."));
        return;
      }
      const c=selected.criteria; changeCategory(selected.category); setOrigin(c.origin); setDestination(c.destination);
      setDeparture(c.departure); setReturnDate(c.returnDate); setNationality(c.guestNationality ?? "");
      setTripName(item.name); setQuotes(null); setChecked(null); setError("");
      setFeedback("Saved details loaded. Search again for current options.");
    }} /><Action title="Delete saved search" secondary disabled={busy} onPress={()=>{setBusy(true);void session.authorized(`/travel/saved/${item.id}`,{method:"DELETE"}).then(()=>loadSaved()).catch(e=>setSavedError(errorMessage(e))).finally(()=>setBusy(false));}}/></Card>;})}</>:<Copy>Sign in on the Account tab to save travel searches.</Copy>}</Card>
  <Card><Heading>More Travel</Heading><Copy>Explore destinations and immersive experiences on the website. If a device cannot run an immersive preview, the destination guide remains available.</Copy><Action title="Open destination guide in browser" secondary onPress={()=>void WebBrowser.openBrowserAsync("https://www.diasporaunlocked.com/travel").catch(()=>setError("Could not open the browser."))}/></Card></Screen>;
}
