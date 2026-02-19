import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, CreditCard, ShieldCheck, Loader2, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { SHOP_CATEGORY_CONFIG, type ShopSegmentKey } from "@/lib/shopCategories";

type ProductCategory = "all" | "sports" | "crafts" | "food";
type PaymentMethod = "stripe" | "paypal" | "amazon_pay";

type ShopProduct = {
  id: number;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  stock_qty: number;
};

type CartItem = {
  productId: number;
  quantity: number;
};

const CART_STORAGE_KEY = "shop_cart_v1";

const FALLBACK_PRODUCTS: ShopProduct[] = [
  {
    id: 1,
    slug: "sables-rugby-home-kit",
    name: "Sables Rugby Home Kit",
    category: "sports",
    description: "Official Zimbabwe rugby jersey kit.",
    image_url: "/images/pages/shop/sports_rugby_jersey.jpg",
    price_cents: 6900,
    currency: "EUR",
    stock_qty: 18,
  },
  {
    id: 2,
    slug: "chevrons-world-cup-jersey",
    name: "Chevrons World Cup Jersey",
    category: "sports",
    description: "National cricket fan jersey.",
    image_url: "/images/pages/shop/sports_cricket_jersey.png",
    price_cents: 6400,
    currency: "EUR",
    stock_qty: 9,
  },
  {
    id: 3,
    slug: "warriors-football-kit",
    name: "Warriors Football Kit",
    category: "sports",
    description: "Zimbabwe football supporters kit.",
    image_url: "/images/pages/shop/sports_football_jersey.png",
    price_cents: 5900,
    currency: "EUR",
    stock_qty: 24,
  },
  {
    id: 4,
    slug: "shona-stone-sculpture",
    name: "Shona Stone Sculpture",
    category: "crafts",
    description: "Hand-carved premium stone sculpture.",
    image_url: "/images/pages/shop/crafts_stone_sculptures1.png",
    price_cents: 14900,
    currency: "EUR",
    stock_qty: 6,
  },
  {
    id: 5,
    slug: "binga-basket",
    name: "Binga Basket",
    category: "crafts",
    description: "Handwoven basket made by local artisans.",
    image_url: "/images/pages/shop/crafts_binga_baskets1.jpg",
    price_cents: 3900,
    currency: "EUR",
    stock_qty: 15,
  },
  {
    id: 6,
    slug: "beaded-jewelry-set",
    name: "Beaded Jewelry Set",
    category: "crafts",
    description: "Traditional beaded necklace and bracelet set.",
    image_url: "/images/pages/shop/crafts_beaded_jewelry1.jpg",
    price_cents: 2900,
    currency: "EUR",
    stock_qty: 20,
  },
  {
    id: 7,
    slug: "mazoe-variety-pack",
    name: "Mazoe Variety Pack",
    category: "food",
    description: "Classic Zimbabwe cordial selection.",
    image_url: "/images/pages/shop/food_mazoe.jpg",
    price_cents: 2200,
    currency: "EUR",
    stock_qty: 35,
  },
  {
    id: 8,
    slug: "cerevita-instant-cereal",
    name: "Cerevita Instant Cereal",
    category: "food",
    description: "Nutritious instant cereal favorite.",
    image_url: "/images/pages/shop/food_cerevita1.png",
    price_cents: 1900,
    currency: "EUR",
    stock_qty: 28,
  },
  {
    id: 9,
    slug: "kapenta-dried-fish",
    name: "Kapenta Dried Fish",
    category: "food",
    description: "Traditional dried kapenta, export packed.",
    image_url: "/images/pages/shop/food_kapenta1.jpg",
    price_cents: 3300,
    currency: "EUR",
    stock_qty: 14,
  },
  {
    id: 10,
    slug: "maputi-40g",
    name: "Maputi 40g",
    category: "food",
    description: "Traditional puffed-maize snack.",
    image_url: "/images/pages/shop/food_maputi.png",
    price_cents: 299,
    currency: "EUR",
    stock_qty: 40,
  },
];

function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        productId: Number(item?.productId),
        quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
      }))
      .filter((item) => Number.isFinite(item.productId) && item.productId > 0);
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures.
  }
}

function formatMoney(cents: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function normalizeWhatsAppPhone(raw: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits || "263780000000";
}

export default function ShopProducts() {
  const { t } = useTranslation();
  const [location, setLocation] = useLocation();
  const { queryCategory, querySegment } = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const category = params.get("category") ?? "";
    const segment = String(params.get("segment") ?? "").trim().toLowerCase();
    const normalizedCategory = ["all", "sports", "crafts", "food"].includes(category) ? (category as ProductCategory) : "all";
    return { queryCategory: normalizedCategory, querySegment: segment };
  }, [location]);

  const [category, setCategory] = useState<ProductCategory>(queryCategory);
  const [segment, setSegment] = useState(querySegment);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [allProducts, setAllProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingCountry, setShippingCountry] = useState(t("shop.products.default_country") || "Germany");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("stripe");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    setCategory(queryCategory);
    setSegment(querySegment);
  }, [queryCategory, querySegment]);

  useEffect(() => {
    setCart(readCart());
  }, []);

  useEffect(() => {
    writeCart(cart);
  }, [cart]);

  useEffect(() => {
    let cancelled = false;
    const loadAllProducts = async () => {
      setLoading(true);
      try {
        const allRes = await api.get("/shop/products");
        const products = Array.isArray(allRes.data?.products) ? allRes.data.products : [];
        if (!cancelled) {
          setAllProducts(products.length > 0 ? products : FALLBACK_PRODUCTS);
        }
      } catch {
        if (!cancelled) {
          setAllProducts(FALLBACK_PRODUCTS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAllProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const matchesSegment = (product: ShopProduct, activeSegment: string) => {
    if (!activeSegment) return true;
    const haystack = `${product.name} ${product.description}`.toLowerCase();
    const segmentConfig = SHOP_CATEGORY_CONFIG.find((item) => item.key === activeSegment);
    const keywords = segmentConfig?.keywords ?? [activeSegment];
    return keywords.some((keyword) => haystack.includes(keyword));
  };

  useEffect(() => {
    const filtered = allProducts.filter((product) => {
      const normalized = String(product.category ?? "").toLowerCase();
      const categoryMatch = category === "all" ? true : normalized === category;
      return categoryMatch && matchesSegment(product, segment);
    });
    setProducts(filtered);
  }, [allProducts, category, segment]);

  const availableSegments = useMemo(
    () => SHOP_CATEGORY_CONFIG.filter((item) => category === "all" || item.baseCategory === category),
    [category]
  );

  const productsById = useMemo(() => new Map(allProducts.map((product) => [product.id, product])), [allProducts]);

  const cartRows = useMemo(() => {
    return cart
      .map((item) => {
        const product = productsById.get(item.productId);
        if (!product) return null;
        return { item, product, lineTotal: product.price_cents * item.quantity };
      })
      .filter(Boolean) as Array<{ item: CartItem; product: ShopProduct; lineTotal: number }>;
  }, [cart, productsById]);

  const subtotalCents = cartRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const shippingCents = subtotalCents >= 7500 ? 0 : subtotalCents > 0 ? 1200 : 0;
  const totalCents = subtotalCents + shippingCents;
  const whatsappNumber = normalizeWhatsAppPhone(String(import.meta.env.VITE_WHATSAPP_ORDER_NUMBER ?? ""));

  const whatsappOrderHref = useMemo(() => {
    if (cartRows.length === 0) return "";
    const lines = [
      t("shop.products.whatsapp.intro") || "Hello, I want to place an order from the Zimbabwe Shop.",
      "",
      t("shop.products.whatsapp.order_items") || "Order Items:",
      ...cartRows.map(
        (row) =>
          `- ${row.product.name} x${row.item.quantity} (${formatMoney(
            row.product.price_cents,
            row.product.currency
          )} ${t("shop.products.whatsapp.each") || "each"})`
      ),
      "",
      `${t("shop.products.totals.subtotal") || "Subtotal"}: ${formatMoney(subtotalCents)}`,
      `${t("shop.products.totals.shipping") || "Shipping"}: ${formatMoney(shippingCents)}`,
      `${t("shop.products.totals.total") || "Total"}: ${formatMoney(totalCents)}`,
      "",
      t("shop.products.whatsapp.customer_details") || "Customer Details:",
      `${t("shop.products.fields.name") || "Name"}: ${customerName || "-"}`,
      `${t("shop.products.fields.email") || "Email"}: ${customerEmail || "-"}`,
      `${t("shop.products.fields.country") || "Country"}: ${shippingCountry || "-"}`,
      `${t("shop.products.fields.city") || "City"}: ${shippingCity || "-"}`,
      `${t("shop.products.fields.address") || "Address"}: ${shippingAddress || "-"}`,
      "",
      t("shop.products.whatsapp.outro") || "Please confirm availability and payment instructions.",
    ];
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [
    cartRows,
    subtotalCents,
    shippingCents,
    totalCents,
    customerName,
    customerEmail,
    shippingCountry,
    shippingCity,
    shippingAddress,
    whatsappNumber,
  ]);

  const addToCart = (product: ShopProduct) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, Math.max(1, product.stock_qty)) }
            : item
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  };

  const updateQty = (productId: number, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((item) => item.productId !== productId);
      return prev.map((item) => (item.productId === productId ? { ...item, quantity: qty } : item));
    });
  };

  const placeOrder = async () => {
    setCheckoutError("");
    if (cartRows.length === 0) {
      setCheckoutError(t("shop.products.errors.empty_cart") || "Your cart is empty.");
      return;
    }
    if (!customerName || !customerEmail || !shippingCountry || !shippingCity || !shippingAddress) {
      setCheckoutError(t("shop.products.errors.complete_fields") || "Please complete all checkout fields.");
      return;
    }
    setPlacingOrder(true);
    try {
      const payload = {
        customerName,
        customerEmail,
        shippingCountry,
        shippingCity,
        shippingAddress,
        paymentMethod,
        items: cartRows.map((row) => ({
          productId: row.product.id,
          quantity: row.item.quantity,
        })),
      };
      const { data } = await api.post("/shop/orders", payload);
      setOrder(data?.order ?? null);
      setCart([]);
    } catch (error: any) {
      setCheckoutError(
        String(error?.response?.data?.message ?? (t("shop.products.errors.unable_place_order") || "Unable to place order."))
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const confirmPayment = async () => {
    if (!order?.orderRef) return;
    setConfirmingPayment(true);
    setCheckoutError("");
    try {
      const { data } = await api.post(`/shop/orders/${order.orderRef}/confirm-payment`, {
        paymentReference: `${paymentMethod.toUpperCase()}-${Date.now()}`,
      });
      setOrder((prev: any) => ({
        ...(prev ?? {}),
        ...(data?.order ?? {}),
        status: data?.order?.status ?? "paid",
      }));
    } catch (error: any) {
      setCheckoutError(
        String(error?.response?.data?.message ?? (t("shop.products.errors.unable_confirm_payment") || "Unable to confirm payment."))
      );
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <Layout>
      <section className="pt-28 pb-10 bg-slate-950 min-h-screen">
        <div className="container px-6 mx-auto">
          <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden lg:overflow-visible border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]">
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="mb-8 flex items-center justify-between gap-3">
                <div>
                  <h1 className="section-title-compact text-left">{t("shop.products.title") || "Shop Products"}</h1>
                  <p className="text-sm text-white/75 mt-3 max-w-2xl">
                    {t("shop.products.subtitle") ||
                      "End-to-end checkout with guest purchase enabled. Choose Stripe, PayPal, or Amazon Pay."}
                  </p>
                </div>
                <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white hover:text-black rounded-full">
                  <Link href="/shop">{t("shop.products.back_to_shop") || "Back to Shop"}</Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { key: "all" as ProductCategory, label: t("shop.products.filters.all") || "All" },
                      { key: "sports" as ProductCategory, label: t("shop.products.filters.sports") || "Sports" },
                      { key: "crafts" as ProductCategory, label: t("shop.products.filters.crafts") || "Arts & Crafts" },
                      { key: "food" as ProductCategory, label: t("shop.products.filters.food") || "Food & Nostalgia" },
                    ].map((tab) => (
                      <Button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setCategory(tab.key);
                          setSegment("");
                          setLocation(`/shop/products?category=${tab.key}`);
                        }}
                        className={`rounded-full px-5 py-2 h-auto text-[10px] font-black uppercase tracking-[0.2em] ${
                          category === tab.key
                            ? "bg-zim-gold text-black hover:bg-zim-gold/90"
                            : "bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black"
                        }`}
                      >
                        {tab.label}
                      </Button>
                    ))}

                    <div className="relative min-w-[190px]">
                      <select
                        value={segment}
                        onChange={(event) => {
                          const nextSegment = event.target.value;
                          setSegment(nextSegment);
                          const query = nextSegment
                            ? `/shop/products?category=${category}&segment=${nextSegment}`
                            : `/shop/products?category=${category}`;
                          setLocation(query);
                        }}
                        className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white outline-none focus:border-zim-gold"
                      >
                        <option value="" className="bg-slate-900 text-white">
                          {t("shop.products.filters.select_segment") || "Select Segment"}
                        </option>
                        {availableSegments.map((item) => (
                          <option key={item.key} value={item.key} className="bg-slate-900 text-white">
                            {t(`shop.categories.${item.key}.title`) || item.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 flex items-center gap-3 text-white/80">
                      <Loader2 className="h-4 w-4 animate-spin" /> {t("shop.products.loading") || "Loading products..."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {products.length === 0 ? (
                        <div className="md:col-span-2 rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
                          <p className="text-white/70 text-sm">
                            {t("shop.products.empty_state") || "No products available in this category yet."}
                          </p>
                        </div>
                      ) : null}
                      {products.map((product) => (
                        <div key={product.id} className="rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02]">
                          <div className="h-48 overflow-hidden relative bg-slate-900">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            <span
                              className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                product.stock_qty > 0
                                  ? "bg-emerald-400/15 text-emerald-300 border-emerald-300/30"
                                  : "bg-rose-400/15 text-rose-300 border-rose-300/30"
                              }`}
                            >
                              {product.stock_qty > 0
                                ? t("shop.products.stock.in") || "In Stock"
                                : t("shop.products.stock.out") || "Out of Stock"}
                            </span>
                          </div>
                          <div className="p-6">
                            <h3 className="text-lg font-black text-white tracking-tight">{product.name}</h3>
                            <p className="text-sm text-white/70 mt-2">{product.description}</p>
                            <div className="mt-4 flex items-center justify-between">
                              <p className="text-zim-gold font-black">{formatMoney(product.price_cents, product.currency)}</p>
                              <Button
                                type="button"
                                disabled={product.stock_qty <= 0}
                                onClick={() => addToCart(product)}
                                className="rounded-full px-5 py-2 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 disabled:opacity-40 font-black text-[10px] uppercase tracking-[0.2em]"
                              >
                                {product.stock_qty > 0
                                  ? t("shop.products.actions.buy") || "Buy"
                                  : t("shop.products.stock.out") || "Out of Stock"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start lg:h-fit">
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-3.5 md:p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShoppingCart className="h-3.5 w-3.5 text-zim-gold" />
                      <h2 className="section-title-compact">{t("shop.products.cart.title") || "Cart & Checkout"}</h2>
                    </div>

                    {cartRows.length === 0 ? (
                      <p className="text-[11px] text-white/60">
                        {t("shop.products.cart.empty") || "No items yet. Add products to begin checkout."}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {cartRows.map((row) => (
                          <div key={row.product.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                            <p className="text-[11px] font-bold text-white truncate">{row.product.name}</p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, row.product.stock_qty)}
                                value={row.item.quantity}
                                onChange={(event) => updateQty(row.product.id, Number(event.target.value))}
                                className="w-12 rounded-md bg-white/[0.04] border border-white/20 px-1.5 py-0.5 text-white text-[10px]"
                              />
                              <p className="text-[11px] text-zim-gold font-black">{formatMoney(row.lineTotal, row.product.currency)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2.5 border-t border-white/10 pt-2.5 text-[10px] text-white/75 space-y-1">
                      <div className="flex justify-between">
                        <span>{t("shop.products.totals.subtotal") || "Subtotal"}</span>
                        <span>{formatMoney(subtotalCents)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t("shop.products.totals.shipping") || "Shipping"}</span>
                        <span>{formatMoney(shippingCents)}</span>
                      </div>
                      <div className="flex justify-between text-white font-black text-[11px]">
                        <span>{t("shop.products.totals.total") || "Total"}</span>
                        <span>{formatMoney(totalCents)}</span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-white/10 pt-2.5">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zim-gold mb-1.5">
                        {t("shop.products.guest_checkout.title") || "Guest Checkout"}
                      </h3>
                      <div className="space-y-1.5">
                      <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t("shop.products.fields.full_name") || "Full Name"} className="w-full rounded-xl bg-white/[0.04] border border-white/20 px-3 py-1.5 text-xs text-white placeholder:text-white/40" />
                      <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder={t("shop.products.fields.email_address") || "Email Address"} className="w-full rounded-xl bg-white/[0.04] border border-white/20 px-3 py-1.5 text-xs text-white placeholder:text-white/40" />
                      <input value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} placeholder={t("shop.products.fields.country") || "Country"} className="w-full rounded-xl bg-white/[0.04] border border-white/20 px-3 py-1.5 text-xs text-white placeholder:text-white/40" />
                      <input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder={t("shop.products.fields.city") || "City"} className="w-full rounded-xl bg-white/[0.04] border border-white/20 px-3 py-1.5 text-xs text-white placeholder:text-white/40" />
                      <input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder={t("shop.products.fields.shipping_address") || "Shipping Address"} className="w-full rounded-xl bg-white/[0.04] border border-white/20 px-3 py-1.5 text-xs text-white placeholder:text-white/40" />
                      </div>

                      <div className="mt-2.5 space-y-1">
                      {[
                        { value: "stripe", label: t("shop.products.payment_methods.stripe") || "Stripe (Credit Card)" },
                        { value: "paypal", label: t("shop.products.payment_methods.paypal") || "PayPal" },
                        { value: "amazon_pay", label: t("shop.products.payment_methods.amazon_pay") || "Amazon Pay" },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-1 text-[11px] text-white/80">
                          <input
                            type="radio"
                            checked={paymentMethod === option.value}
                            onChange={() => setPaymentMethod(option.value as PaymentMethod)}
                          />
                          {option.label}
                        </label>
                      ))}
                      </div>

                      {checkoutError ? <p className="mt-2 text-[11px] text-rose-300">{checkoutError}</p> : null}

                      {!order ? (
                        <>
                          <Button
                            type="button"
                            onClick={placeOrder}
                            disabled={placingOrder}
                            className="mt-2.5 w-full rounded-full px-4 py-1.5 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[9px] uppercase tracking-[0.14em]"
                          >
                            {placingOrder
                              ? t("shop.products.actions.creating_order") || "Creating Order..."
                              : t("shop.products.actions.place_order") || "Place Order"}
                          </Button>
                          <Button
                            asChild
                            type="button"
                            disabled={!whatsappOrderHref}
                            variant="outline"
                            className="mt-1.5 w-full rounded-full px-4 py-1.5 h-auto border-[#25D366] bg-[#25D366] text-white hover:bg-[#1ebe5d] hover:border-[#1ebe5d] disabled:opacity-40 font-black text-[9px] uppercase tracking-[0.14em]"
                          >
                            <a href={whatsappOrderHref || "#"} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                              {t("shop.products.actions.order_whatsapp") || "Order on WhatsApp"}
                            </a>
                          </Button>
                        </>
                      ) : (
                        <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
                          <p className="text-xs text-white">
                            {t("shop.products.order.reference") || "Order reference"}: <span className="font-black">{order.orderRef ?? order.order_ref}</span>
                          </p>
                          <p className="text-[11px] text-white/70 mt-1">
                            {t("shop.products.order.status") || "Status"}: {String(order.status ?? "").toUpperCase()}
                          </p>
                          <Button
                            type="button"
                            onClick={confirmPayment}
                            disabled={confirmingPayment || String(order.status) === "paid"}
                            className="mt-2.5 w-full rounded-full px-5 py-1.5 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 disabled:opacity-50 font-black text-[9px] uppercase tracking-[0.14em]"
                          >
                            {String(order.status) === "paid"
                              ? t("shop.products.actions.payment_confirmed") || "Payment Confirmed"
                              : confirmingPayment
                                ? t("shop.products.actions.processing") || "Processing..."
                                : `${t("shop.products.actions.pay_with") || "Pay with"} ${
                                    paymentMethod === "amazon_pay"
                                      ? t("shop.products.payment_methods.amazon_pay_short") || "Amazon Pay"
                                      : paymentMethod === "paypal"
                                        ? t("shop.products.payment_methods.paypal_short") || "PayPal"
                                        : t("shop.products.payment_methods.stripe_short") || "Stripe"
                                  }`}
                          </Button>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/60">
                        <ShieldCheck className="h-3.5 w-3.5 text-zim-gold" />
                        <span>{t("shop.products.notes.guest_checkout") || "Guest checkout enabled: no login required."}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/60">
                        <CreditCard className="h-3.5 w-3.5 text-zim-gold" />
                        <span>{t("shop.products.notes.supported_methods") || "Supported methods: Stripe, PayPal, Amazon Pay."}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
