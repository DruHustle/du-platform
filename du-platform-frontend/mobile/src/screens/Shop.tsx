import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { ApiError, parseCatalog, request, type Catalog, type Product } from "../api";
import { productImageUrl as imageUrl } from "../media";
import { useCart } from "../cart";
import { saveSecurePayload, readSecurePayload, deleteSecurePayload } from "../securePayload";
import { ORDER_KEY, PENDING_ORDER_KEY, PENDING_ORDER_COMMAND_KEY, useSession } from "../session";
import { latestRequest } from "../requestLifecycle";
import { clearMatchingOrderCommand, commandForOrder, parseOrderCommand, sameOrder, workflowForOrder, type OrderCommand, type OrderSnapshot, type OrderWorkflow } from "../orderState";
import { Action, Card, Copy, Field, Grid, Heading, Loading, Message, Screen, colors } from "../ui";

const err = (value: unknown) => value instanceof Error ? value.message : "The shop is temporarily unavailable.";
const money = (amount: number, currency: string) => `${currency} ${(amount / 100).toFixed(2)}`;
function useCatalog() {
  const [data, setData] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests] = useState(latestRequest);
  const load = useCallback(async () => {
    const pending = requests.begin();
    setLoading(true); setError("");
    try {
      const next = parseCatalog(await request<unknown>("/shop/products", { signal: pending.signal }));
      if (pending.isCurrent()) setData(next);
    } catch (e) { if (pending.isCurrent()) setError(err(e)); }
    finally { if (pending.isCurrent()) setLoading(false); }
  }, [requests]);
  useFocusEffect(useCallback(() => { void load(); return requests.invalidate; }, [load, requests]));
  return {data,loading,error,load};
}
function available(data: Catalog | null, p: Product) {const r=data?.readiness;return data?.source === "db" && !!r && r.commercialReady && r.mode === "pilot" && r.enforcement === "enforced" && Array.isArray(r.approvedProductIds) && r.approvedProductIds.includes(p.id) && p.stock_qty > 0;}
export function ShopScreen({route}: {route?: {params?: {category?: string}}}) {
  const navigation=useNavigation<any>(); const cart=useCart(); const {data,loading,error,load}=useCatalog(); const [query,setQuery]=useState("");const [category,setCategory]=useState("all");
  useEffect(()=>{const selected=route?.params?.category;if(selected && ["all","sports","crafts","food","beverage"].includes(selected))setCategory(selected);},[route?.params]);
  const products=(data?.products || []).filter(p=>(category === "all" || p.category === category) && `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  return <Screen wide><Heading>Shop</Heading><Copy>Explore products from home. Assisted orders are available only for approved products and destinations.</Copy><Field label="Search products" value={query} onChangeText={setQuery} autoCapitalize="none" /><Action title={`Basket (${cart.items.reduce((n,item)=>n+item.quantity,0)})`} onPress={()=>navigation.navigate("Cart")} secondary />
    <Card><Copy>Filter by category</Copy><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{["all","sports","crafts","food","beverage"].map(c=><Pressable key={c} accessibilityRole="button" accessibilityState={{selected:category===c}} onPress={()=>setCategory(c)} style={{minHeight:48,justifyContent:"center",paddingHorizontal:16,borderRadius:24,borderWidth:1,borderColor:colors.ink,backgroundColor:category===c?colors.navy:"white"}}><Text style={{fontSize:16,fontWeight:"600",color:category===c?"white":colors.ink}}>{c === "all" ? "All products" : c[0].toUpperCase()+c.slice(1)}</Text></Pressable>)}</ScrollView></Card>
    {loading && !data && <Loading label="Loading products…" />}{error && <Card><Message error message={data ? `Showing previously loaded products. ${error}` : error} /><Action title="Try again" secondary onPress={()=>void load()} /></Card>}{data?.source === "memory" && <Message message="Sample catalogue data for demonstration. Availability is not live." />}{data?.cached && <Message message="Showing cached catalogue data; availability may have changed." />}{!loading && !error && data && !products.length && <Copy>No products match these filters.</Copy>}
    <Grid>{products.map(product=><Card key={product.id}>{imageUrl(product.image_url,product.image_api_url) && <Image source={{uri:imageUrl(product.image_url,product.image_api_url)}} style={{width:"100%",height:180,borderRadius:10,backgroundColor:"#e2e8f0"}} resizeMode="cover" />}<Text style={{fontSize:19,fontWeight:"700",color:colors.ink}}>{product.name}</Text><Copy>{product.description}</Copy><Copy>Indicative price: {money(product.price_cents,product.currency)}</Copy><Action title="Product details" onPress={()=>navigation.navigate("Product",{slug:product.slug})} /></Card>)}</Grid>
  </Screen>;
}
export function ProductScreen({route}: {route:{params:{slug:string}}}) {
  const navigation=useNavigation<any>();const cart=useCart();const {data,loading,error,load}=useCatalog();const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [feedback,setFeedback]=useState("");const [failure,setFailure]=useState("");
  const [requests] = useState(latestRequest);
  const currentSlug = useRef(route.params.slug); currentSlug.current = route.params.slug;
  useEffect(() => {
    requests.invalidate(); setEmail(""); setBusy(false); setFeedback(""); setFailure("");
    return requests.invalidate;
  }, [route.params.slug, requests]);
  const p=data?.products.find(item=>item.slug===route.params.slug);
  const requestUpdate = async () => {
    if (busy || !p) return;
    const slug = route.params.slug;
    const pending = requests.begin();
    const current = () => pending.isCurrent() && currentSlug.current === slug;
    setBusy(true); setFailure(""); setFeedback("");
    try {
      await request("/shop/restock-notifications", { method: "POST", body: { email: email.trim(), productId: p.id, productSlug: p.slug, productName: p.name, language: "en" }, signal: pending.signal });
      if (current()) setFeedback("If confirmation is needed, an email link will be sent.");
    } catch (e) { if (current()) setFailure(err(e)); }
    finally { if (current()) setBusy(false); }
  };
  return <Screen><Heading>Product details</Heading>{loading&&!data&&<Loading />}{!!error&&<Card><Message error message={error} /><Action title="Try again" onPress={()=>void load()} /></Card>}{data&&!p&&<Copy>This product is not currently available.</Copy>}{p&&<><Card>{imageUrl(p.image_url,p.image_api_url)&&<Image source={{uri:imageUrl(p.image_url,p.image_api_url)}} style={{height:220,width:"100%",borderRadius:10}} resizeMode="cover" />}<Heading>{p.name}</Heading><Copy>{p.description}</Copy><Copy>Indicative price: {money(p.price_cents,p.currency)}</Copy><Copy>{available(data,p) && !error && !loading ? "Available to request through assisted ordering." : "Ordering is not currently available for this product."}</Copy><Action disabled={!available(data,p)||!!error||loading} title="Add to basket" onPress={()=>{cart.add(p);navigation.navigate("Cart");}} /></Card><PublishedDetails productId={p.id}/><Card><Heading>Product updates</Heading><Copy>Request a one-time availability update. Confirm the email link; this does not create an order or payment.</Copy><Field label="Email address" value={email} onChangeText={setEmail} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />{feedback?<Message message={feedback}/>:null}{failure?<Message error message={failure}/>:null}<Action title={busy?"Sending…":"Request an update"} disabled={busy || !email.trim()} onPress={() => void requestUpdate()} /></Card></>}</Screen>;
}

const detailLabels: Record<string, string> = { sizes:"Sizes", variants:"Variants", sizeGuidance:"Size guidance", dimensions:"Dimensions", materials:"Materials", ingredients:"Ingredients", allergens:"Allergens", netQuantity:"Net quantity", storage:"Storage", origin:"Origin", supplier:"Supplier", deliveryEligibility:"Delivery eligibility", handling:"Handling" };
function PublishedDetails({productId}:{productId:number}) {
  const [details,setDetails]=useState<Record<string,unknown>|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [attempt,setAttempt]=useState(0);
  const [requests] = useState(latestRequest);
  useEffect(() => {
    const pending = requests.begin(); setLoading(true); setError(""); setDetails(null);
    void request<{ details: Record<string, unknown> }>(`/shop/products/${productId}/details`, { signal: pending.signal })
      .then(result => { if (pending.isCurrent()) setDetails(result.details); })
      .catch(e => { if (pending.isCurrent()) setError(err(e)); })
      .finally(() => { if (pending.isCurrent()) setLoading(false); });
    return requests.invalidate;
  }, [productId, attempt, requests]);
  const rows=Object.entries(detailLabels).filter(([key])=>typeof details?.[key]==="string" && (details[key] as string).trim());
  return <Card><Heading>More information</Heading>{loading&&<Loading label="Loading product information…"/>}{!!error&&<><Message error message={error}/><Action title="Retry product information" secondary onPress={()=>setAttempt(value=>value+1)}/></>}{!loading&&!error&&rows.length===0&&<Copy>No additional details have been published.</Copy>}{rows.map(([key,label])=><Copy key={key}>{label}: {details?.[key] as string}</Copy>)}</Card>;
}

type OrderPayload={items:{productId:number;quantity:number}[];currency:string;language:string;customerName:string;customerEmail:string;shippingCountry:string;shippingCity:string;shippingAddress:string;postalCode:string;customerNotes:string;deliverySpeed:"normal";paymentMethod:"manual_assisted";analyticsConsent:false;requestToken:string};
type Order={orderRef:string;manageToken:string;status:string;currency:string;totalCents:number};
export function CartScreen() {
  const cart=useCart(),session=useSession(); const [name,setName]=useState(session.user?.fullName||"");const [email,setEmail]=useState(session.user?.email||"");const [country,setCountry]=useState("");const [city,setCity]=useState("");const [address,setAddress]=useState("");const [postal,setPostal]=useState("");const [notes,setNotes]=useState("");const [pending,setPending]=useState<OrderPayload|null>(null);const [order,setOrder]=useState<Order|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  useEffect(()=>{setPending(null);setOrder(null);setBusy(false);setError("");setName(session.user?.fullName||"");setEmail(session.user?.email||"");setCountry("");setCity("");setAddress("");setPostal("");setNotes("");},[session.epoch,session.user?.id]);
  useEffect(()=>{
    if(session.loading)return;
    const epoch=session.capture();let mounted=true;
    void session.storage(epoch,async()=>[await readSecurePayload(PENDING_ORDER_KEY),await SecureStore.getItemAsync(ORDER_KEY)] as const).then(([a,b])=>{
      if(!mounted||!session.isCurrent(epoch))return;
      if(a){const saved=JSON.parse(a) as OrderPayload;setPending(saved);setName(saved.customerName);setEmail(saved.customerEmail);setCountry(saved.shippingCountry);setCity(saved.shippingCity);setAddress(saved.shippingAddress);setPostal(saved.postalCode);setNotes(saved.customerNotes);}
      if(b)setOrder(JSON.parse(b));
    }).catch(()=>{if(mounted&&session.isCurrent(epoch))setError("Could not read your saved request on this device.");});
    return()=>{mounted=false;};
  },[session.epoch,session.loading,session.user?.id]);
  const submit=async()=>{
    if(busy)return;
    const epoch=session.capture();setError("");setBusy(true);
    try {
      let payload=pending;
      if(!payload){
        if(!cart.items.length||!name.trim()||!email.trim()||!country.trim()||!city.trim()||!address.trim())throw new Error("Complete the contact and delivery fields before sending.");
        const bytes=await Crypto.getRandomBytesAsync(32);
        const requestToken=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
        payload={items:cart.items.map(i=>({productId:i.product.id,quantity:i.quantity})),currency:"EUR",language:"en",customerName:name.trim(),customerEmail:email.trim(),shippingCountry:country.trim(),shippingCity:city.trim(),shippingAddress:address.trim(),postalCode:postal.trim(),customerNotes:notes.trim(),deliverySpeed:"normal",paymentMethod:"manual_assisted",analyticsConsent:false,requestToken};
        const saved=payload;
        await session.storage(epoch,()=>saveSecurePayload(PENDING_ORDER_KEY,JSON.stringify(saved)));
        if(!session.isCurrent(epoch))return;
        setPending(payload);
      }
      if(!session.isCurrent(epoch))return;
      const result=await request<{order:Order}>("/shop/orders",{method:"POST",body:payload});
      if(!session.isCurrent(epoch))return;
      if(!result.order?.orderRef||!result.order?.manageToken)throw new Error("Could not confirm the response. Retry the same request.");
      const receipt={orderRef:result.order.orderRef,manageToken:result.order.manageToken,status:result.order.status,currency:result.order.currency,totalCents:result.order.totalCents};
      await session.storage(epoch,async()=>{await SecureStore.setItemAsync(ORDER_KEY,JSON.stringify(receipt));await deleteSecurePayload(PENDING_ORDER_KEY);});
      if(session.isCurrent(epoch)){setPending(null);setOrder(result.order);cart.clear();}
    }catch(e){
      if(!session.isCurrent(epoch))return;
      if(e instanceof ApiError&&e.status===400){
        try{await session.storage(epoch,()=>deleteSecurePayload(PENDING_ORDER_KEY));if(session.isCurrent(epoch))setPending(null);}
        catch(cleanupError){if(session.isCurrent(epoch))setError(err(cleanupError));return;}
      }
      if(session.isCurrent(epoch))setError(err(e));
    }finally{if(session.isCurrent(epoch))setBusy(false);}
  };
  return <Screen><Heading>Basket</Heading><Copy>Submitting a request does not complete a payment. The team will follow up with the next steps.</Copy>{order&&<OrderStatus order={order} />}{pending&&<Message error message="A previous request could not be confirmed. Retry the same request to avoid creating a duplicate." />}{!cart.items.length&&!pending&&<Copy>Your basket is empty.</Copy>}{cart.items.map(item=><Card key={item.product.id}><Copy>{item.product.name} · {money(item.product.price_cents,item.product.currency)}</Copy><Copy>Quantity: {item.quantity}</Copy><Action title="Add one" secondary disabled={busy||!!pending||item.quantity>=item.product.stock_qty} onPress={()=>cart.setQuantity(item.product.id,item.quantity+1)} /><Action title="Remove" secondary disabled={busy||!!pending} onPress={()=>cart.remove(item.product.id)} /></Card>)}
    {(cart.items.length>0||pending)&&<Card><Heading>Contact and delivery</Heading><Field label="Full name" value={name} onChangeText={setName} autoComplete="name" editable={!busy&&!pending} /><Field label="Email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" editable={!busy&&!pending} /><Field label="Country" value={country} onChangeText={setCountry} editable={!busy&&!pending} /><Field label="City" value={city} onChangeText={setCity} editable={!busy&&!pending} /><Field label="Address" value={address} onChangeText={setAddress} editable={!busy&&!pending} /><Field label="Postal code" value={postal} onChangeText={setPostal} editable={!busy&&!pending} /><Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline editable={!busy&&!pending} />{!!error&&<Message error message={error}/>}<Action title={busy?"Sending…":pending?"Retry same request":"Send assisted-order request"} disabled={busy} onPress={()=>void submit()} /></Card>}
  </Screen>;
}

function OrderStatus({order}:{order:Order}) {
  const session=useSession();
  const [snapshot,setSnapshot]=useState<OrderSnapshot|null>(null);
  const [command,setCommand]=useState<OrderCommand|null>(null);
  const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  const [requests]=useState(latestRequest);
  const currentOrder=useRef(order);currentOrder.current=order;
  // This check applies during render, before an effect has a chance to clear
  // old state. A previous order's quote can never appear under a new heading.
  const workflow=workflowForOrder(order,snapshot);
  const pendingCommand=commandForOrder(order,command);
  const clearCommand=(epoch:number,expected:OrderCommand)=>session.storage(epoch,()=>clearMatchingOrderCommand(
    expected,()=>SecureStore.getItemAsync(PENDING_ORDER_COMMAND_KEY),()=>SecureStore.deleteItemAsync(PENDING_ORDER_COMMAND_KEY)
  ));
  const load=async()=>{
    if(!sameOrder(order,currentOrder.current))return;
    const epoch=session.capture();const pending=requests.begin();
    const current=()=>pending.isCurrent()&&session.isCurrent(epoch)&&sameOrder(order,currentOrder.current);
    setBusy(true);setError("");setCommand(null);
    try{
      const [data,raw]=await Promise.all([request<OrderWorkflow>(`/shop/orders/${encodeURIComponent(order.orderRef)}/workflow`,{orderToken:order.manageToken,signal:pending.signal}),session.storage(epoch,()=>SecureStore.getItemAsync(PENDING_ORDER_COMMAND_KEY))]);
      if(!current())return;
      if(!data||typeof data.stage!=="string"||!Number.isSafeInteger(data.version))throw new Error("The order status response was invalid. Refresh and try again.");
      const saved=commandForOrder(order,parseOrderCommand(raw));
      const completed=saved&&data.history?.some(event=>event.command_id===saved.requestId);
      if(saved&&completed){await clearCommand(epoch,saved);if(!current())return;setNotice("The previous action was saved.");}
      if(current()){
        setSnapshot({order:{orderRef:order.orderRef,manageToken:order.manageToken},workflow:data});
        setCommand(completed?null:saved);
      }
    }catch(e){if(current())setError(err(e));}finally{if(current())setBusy(false);}
  };
  useEffect(()=>{
    requests.invalidate();setSnapshot(null);setCommand(null);setError("");setNotice("");setBusy(false);
    void load();
    return()=>requests.invalidate();
  },[order.orderRef,order.manageToken,session.epoch]);
  const accept=async()=>{
    if(busy||(error&&!pendingCommand)||!workflow||workflow.stage!=="quote_sent"||workflow.quoteExpired||!sameOrder(order,currentOrder.current))return;
    const epoch=session.capture();const pending=requests.begin();
    const current=()=>pending.isCurrent()&&session.isCurrent(epoch)&&sameOrder(order,currentOrder.current);
    setBusy(true);setError("");
    try{
      let attempt=pendingCommand;
      if(!attempt){
        attempt={ref:order.orderRef,version:workflow.version,requestId:Crypto.randomUUID()};const saved=attempt;
        await session.storage(epoch,async()=>{if(current())await SecureStore.setItemAsync(PENDING_ORDER_COMMAND_KEY,JSON.stringify(saved));});
        if(!current())return;setCommand(attempt);
      }
      if(!current())return;
      await request(`/shop/orders/${encodeURIComponent(order.orderRef)}/accept-quote`,{method:"POST",orderToken:order.manageToken,body:{version:attempt.version,requestId:attempt.requestId},signal:pending.signal});
      if(!current())return;
      const removed=await clearCommand(epoch,attempt);
      if(current()){if(removed)setCommand(null);setNotice("Quote acceptance was recorded. Payment is arranged separately.");await load();}
    }catch(e){if(current())setError(`${err(e)} Check the current status or retry the same action.`);}finally{if(current())setBusy(false);}
  };
  const quote=workflow?.quotes?.at(-1);
  return <Card><Heading>Request {order.orderRef}</Heading>{busy&&!workflow&&<Loading label="Loading request status…"/>}{!!error&&<Message error message={error}/>}{!!notice&&<Message message={notice}/>}<Action title="Refresh request status" secondary disabled={busy} onPress={()=>void load()}/>{workflow&&<><Copy>Status: {workflow.stage.replaceAll("_"," ")}</Copy><Copy>{workflow.nextAction}</Copy>{!!workflow.tracking&&<Copy>Delivery: {workflow.carrier} {workflow.tracking}</Copy>}{quote&&<><Copy>Final quote: {money(quote.total_cents,quote.currency)} · valid until {new Date(quote.valid_until).toLocaleString()}</Copy>{quote.items.map(item=><Copy key={item.productId}>{item.productName} × {item.quantity} · {money(item.lineTotalCents,quote.currency)}{item.fulfilmentDetails ? ` · ${item.fulfilmentDetails}` : ""}</Copy>)}{workflow.stage==="quote_sent"&&!workflow.quoteExpired&&<Action title={pendingCommand?"Retry quote acceptance":"Accept final quote"} disabled={busy||Boolean(error&&!pendingCommand)} onPress={()=>void accept()}/>}</>}</>}</Card>;
}
