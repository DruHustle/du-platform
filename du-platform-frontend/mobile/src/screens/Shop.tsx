import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, Switch, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { request, type Catalog, type Product } from "../api";
import { canRequestProduct, defaultShopFilters, filterShopProducts, shopCategories, type ShopFilters } from "../shopDiscovery";
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
export function ShopScreen({ route }: { route?: { params?: Partial<ShopFilters> } }) {
  const navigation = useNavigation<any>();
  const cart = useCart();
  const { data, loading, error, load } = useCatalog();
  const filters = { ...defaultShopFilters, ...route?.params };
  const products = data ? filterShopProducts(data, filters) : [];
  const filtered = Boolean(filters.q.trim() || filters.availableOnly || filters.category !== "all");
  const quantity = cart.items.reduce((count, item) => count + item.quantity, 0);
  return <Screen>
    <Heading>Shop</Heading>
    <Copy>Explore Zimbabwean products, check availability and request updates.</Copy>
    <Action title={`Basket (${quantity})`} onPress={() => navigation.navigate("Cart")} secondary />
    <Card>
      <Field label="Search products" placeholder="Product name or description" value={filters.q}
        onChangeText={q => navigation.setParams({ q })} autoCapitalize="none" returnKeyType="search" />
      <Copy>Category</Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(shopCategories) as ShopFilters["category"][]).map(category => {
          const selected = filters.category === category;
          return <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected }}
            onPress={() => navigation.setParams({ category })}
            style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 14, borderRadius: 24,
              borderWidth: 1, borderColor: colors.ink, backgroundColor: selected ? colors.navy : "white" }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: selected ? "white" : colors.ink }}>{shopCategories[category]}</Text>
          </Pressable>;
        })}
      </View>
      <View style={{ flexDirection: "row", minHeight: 48, alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ flex: 1, fontSize: 16, color: colors.ink }}>Available to request only</Text>
        <Switch hitSlop={8} accessibilityLabel="Available to request only" value={filters.availableOnly}
          onValueChange={availableOnly => navigation.setParams({ availableOnly })} />
      </View>
      {filtered && <Action title="Clear filters" secondary onPress={() => navigation.setParams(defaultShopFilters)} />}
    </Card>
    {loading && !data && <Loading label="Loading products…" />}
    {!!error && <Card><Message error message={data ? `Showing previously loaded products. ${error}` : error} /><Action title="Try again" secondary onPress={() => void load()} /></Card>}
    {data?.source === "memory" && <Message message="Sample catalogue. Live stock levels are unavailable." />}
    {data?.cached && <Message message="Showing cached catalogue data. Availability may have changed." />}
    {data && products.length > 0 && <Text accessibilityLiveRegion="polite" style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}>
      {products.length} {products.length === 1 ? "product" : "products"}
    </Text>}
    {data && !products.length && <Message message={filtered ? "No products match. Change or clear your filters to see more." : "There are no products in the catalogue yet."} />}
    {products.map(product => {
      const image = imageUrl(product.image_url, product.image_api_url);
      return <Card key={product.id}>
        {image && <Image source={{ uri: image }} style={{ width: "100%", height: 180, borderRadius: 10, backgroundColor: colors.pale }} resizeMode="cover" />}
        <Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: "700", color: colors.ink }}>{product.name}</Text>
        <Copy>{product.description}</Copy>
        <Copy>Indicative price: {money(product.price_cents, product.currency)}</Copy>
        <Action title="Product details" accessibilityLabel={`View details for ${product.name}`} onPress={() => navigation.navigate("Product", { slug: product.slug })} />
      </Card>;
    })}
  </Screen>;
}
export function ProductScreen({ route }: { route: { params: { slug: string } } }) {
  const navigation = useNavigation<any>();
  const cart = useCart();
  const { data, loading, error, load } = useCatalog();
  const product = data?.products.find(item => item.slug === route.params.slug);
  const orderable = data && product && !loading && !error && canRequestProduct(data, product);
  const image = product && imageUrl(product.image_url, product.image_api_url);
  return <Screen>
    <Heading>{product?.name || "Product details"}</Heading>
    {loading && !data && <Loading label="Loading product…" />}
    {!!error && <Card><Message error message={error} /><Action title="Try again" onPress={() => void load()} /></Card>}
    {data && !product && <Card>
      <Copy>This product is no longer in the catalogue.</Copy>
      <Action title="Browse products" onPress={() => navigation.navigate("Main", { screen: "Shop", params: defaultShopFilters })} />
    </Card>}
    {product && <>
      <Card>
        {image && <Image source={{ uri: image }} style={{ height: 220, width: "100%", borderRadius: 10 }} resizeMode="cover" />}
        <Copy>{product.description}</Copy>
        <Copy>Indicative price: {money(product.price_cents, product.currency)}</Copy>
        {orderable ? <>
          <Copy>Available to request through assisted ordering.</Copy>
          <Action title="Add to basket" onPress={() => { cart.add(product); navigation.navigate("Cart"); }} />
        </> : <Copy>{loading ? "Checking ordering availability…" : error ? "Ordering availability could not be checked." : "Ordering is currently unavailable for this product."}</Copy>}
      </Card>
      <ProductUpdates key={product.slug} product={product} />
      <PublishedDetails productId={product.id} />
    </>}
  </Screen>;
}

function ProductUpdates({ product }: { product: Product }) {
  const { user } = useSession();
  const [email, setEmail] = useState(user?.email || "");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function send() {
    if (active.current || status !== "idle") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFailure("Enter a valid email address.");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setFailure("");
    setStatus("sending");
    try {
      await request("/shop/restock-notifications", {
        method: "POST", signal: controller.signal,
        body: { email: email.trim(), productId: product.id, productSlug: product.slug, productName: product.name, language: "en" },
      });
      if (!controller.signal.aborted) setStatus("sent");
    } catch (e) {
      if (!controller.signal.aborted) { setFailure(err(e)); setStatus("idle"); }
    } finally {
      active.current = null;
    }
  }
  return <Card>
    <Heading>Availability update</Heading>
    {status === "sent" ? <Message message="Request received. If confirmation is needed, we’ll send an email link." /> : <>
      <Copy>Get a one-time email when this product is available. This does not place an order.</Copy>
      <Field label="Email address" value={email} onChangeText={value => { setEmail(value); setFailure(""); }}
        editable={status === "idle"} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
        returnKeyType="send" onSubmitEditing={() => void send()} />
      {!!failure && <Message error message={failure} />}
      <Action title={status === "sending" ? "Sending…" : "Request an update"} disabled={status === "sending"} onPress={() => void send()} />
    </>}
  </Card>;
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
