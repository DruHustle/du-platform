import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { request, type Catalog, type Product } from "../api";
import { productImageUrl as imageUrl } from "../media";
import { useCart } from "../cart";
import { canEditRejectedRequest, readPendingOrder, type OrderPayload, type Order } from "../checkout";
import { saveSecurePayload, readSecurePayload, deleteSecurePayload } from "../securePayload";
import { ORDER_KEY, PENDING_ORDER_KEY, PENDING_ORDER_COMMAND_KEY, useSession } from "../session";
import { Action, Card, Copy, Field, Heading, Loading, Message, Screen, colors } from "../ui";

const err = (value: unknown) => value instanceof Error ? value.message : "The shop is temporarily unavailable.";
const money = (amount: number, currency: string) => `${currency} ${(amount / 100).toFixed(2)}`;
function useCatalog() {
  const [data, setData] = useState<Catalog | null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const load = useCallback(async () => {setLoading(true);setError("");try {const next=await request<Catalog>("/shop/products"); if(!Array.isArray(next?.products))throw new Error("The catalogue response is invalid.");setData(next);} catch(e){setError(err(e));}finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  return {data,loading,error,load};
}
function available(data: Catalog | null, p: Product) {const r=data?.readiness;return data?.source === "db" && !!r && r.commercialReady && r.mode === "pilot" && r.enforcement === "enforced" && Array.isArray(r.approvedProductIds) && r.approvedProductIds.includes(p.id) && p.stock_qty > 0;}
export function ShopScreen({route}: {route?: {params?: {category?: string}}}) {
  const navigation=useNavigation<any>(); const cart=useCart(); const {data,loading,error,load}=useCatalog(); const [query,setQuery]=useState("");const [category,setCategory]=useState("all");
  useEffect(()=>{const selected=route?.params?.category;if(selected && ["all","sports","crafts","food","beverage"].includes(selected))setCategory(selected);},[route?.params?.category]);
  const products=(data?.products || []).filter(p=>(category === "all" || p.category === category) && `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase()));
  return <Screen><Heading>Shop</Heading><Copy>Explore products from home. Assisted orders are available only for approved products and destinations.</Copy><Field label="Search products" value={query} onChangeText={setQuery} autoCapitalize="none" /><Action title={`Basket (${cart.items.reduce((n,item)=>n+item.quantity,0)})`} onPress={()=>navigation.navigate("Cart")} secondary />
    <Card><Copy>Filter by category</Copy><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}>{["all","sports","crafts","food","beverage"].map(c=><Pressable key={c} accessibilityRole="button" accessibilityState={{selected:category===c}} onPress={()=>setCategory(c)} style={{minHeight:48,justifyContent:"center",paddingHorizontal:16,borderRadius:24,borderWidth:1,borderColor:colors.ink,backgroundColor:category===c?colors.navy:"white"}}><Text style={{fontSize:16,fontWeight:"600",color:category===c?"white":colors.ink}}>{c === "all" ? "All products" : c[0].toUpperCase()+c.slice(1)}</Text></Pressable>)}</ScrollView></Card>
    {loading && !data && <Loading label="Loading products…" />}{error && <Card><Message error message={data ? `Showing previously loaded products. ${error}` : error} /><Action title="Try again" secondary onPress={()=>void load()} /></Card>}{data?.source === "memory" && <Message message="Sample catalogue data for demonstration. Availability is not live." />}{data?.cached && <Message message="Showing cached catalogue data; availability may have changed." />}{!loading && !error && data && !products.length && <Copy>No products match these filters.</Copy>}
    {products.map(product=><Card key={product.id}>{imageUrl(product.image_url,product.image_api_url) && <Image source={{uri:imageUrl(product.image_url,product.image_api_url)}} style={{width:"100%",height:180,borderRadius:10,backgroundColor:"#e2e8f0"}} resizeMode="cover" />}<Text style={{fontSize:19,fontWeight:"700",color:colors.ink}}>{product.name}</Text><Copy>{product.description}</Copy><Copy>Indicative price: {money(product.price_cents,product.currency)}</Copy><Action title="Product details" onPress={()=>navigation.navigate("Product",{slug:product.slug})} /></Card>)}
  </Screen>;
}
export function ProductScreen({route}: {route:{params:{slug:string}}}) {
  const navigation=useNavigation<any>();const cart=useCart();const {data,loading,error,load}=useCatalog();const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [feedback,setFeedback]=useState("");const [failure,setFailure]=useState("");
  const p=data?.products.find(item=>item.slug===route.params.slug);
  return <Screen><Heading>Product details</Heading>{loading&&!data&&<Loading />}{!!error&&<Card><Message error message={error} /><Action title="Try again" onPress={()=>void load()} /></Card>}{data&&!p&&<Copy>This product is not currently available.</Copy>}{p&&<><Card>{imageUrl(p.image_url,p.image_api_url)&&<Image source={{uri:imageUrl(p.image_url,p.image_api_url)}} style={{height:220,width:"100%",borderRadius:10}} resizeMode="cover" />}<Heading>{p.name}</Heading><Copy>{p.description}</Copy><Copy>Indicative price: {money(p.price_cents,p.currency)}</Copy><Copy>{available(data,p) && !error && !loading ? "Available to request through assisted ordering." : "Ordering is not currently available for this product."}</Copy><Action disabled={!available(data,p)||!!error||loading} title="Add to basket" onPress={()=>{cart.add(p);navigation.navigate("Cart");}} /></Card><PublishedDetails productId={p.id}/><Card><Heading>Product updates</Heading><Copy>Request a one-time availability update. Confirm the email link; this does not create an order or payment.</Copy><Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />{feedback?<Message message={feedback}/>:null}{failure?<Message error message={failure}/>:null}<Action title={busy?"Sending…":"Request an update"} disabled={busy} onPress={()=>{if(busy)return;setBusy(true);setFailure("");void request("/shop/restock-notifications",{method:"POST",body:{email:email.trim(),productId:p.id,productSlug:p.slug,productName:p.name,language:"en"}}).then(()=>setFeedback("If confirmation is needed, an email link will be sent.")).catch(e=>setFailure(err(e))).finally(()=>setBusy(false));}} /></Card></>}</Screen>;
}

const detailLabels: Record<string, string> = { sizes:"Sizes", variants:"Variants", sizeGuidance:"Size guidance", dimensions:"Dimensions", materials:"Materials", ingredients:"Ingredients", allergens:"Allergens", netQuantity:"Net quantity", storage:"Storage", origin:"Origin", supplier:"Supplier", deliveryEligibility:"Delivery eligibility", handling:"Handling" };
function PublishedDetails({productId}:{productId:number}) {
  const [details,setDetails]=useState<Record<string,unknown>|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [attempt,setAttempt]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");setDetails(null);void request<{details:Record<string,unknown>}>(`/shop/products/${productId}/details`,{signal:controller.signal}).then(result=>setDetails(result.details)).catch(e=>{if(!controller.signal.aborted)setError(err(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[productId,attempt]);
  const rows=Object.entries(detailLabels).filter(([key])=>typeof details?.[key]==="string" && (details[key] as string).trim());
  return <Card><Heading>More information</Heading>{loading&&<Loading label="Loading product information…"/>}{!!error&&<><Message error message={error}/><Action title="Retry product information" secondary onPress={()=>setAttempt(value=>value+1)}/></>}{!loading&&!error&&rows.length===0&&<Copy>No additional details have been published.</Copy>}{rows.map(([key,label])=><Copy key={key}>{label}: {details?.[key] as string}</Copy>)}</Card>;
}

export function CartScreen() {
  const cart=useCart(),session=useSession(); const [name,setName]=useState(session.user?.fullName||"");const [email,setEmail]=useState(session.user?.email||"");const [country,setCountry]=useState("");const [city,setCity]=useState("");const [address,setAddress]=useState("");const [postal,setPostal]=useState("");const [notes,setNotes]=useState("");const [pending,setPending]=useState<OrderPayload|null>(null);const [order,setOrder]=useState<Order|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  const sending = useRef(false);
  const [restored, setRestored] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setRestored(false);
    setError("");
    void Promise.all([readSecurePayload(PENDING_ORDER_KEY), SecureStore.getItemAsync(ORDER_KEY)])
      .then(([draft, receipt]) => {
        if (!active) return;
        if (draft) {
          const saved = readPendingOrder(draft);
          setPending(saved);
          setName(saved.customerName); setEmail(saved.customerEmail);
          setCountry(saved.shippingCountry); setCity(saved.shippingCity);
          setAddress(saved.shippingAddress); setPostal(saved.postalCode); setNotes(saved.customerNotes);
        }
        if (receipt) setOrder(JSON.parse(receipt));
        setRestored(true);
      })
      .catch(() => { if (active) setError("Could not read your saved request on this device."); });
    return () => { active = false; };
  }, [restoreAttempt]);
  const submit = async () => {
    if (sending.current || !restored) return;
    sending.current = true;
    setError(""); setBusy(true);
    let payload = pending;
    try {
      if (!payload) {
        if (!cart.items.length || !name.trim() || !email.trim() || !country.trim() || !city.trim() || !address.trim())
          throw new Error("Complete the contact and delivery fields before sending.");
        const bytes = await Crypto.getRandomBytesAsync(32);
        const requestToken = Array.from(bytes, b => b.toString(16).padStart(2,"0")).join("");
        payload = {
          items: cart.items.map(item => ({ productId: item.product.id, quantity: item.quantity })),
          currency: "EUR", language: "en", customerName: name.trim(), customerEmail: email.trim(),
          shippingCountry: country.trim(), shippingCity: city.trim(), shippingAddress: address.trim(),
          postalCode: postal.trim(), customerNotes: notes.trim(), deliverySpeed: "normal",
          paymentMethod: "manual_assisted", analyticsConsent: false, requestToken,
        };
        await saveSecurePayload(PENDING_ORDER_KEY, JSON.stringify(payload));
        cart.reserve(requestToken, payload.items);
        setPending(payload);
      }
      const result = await request<{ order: Order }>("/shop/orders", { method: "POST", body: payload });
      if (!result?.order?.orderRef || result.order.manageToken !== payload.requestToken)
        throw new Error("Could not confirm the response. Retry the same request.");
      const { orderRef, manageToken, status, currency, totalCents } = result.order;
      const receipt = { orderRef, manageToken, status, currency, totalCents };
      await SecureStore.setItemAsync(ORDER_KEY, JSON.stringify(receipt));
      await deleteSecurePayload(PENDING_ORDER_KEY);
      cart.finish(payload.requestToken, true);
      setPending(null); setOrder(receipt);
    } catch (e) {
      if (payload && canEditRejectedRequest(e, Boolean(pending))) {
        try {
          await deleteSecurePayload(PENDING_ORDER_KEY);
          cart.finish(payload.requestToken, false);
          setPending(null);
        } catch {
          setError("Could not clear the saved request. Retry the same request.");
          return;
        }
      }
      setError(err(e));
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const editable = restored && !busy && !pending;
  return <Screen>
    <Heading>Basket</Heading>
    <Copy>Submitting a request does not complete a payment. The team will follow up with the next steps.</Copy>
    {order && <OrderStatus order={order} />}
    {!restored && !error && <Loading label="Checking for a saved request…" />}
    {!!error && <Message error message={error} />}
    {!restored && !!error && <Action title="Retry loading saved request" secondary onPress={() => setRestoreAttempt(value => value + 1)} />}
    {pending && !busy && <Message message="A previous request could not be confirmed. Retry the same request to avoid creating a duplicate." />}
    {restored && !cart.items.length && !pending && <Copy>Your basket is empty.</Copy>}
    {pending ? <Card>
      <Heading>Items in this request</Heading>
      {pending.items.map(line => <Copy key={line.productId}>
        {cart.items.find(item => item.product.id === line.productId)?.product.name || `Product #${line.productId}`} × {line.quantity}
      </Copy>)}
    </Card> : cart.items.map(({ product, quantity }) => <Card key={product.id}>
      <Copy>{product.name} · {money(product.price_cents, product.currency)}</Copy>
      <Copy>Quantity: {quantity}</Copy>
      <Action title="Add one" secondary disabled={!editable || quantity >= product.stock_qty} onPress={() => cart.setQuantity(product.id, quantity + 1)} />
      <Action title="Remove one" secondary disabled={!editable || quantity <= 1} onPress={() => cart.setQuantity(product.id, quantity - 1)} />
      <Action title="Remove" secondary disabled={!editable} onPress={() => cart.remove(product.id)} />
    </Card>)}
    {(cart.items.length > 0 || pending) && <Card>
      <Heading>Contact and delivery</Heading>
      <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" editable={editable} />
      <Field label="Email" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" editable={editable} />
      <Field label="Country" value={country} onChangeText={setCountry} editable={editable} />
      <Field label="City" value={city} onChangeText={setCity} editable={editable} />
      <Field label="Address" value={address} onChangeText={setAddress} editable={editable} />
      <Field label="Postal code" value={postal} onChangeText={setPostal} editable={editable} />
      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline editable={editable} />
      <Action title={busy ? "Sending…" : pending ? "Retry same request" : "Send assisted-order request"} disabled={busy || !restored} onPress={() => void submit()} />
    </Card>}
  </Screen>;
}

type Workflow = {stage:string;version:number;quoteExpired:boolean;nextAction:string;carrier?:string;tracking?:string;history?:{command_id?:string}[];quotes?:{version:number;currency:string;total_cents:number;valid_until:string;items:{productId:number;productName:string;quantity:number;lineTotalCents:number;fulfilmentDetails?:string}[]}[]};
function OrderStatus({order}:{order:Order}) {
  const [workflow,setWorkflow]=useState<Workflow|null>(null);const [command,setCommand]=useState<{ref:string;version:number;requestId:string}|null>(null);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
  const load=async()=>{setBusy(true);setError("");try{const [data,raw]=await Promise.all([request<Workflow>(`/shop/orders/${encodeURIComponent(order.orderRef)}/workflow`,{orderToken:order.manageToken}),SecureStore.getItemAsync(PENDING_ORDER_COMMAND_KEY)]);setWorkflow(data);if(raw){const saved=JSON.parse(raw);if(saved.ref===order.orderRef&&data.history?.some(event=>event.command_id===saved.requestId)){await SecureStore.deleteItemAsync(PENDING_ORDER_COMMAND_KEY);setCommand(null);setNotice("The previous action was saved.");}else if(saved.ref===order.orderRef)setCommand(saved);}}catch(e){setError(err(e));}finally{setBusy(false);}};
  useEffect(()=>{void load();},[order.orderRef]);
  const accept=async()=>{if(busy||!workflow)return;setBusy(true);setError("");try{let attempt=command;if(!attempt){attempt={ref:order.orderRef,version:workflow.version,requestId:Crypto.randomUUID()};await SecureStore.setItemAsync(PENDING_ORDER_COMMAND_KEY,JSON.stringify(attempt));setCommand(attempt);}await request(`/shop/orders/${encodeURIComponent(order.orderRef)}/accept-quote`,{method:"POST",orderToken:order.manageToken,body:{version:attempt.version,requestId:attempt.requestId}});await SecureStore.deleteItemAsync(PENDING_ORDER_COMMAND_KEY);setCommand(null);setNotice("Quote acceptance was recorded. Payment is arranged separately.");await load();}catch(e){setError(`${err(e)} Check the current status or retry the same action.`);}finally{setBusy(false);}};
  const quote=workflow?.quotes?.at(-1);
  return <Card><Heading>Request {order.orderRef}</Heading>{busy&&!workflow&&<Loading label="Loading request status…"/>}{!!error&&<Message error message={error}/>}{!!notice&&<Message message={notice}/>}<Action title="Refresh request status" secondary disabled={busy} onPress={()=>void load()}/>{workflow&&<><Copy>Status: {workflow.stage.replaceAll("_"," ")}</Copy><Copy>{workflow.nextAction}</Copy>{!!workflow.tracking&&<Copy>Delivery: {workflow.carrier} {workflow.tracking}</Copy>}{quote&&<><Copy>Final quote: {money(quote.total_cents,quote.currency)} · valid until {new Date(quote.valid_until).toLocaleString()}</Copy>{quote.items.map(item=><Copy key={item.productId}>{item.productName} × {item.quantity} · {money(item.lineTotalCents,quote.currency)}{item.fulfilmentDetails ? ` · ${item.fulfilmentDetails}` : ""}</Copy>)}{workflow.stage==="quote_sent"&&!workflow.quoteExpired&&<Action title={command?"Retry quote acceptance":"Accept final quote"} disabled={busy} onPress={()=>void accept()}/>}</>}</>}</Card>;
}
