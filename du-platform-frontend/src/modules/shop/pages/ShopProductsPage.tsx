import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  ShieldCheck,
  Loader2,
  MessageCircle,
  Mail,
  Package,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { getPublicShopSeedProducts } from "@shared/shopCatalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveCurrentUserBootstrap } from "@/lib/authSessionBootstrap";
import { api, type AuthUser } from "@/lib/api";
import { SHOP_CATEGORY_CONFIG } from "@/lib/shopCategories";

type ProductCategory = "all" | "sports" | "crafts" | "food" | "beverage";
type PaymentMethod = "manual_assisted" | "dummy_gateway";
type DeliverySpeed = "normal" | "express";

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

type PlacedOrder = {
  orderRef: string;
  status: string;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  deliverySpeed: DeliverySpeed;
  manageToken: string;
};

type CartItem = {
  productId: number;
  quantity: number;
};

type QueryState = {
  queryCategory: ProductCategory;
  querySegment: string;
  queryAddProductSlug: string;
};

const CART_STORAGE_KEY = "shop_cart_v1";

const FALLBACK_PRODUCTS: ShopProduct[] = getPublicShopSeedProducts();

function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(item => ({
        productId: Number(item?.productId),
        quantity: Math.max(1, Math.floor(Number(item?.quantity) || 1)),
      }))
      .filter(item => Number.isFinite(item.productId) && item.productId > 0);
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

function normalizeProductCategory(raw: unknown): ProductCategory {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (value === "sports" || value === "crafts" || value === "food")
    return value;
  // Treat beverage-like categories as food for UI filters.
  if (
    value === "beverage" ||
    value === "beverages" ||
    value === "drinks" ||
    value === "drink"
  )
    return "food";
  return "all";
}

export default function ShopProducts() {
  const { t } = useTranslation();
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const location = `${pathname}${search ? `?${search}` : ""}`;
  const processedAddToCartQueryRef = useRef<string | null>(null);
  const cartSectionRef = useRef<HTMLDivElement | null>(null);
  const { queryCategory, querySegment, queryAddProductSlug } =
    useMemo<QueryState>(() => {
      const params = new URLSearchParams(search);
      const category = params.get("category") ?? "";
      const segment = String(params.get("segment") ?? "")
        .trim()
        .toLowerCase();
      const add = String(params.get("add") ?? "")
        .trim()
        .toLowerCase();
      const normalizedCategory = ["all", "sports", "crafts", "food"].includes(
        category
      )
        ? (category as ProductCategory)
        : "all";
      return {
        queryCategory: normalizedCategory,
        querySegment: segment,
        queryAddProductSlug: add,
      };
    }, [search]);

  const [category, setCategory] = useState<ProductCategory>(queryCategory);
  const [segment, setSegment] = useState(querySegment);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [allProducts, setAllProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingCountry, setShippingCountry] = useState(
    t("shop.products.default_country") || "Germany"
  );
  const [shippingCity, setShippingCity] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("normal");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("manual_assisted");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [notifyState, setNotifyState] = useState<
    Record<number, "idle" | "saving" | "saved">
  >({});
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyDialogProduct, setNotifyDialogProduct] =
    useState<ShopProduct | null>(null);
  const [notifyEmailInput, setNotifyEmailInput] = useState("");
  const [notifyEmailError, setNotifyEmailError] = useState("");
  const [mobileView, setMobileView] = useState<"products" | "checkout">(
    "products"
  );
  const supportsDummyGateway =
    import.meta.env.DEV || import.meta.env.MODE === "test";

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
    if (!queryAddProductSlug || allProducts.length === 0) return;
    if (processedAddToCartQueryRef.current === location) return;

    const targetProduct = allProducts.find(
      product =>
        String(product.slug ?? "")
          .trim()
          .toLowerCase() === queryAddProductSlug
    );
    if (!targetProduct) return;

    processedAddToCartQueryRef.current = location;
    if (targetProduct.stock_qty <= 0) {
      toast.error(
        t("shop.products.stock.out_message") ||
          "This item is currently out of stock."
      );
    } else {
      setCart(prev => {
        const existing = prev.find(item => item.productId === targetProduct.id);
        if (existing) {
          return prev.map(item =>
            item.productId === targetProduct.id
              ? {
                  ...item,
                  quantity: Math.min(
                    item.quantity + 1,
                    Math.max(1, targetProduct.stock_qty)
                  ),
                }
              : item
          );
        }
        return [...prev, { productId: targetProduct.id, quantity: 1 }];
      });
    }
    const nextParams = new URLSearchParams();
    if (queryCategory) nextParams.set("category", queryCategory);
    if (querySegment) nextParams.set("segment", querySegment);
    const nextHref = nextParams.toString()
      ? `/shop/products?${nextParams.toString()}`
      : "/shop/products";
    setLocation(nextHref, { replace: true });
  }, [
    allProducts,
    location,
    queryAddProductSlug,
    queryCategory,
    querySegment,
    setLocation,
  ]);

  useEffect(() => {
    let mounted = true;
    const loadSessionUser = async () => {
      try {
        const sessionUser = await resolveCurrentUserBootstrap();
        if (!mounted) return;
        setAuthUser(sessionUser);
        if (sessionUser) {
          setCustomerName(prev => prev || sessionUser.fullName || "");
          setCustomerEmail(prev => prev || sessionUser.email || "");
        }
      } catch {
        if (mounted) setAuthUser(null);
      }
    };

    loadSessionUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAllProducts = async () => {
      setLoading(true);
      try {
        const allRes = await api.get("/shop/products");
        const products = Array.isArray(allRes.data?.products)
          ? allRes.data.products
          : [];
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

  useEffect(() => {
    if (!supportsDummyGateway && paymentMethod === "dummy_gateway") {
      setPaymentMethod("manual_assisted");
    }
  }, [paymentMethod, supportsDummyGateway]);

  const matchesSegment = (product: ShopProduct, activeSegment: string) => {
    if (!activeSegment) return true;
    const haystack = `${product.name} ${product.description}`.toLowerCase();
    const segmentConfig = SHOP_CATEGORY_CONFIG.find(
      item => item.key === activeSegment
    );
    const keywords = segmentConfig?.keywords ?? [activeSegment];
    return keywords.some(keyword => haystack.includes(keyword));
  };

  useEffect(() => {
    const filtered = allProducts.filter(product => {
      const normalized = normalizeProductCategory(product.category);
      const categoryMatch = category === "all" ? true : normalized === category;
      return categoryMatch && matchesSegment(product, segment);
    });
    setProducts(filtered);
  }, [allProducts, category, segment]);

  const availableSegments = useMemo(
    () =>
      SHOP_CATEGORY_CONFIG.filter(
        item => category === "all" || item.baseCategory === category
      ),
    [category]
  );

  const productsById = useMemo(
    () => new Map(allProducts.map(product => [product.id, product])),
    [allProducts]
  );

  const cartRows = useMemo(() => {
    return cart
      .map(item => {
        const product = productsById.get(item.productId);
        if (!product) return null;
        return {
          item,
          product,
          lineTotal: product.price_cents * item.quantity,
        };
      })
      .filter(Boolean) as Array<{
      item: CartItem;
      product: ShopProduct;
      lineTotal: number;
    }>;
  }, [cart, productsById]);

  const getLocalizedProductDescription = (product: ShopProduct) =>
    t(`shop.products.descriptions.${product.slug}`) || product.description;

  const subtotalCents = cartRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const baseShippingCents =
    subtotalCents >= 7500 ? 0 : subtotalCents > 0 ? 1200 : 0;
  const deliverySurchargeCents =
    subtotalCents > 0 && deliverySpeed === "express" ? 800 : 0;
  const shippingCents = baseShippingCents + deliverySurchargeCents;
  const totalCents = subtotalCents + shippingCents;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const whatsappNumber = normalizeWhatsAppPhone(
    String(import.meta.env.VITE_WHATSAPP_ORDER_NUMBER ?? "")
  );
  const isAuthenticated = Boolean(authUser);
  const profileName = String(authUser?.fullName ?? "").trim();
  const profileEmail = String(authUser?.email ?? "").trim();
  const effectiveCustomerName = String(customerName || profileName).trim();
  const effectiveCustomerEmail = String(customerEmail || profileEmail).trim();
  const showCustomerIdentityInputs =
    !isAuthenticated || !effectiveCustomerName || !effectiveCustomerEmail;

  const whatsappOrderHref = useMemo(() => {
    if (cartRows.length === 0) return "";
    const lines = [
      t("shop.products.whatsapp.intro") ||
        "Hello, I want to place an order from the Zimbabwe Shop.",
      "",
      t("shop.products.whatsapp.order_items") || "Order Items:",
      ...cartRows.map(
        row =>
          `- ${row.product.name} x${row.item.quantity} (${formatMoney(
            row.product.price_cents,
            row.product.currency
          )} ${t("shop.products.whatsapp.each") || "each"})`
      ),
      "",
      `${t("shop.products.totals.subtotal") || "Subtotal"}: ${formatMoney(subtotalCents)}`,
      `${t("shop.products.totals.shipping") || "Shipping"}: ${formatMoney(shippingCents)}`,
      `${t("shop.products.totals.total") || "Total"}: ${formatMoney(totalCents)}`,
      `${t("shop.products.delivery_speed.label") || "Send speed"}: ${
        deliverySpeed === "express"
          ? t("shop.products.delivery_speed.express") || "Express Send"
          : t("shop.products.delivery_speed.normal") || "Normal Send"
      }`,
      "",
      t("shop.products.whatsapp.customer_details") || "Customer Details:",
      `${t("shop.products.fields.name") || "Name"}: ${effectiveCustomerName || "-"}`,
      `${t("shop.products.fields.email") || "Email"}: ${effectiveCustomerEmail || "-"}`,
      `${t("shop.products.fields.country") || "Country"}: ${shippingCountry || "-"}`,
      `${t("shop.products.fields.city") || "City"}: ${shippingCity || "-"}`,
      `${t("shop.products.fields.address") || "Address"}: ${shippingAddress || "-"}`,
      "",
      t("shop.products.whatsapp.outro") ||
        "Please confirm availability and payment instructions.",
    ];
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [
    cartRows,
    subtotalCents,
    shippingCents,
    totalCents,
    effectiveCustomerName,
    effectiveCustomerEmail,
    shippingCountry,
    shippingCity,
    shippingAddress,
    deliverySpeed,
    whatsappNumber,
  ]);

  const addToCart = (product: ShopProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  Math.max(1, product.stock_qty)
                ),
              }
            : item
        );
      }
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  };

  const addToCartAndGoToCart = (product: ShopProduct) => {
    addToCart(product);
    toast.success(`${product.name} added to cart`, { duration: 2000 });

    if (typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      cartSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      const removedProduct = productsById.get(productId);
      setCart(prev => prev.filter(item => item.productId !== productId));
      if (removedProduct) {
        toast(`${removedProduct.name} removed from cart`, { duration: 2000 });
      }
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.productId === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const openNotifyDialog = (product: ShopProduct) => {
    if (notifyState[product.id] === "saving") return;
    setNotifyDialogProduct(product);
    setNotifyEmailInput(String(customerEmail ?? "").trim());
    setNotifyEmailError("");
  };

  const submitNotifyRequest = async () => {
    if (!notifyDialogProduct) return;

    const email = String(notifyEmailInput ?? "")
      .trim()
      .toLowerCase();
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail) {
      setNotifyEmailError(
        t("shop.products.notify.invalid_email") ||
          "Please enter a valid email address."
      );
      return;
    }

    setNotifyState(prev => ({ ...prev, [notifyDialogProduct.id]: "saving" }));
    setNotifyEmailError("");
    setNotifyMessage("");
    try {
      const { data } = await api.post("/shop/restock-notifications", {
        productId: notifyDialogProduct.id,
        productSlug: notifyDialogProduct.slug,
        productName: notifyDialogProduct.name,
        email,
      });
      const message = String(
        data?.message ??
          (t("shop.products.notify.saved") ||
            "We'll notify you when this product is available.")
      );
      setNotifyMessage(message);
      setCustomerEmail(email);
      setNotifyState(prev => ({ ...prev, [notifyDialogProduct.id]: "saved" }));
      setNotifyDialogProduct(null);
      toast.success("Notification saved", {
        description: `We'll email you when ${notifyDialogProduct.name} is back in stock.`,
        duration: 4000,
      });
    } catch (error: any) {
      setNotifyEmailError(
        String(
          error?.response?.data?.message ??
            (t("shop.products.notify.failed") ||
              "Unable to save notify request right now.")
        )
      );
      setNotifyState(prev => ({ ...prev, [notifyDialogProduct.id]: "idle" }));
    }
  };

  const placeOrder = async () => {
    setCheckoutError("");
    if (cartRows.length === 0) {
      setCheckoutError(
        t("shop.products.errors.empty_cart") || "Your cart is empty."
      );
      return;
    }
    if (
      !effectiveCustomerName ||
      !effectiveCustomerEmail ||
      !shippingCountry ||
      !shippingCity ||
      !shippingAddress
    ) {
      setCheckoutError(
        t("shop.products.errors.complete_fields") ||
          "Please complete all checkout fields."
      );
      return;
    }
    setPlacingOrder(true);
    try {
      const payload = {
        customerName: effectiveCustomerName,
        customerEmail: effectiveCustomerEmail,
        shippingCountry,
        shippingCity,
        shippingAddress,
        deliverySpeed,
        paymentMethod,
        items: cartRows.map(row => ({
          productId: row.product.id,
          quantity: row.item.quantity,
        })),
      };
      const { data } = await api.post("/shop/orders", payload);
      setOrder((data?.order ?? null) as PlacedOrder | null);
      setCart([]);
    } catch (error: any) {
      setCheckoutError(
        String(
          error?.response?.data?.message ??
            (t("shop.products.errors.unable_place_order") ||
              "Unable to place order.")
        )
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const confirmPayment = async () => {
    if (!order?.orderRef || order.paymentMethod !== "dummy_gateway") return;
    setConfirmingPayment(true);
    setCheckoutError("");
    try {
      const { data } = await api.post(
        `/shop/orders/${order.orderRef}/confirm-payment`,
        {
          manageToken: order.manageToken,
          paymentReference: `${paymentMethod.toUpperCase()}-${crypto.randomUUID()}`,
        }
      );
      setOrder(prev => ({
        ...(prev ?? ({} as PlacedOrder)),
        ...((data?.order ?? {}) as Partial<PlacedOrder>),
      }));
    } catch (error: any) {
      setCheckoutError(
        String(
          error?.response?.data?.message ??
            (t("shop.products.errors.unable_confirm_payment") ||
              "Unable to confirm payment.")
        )
      );
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <Layout>
      <section className="pt-28 pb-24 lg:pb-10 bg-slate-950 min-h-screen">
        <div className="container px-6 mx-auto">
          <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden lg:overflow-visible border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]">
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="mb-8 flex items-center justify-between gap-3">
                <div>
                  <h1 className="section-title-compact text-left">
                    {t("shop.products.title") || "Shop Products"}
                  </h1>
                  <p className="text-sm text-white/75 mt-3 max-w-2xl">
                    {t("shop.products.subtitle") ||
                      "End-to-end checkout with secure payment options and clear delivery selection."}
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("shop.products.back_to_shop") || "Back to Shop"}
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div
                  className={`lg:col-span-8 space-y-6${mobileView === "checkout" ? " hidden lg:block" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="hidden sm:flex flex-wrap gap-2">
                      {[
                        {
                          key: "all" as ProductCategory,
                          label: t("shop.products.filters.all") || "All",
                        },
                        {
                          key: "sports" as ProductCategory,
                          label: t("shop.products.filters.sports") || "Sports",
                        },
                        {
                          key: "crafts" as ProductCategory,
                          label:
                            t("shop.products.filters.crafts") ||
                            "Arts & Crafts",
                        },
                        {
                          key: "food" as ProductCategory,
                          label:
                            t("shop.products.filters.food") ||
                            "Food & Nostalgia",
                        },
                      ].map(tab => (
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
                    </div>

                    <div className="relative min-w-[190px]">
                      <select
                        value={segment}
                        onChange={event => {
                          const nextSegment = event.target.value;
                          setSegment(nextSegment);
                          const query = nextSegment
                            ? `/shop/products?category=${category}&segment=${nextSegment}`
                            : `/shop/products?category=${category}`;
                          setLocation(query);
                        }}
                        className="w-full rounded-full border border-zim-gold bg-zim-gold px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-black outline-none focus:border-zim-gold sm:border-white/20 sm:bg-white/10 sm:text-white"
                      >
                        <option value="" className="bg-slate-900 text-white">
                          {t("shop.products.filters.select_segment") ||
                            "Select Segment"}
                        </option>
                        {availableSegments.map(item => (
                          <option
                            key={item.key}
                            value={item.key}
                            className="bg-slate-900 text-white"
                          >
                            {t(`shop.categories.${item.key}.title`) ||
                              item.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] animate-pulse"
                        >
                          <div className="h-48 bg-white/[0.05]" />
                          <div className="p-6 space-y-3">
                            <div className="h-4 bg-white/[0.05] rounded-full w-3/4" />
                            <div className="h-3 bg-white/[0.05] rounded-full w-full" />
                            <div className="h-3 bg-white/[0.05] rounded-full w-2/3" />
                            <div className="flex justify-between items-center mt-4">
                              <div className="h-5 bg-white/[0.05] rounded-full w-20" />
                              <div className="h-10 w-10 bg-white/[0.05] rounded-full" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {products.length === 0 ? (
                        <div className="md:col-span-2 rounded-[2rem] border border-white/10 bg-white/[0.02] p-10 text-center space-y-4">
                          <div className="w-16 h-16 mx-auto rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                            <Package className="h-7 w-7 text-white/25" />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">
                              {t("shop.products.empty_state") ||
                                "No products found"}
                            </p>
                            <p className="text-white/45 text-xs mt-1">
                              {category !== "all" || segment
                                ? "Try adjusting your filters to find what you're looking for."
                                : "No products available in this category yet."}
                            </p>
                          </div>
                          {(category !== "all" || segment) && (
                            <Button
                              type="button"
                              onClick={() => {
                                setCategory("all");
                                setSegment("");
                                setLocation("/shop/products?category=all");
                              }}
                              className="rounded-full px-5 py-2 h-auto bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                            >
                              Clear Filters
                            </Button>
                          )}
                        </div>
                      ) : null}
                      {products.map(product => (
                        <div
                          key={product.id}
                          data-shop-product-card={product.slug}
                          data-stock-state={
                            product.stock_qty <= 0 ? "out" : "in"
                          }
                          className="rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02]"
                        >
                          <div className="h-48 overflow-hidden relative bg-slate-900">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                              onError={event => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src =
                                  "/images/pages/shop/zimbabwe_shop_hero.webp";
                              }}
                            />
                            {product.stock_qty <= 0 ? (
                              <span className="absolute z-20 top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-200/60 bg-rose-600/80 text-white shadow-[0_8px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                                {t("shop.products.stock.out") || "Out of Stock"}
                              </span>
                            ) : (
                              <span className="absolute z-20 top-4 left-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200/60 bg-emerald-600/80 text-white shadow-[0_8px_20px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                                {t("shop.products.stock.in") || "In Stock"}
                              </span>
                            )}
                          </div>
                          <div className="p-6">
                            <h3 className="text-lg font-black text-white tracking-tight">
                              {product.name}
                            </h3>
                            <p className="text-sm text-white/70 mt-2">
                              {getLocalizedProductDescription(product)}
                            </p>
                            {product.stock_qty <= 0 ? (
                              <p className="mt-3 text-[11px] font-semibold text-rose-200">
                                {t("shop.products.stock.out_message") ||
                                  "We are sorry. The item is currently out of stock"}
                              </p>
                            ) : null}
                            <div className="mt-4 flex items-center justify-between">
                              <p className="text-zim-gold font-black">
                                {formatMoney(
                                  product.price_cents,
                                  product.currency
                                )}
                              </p>
                              {product.stock_qty <= 0 ? (
                                <Button
                                  type="button"
                                  disabled={
                                    notifyState[product.id] === "saving"
                                  }
                                  onClick={() => openNotifyDialog(product)}
                                  className="rounded-full px-3 py-1 h-auto bg-zim-gold text-black hover:bg-white hover:text-black hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(212,175,55,0.35)] active:translate-y-0 disabled:opacity-40 font-black text-[8px] uppercase tracking-[0.1em] transition-all duration-200"
                                >
                                  {notifyState[product.id] === "saving"
                                    ? t("shop.products.notify.saving") ||
                                      "Saving..."
                                    : notifyState[product.id] === "saved"
                                      ? t("shop.products.notify.saved_short") ||
                                        "Notify Saved"
                                      : t("shop.products.notify.cta") ||
                                        "Notify Me"}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  onClick={() => addToCartAndGoToCart(product)}
                                  aria-label={`${t("shop.products.actions.add_to_cart") || "Add to Cart"}: ${product.name}`}
                                  title={
                                    t("shop.products.actions.add_to_cart") ||
                                    "Add to Cart"
                                  }
                                  className="h-10 w-10 rounded-full bg-zim-gold p-0 text-black hover:bg-white hover:text-black hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(212,175,55,0.35)] active:translate-y-0 transition-all duration-200"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  ref={cartSectionRef}
                  id="shop-cart-checkout"
                  className={`lg:col-span-4 lg:sticky lg:top-24 lg:self-start lg:h-fit scroll-mt-28${mobileView === "products" ? " hidden lg:block" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setMobileView("products")}
                    className="lg:hidden mb-3 flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("shop.products.actions.back_to_products") ||
                      "Back to Products"}
                  </button>
                  <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-3.5 md:p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShoppingCart className="h-3.5 w-3.5 text-zim-gold" />
                      <h2 className="section-title-compact">
                        {t("shop.products.cart.title") || "Cart & Checkout"}
                      </h2>
                    </div>

                    {cartRows.length === 0 ? (
                      <p className="text-[11px] text-white/70">
                        {t("shop.products.cart.empty") ||
                          "No items yet. Add products to begin checkout."}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {cartRows.map(row => (
                          <div
                            key={row.product.id}
                            className="rounded-lg border border-white/10 bg-white/[0.02] p-2"
                          >
                            <p className="text-[11px] font-bold text-white truncate">
                              {row.product.name}
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <input
                                type="number"
                                min={1}
                                max={Math.max(1, row.product.stock_qty)}
                                value={row.item.quantity}
                                onChange={event =>
                                  updateQty(
                                    row.product.id,
                                    Number(event.target.value)
                                  )
                                }
                                aria-label={`${row.product.name} quantity`}
                                className="w-12 rounded-md bg-white/[0.04] border border-white/20 px-1.5 py-0.5 text-white text-[10px]"
                              />
                              <p className="text-[11px] text-zim-gold font-black">
                                {formatMoney(
                                  row.lineTotal,
                                  row.product.currency
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2.5 border-t border-white/10 pt-2.5 text-[10px] text-white/75 space-y-1">
                      <div className="flex justify-between">
                        <span>
                          {t("shop.products.totals.subtotal") || "Subtotal"}
                        </span>
                        <span>{formatMoney(subtotalCents)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {t("shop.products.totals.shipping") || "Shipping"}
                        </span>
                        <span>{formatMoney(shippingCents)}</span>
                      </div>
                      <div className="flex justify-between text-white font-black text-[11px]">
                        <span>
                          {t("shop.products.totals.total") || "Total"}
                        </span>
                        <span>{formatMoney(totalCents)}</span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-white/10 pt-2.5">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zim-gold mb-1.5">
                        {isAuthenticated
                          ? t("shop.products.checkout.title") || "Checkout"
                          : t("shop.products.guest_checkout.title") ||
                            "Guest Checkout"}
                      </h3>

                      {isAuthenticated ? (
                        <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/75">
                          {t("shop.products.checkout.logged_in_as") ||
                            "Signed in as"}{" "}
                          <span className="font-semibold text-white">
                            {profileName || "-"} ({profileEmail || "-"})
                          </span>
                        </div>
                      ) : null}

                      <div className="space-y-1.5">
                        {showCustomerIdentityInputs ? (
                          <>
                            <div className="space-y-1">
                              <Label
                                htmlFor="shop-customer-name"
                                className="text-[10px] uppercase tracking-[0.14em] text-white/70"
                              >
                                {t("shop.products.fields.full_name") ||
                                  "Full Name"}
                              </Label>
                              <Input
                                id="shop-customer-name"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder={
                                  t("shop.products.fields.full_name") ||
                                  "Full Name"
                                }
                                className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label
                                htmlFor="shop-customer-email"
                                className="text-[10px] uppercase tracking-[0.14em] text-white/70"
                              >
                                {t("shop.products.fields.email_address") ||
                                  "Email Address"}
                              </Label>
                              <Input
                                id="shop-customer-email"
                                type="email"
                                value={customerEmail}
                                onChange={e => setCustomerEmail(e.target.value)}
                                placeholder={
                                  t("shop.products.fields.email_address") ||
                                  "Email Address"
                                }
                                className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                              />
                            </div>
                          </>
                        ) : null}
                        <div className="space-y-1">
                          <Label
                            htmlFor="shop-shipping-country"
                            className="text-[10px] uppercase tracking-[0.14em] text-white/70"
                          >
                            {t("shop.products.fields.country") || "Country"}
                          </Label>
                          <Input
                            id="shop-shipping-country"
                            value={shippingCountry}
                            onChange={e => setShippingCountry(e.target.value)}
                            placeholder={
                              t("shop.products.fields.country") || "Country"
                            }
                            className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor="shop-shipping-city"
                            className="text-[10px] uppercase tracking-[0.14em] text-white/70"
                          >
                            {t("shop.products.fields.city") || "City"}
                          </Label>
                          <Input
                            id="shop-shipping-city"
                            value={shippingCity}
                            onChange={e => setShippingCity(e.target.value)}
                            placeholder={
                              t("shop.products.fields.city") || "City"
                            }
                            className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label
                            htmlFor="shop-shipping-address"
                            className="text-[10px] uppercase tracking-[0.14em] text-white/70"
                          >
                            {t("shop.products.fields.shipping_address") ||
                              "Shipping Address"}
                          </Label>
                          <Input
                            id="shop-shipping-address"
                            value={shippingAddress}
                            onChange={e => setShippingAddress(e.target.value)}
                            placeholder={
                              t("shop.products.fields.shipping_address") ||
                              "Shipping Address"
                            }
                            className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                          />
                        </div>
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                          {t("shop.products.delivery_speed.label") ||
                            "Send speed"}
                        </p>
                        {[
                          {
                            value: "normal" as DeliverySpeed,
                            label:
                              t("shop.products.delivery_speed.normal") ||
                              "Normal Send",
                            hint:
                              t("shop.products.delivery_speed.normal_hint") ||
                              "Standard dispatch timeline",
                          },
                          {
                            value: "express" as DeliverySpeed,
                            label:
                              t("shop.products.delivery_speed.express") ||
                              "Express Send",
                            hint: `${t("shop.products.delivery_speed.express_hint") || "Priority handling"} (+${formatMoney(800)})`,
                          },
                        ].map(option => (
                          <label
                            key={option.value}
                            htmlFor={`shop-delivery-${option.value}`}
                            className="flex items-center justify-between gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-[11px] text-white/85"
                          >
                            <span className="flex items-center gap-1">
                              <input
                                id={`shop-delivery-${option.value}`}
                                type="radio"
                                checked={deliverySpeed === option.value}
                                onChange={() => setDeliverySpeed(option.value)}
                              />
                              {option.label}
                            </span>
                            <span className="text-[10px] text-white/70">
                              {option.hint}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
                          {t("shop.products.payment_methods.label") ||
                            "Payment handling"}
                        </p>
                        {[
                          {
                            value: "manual_assisted" as PaymentMethod,
                            label:
                              t(
                                "shop.products.payment_methods.manual_assisted"
                              ) ||
                              "Assisted checkout (email / WhatsApp follow-up)",
                          },
                          ...(supportsDummyGateway
                            ? [
                                {
                                  value: "dummy_gateway" as PaymentMethod,
                                  label:
                                    t(
                                      "shop.products.payment_methods.dummy_gateway"
                                    ) || "Dummy Gateway (Dev/Test)",
                                },
                              ]
                            : []),
                        ].map(option => (
                          <label
                            key={option.value}
                            htmlFor={`shop-payment-${option.value}`}
                            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-[11px] text-white/80"
                          >
                            <input
                              id={`shop-payment-${option.value}`}
                              type="radio"
                              checked={paymentMethod === option.value}
                              onChange={() => setPaymentMethod(option.value)}
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>

                      {checkoutError ? (
                        <p className="mt-2 text-[11px] text-rose-300">
                          {checkoutError}
                        </p>
                      ) : null}
                      {notifyMessage ? (
                        <p className="mt-2 text-[11px] text-white/75">
                          {notifyMessage}
                        </p>
                      ) : null}

                      {!order ? (
                        <>
                          <Button
                            type="button"
                            onClick={placeOrder}
                            disabled={placingOrder}
                            className="mt-2.5 w-full rounded-full px-4 py-1.5 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[9px] uppercase tracking-[0.14em] disabled:opacity-70"
                          >
                            {placingOrder ? (
                              <>
                                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                {t("shop.products.actions.creating_order") ||
                                  "Placing Order..."}
                              </>
                            ) : (
                              t("shop.products.actions.place_order") ||
                              "Place Order"
                            )}
                          </Button>
                          <Button
                            asChild
                            type="button"
                            disabled={!whatsappOrderHref}
                            variant="outline"
                            className="mt-1.5 w-full rounded-full px-4 py-1.5 h-auto border-[#25D366] bg-[#25D366] text-white hover:bg-[#1ebe5d] hover:border-[#1ebe5d] disabled:opacity-40 font-black text-[9px] uppercase tracking-[0.14em]"
                          >
                            <a
                              href={whatsappOrderHref || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                              {t("shop.products.actions.order_whatsapp") ||
                                "Order on WhatsApp"}
                            </a>
                          </Button>
                        </>
                      ) : (
                        <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3">
                          <p className="text-xs text-white">
                            {t("shop.products.order.reference") ||
                              "Order reference"}
                            :{" "}
                            <span className="font-black">{order.orderRef}</span>
                          </p>
                          <p className="text-[11px] text-white/70 mt-1">
                            {t("shop.products.order.status") || "Status"}:{" "}
                            {String(order.status ?? "").toUpperCase()}
                          </p>
                          {order.paymentMethod === "dummy_gateway" ? (
                            <Button
                              type="button"
                              onClick={confirmPayment}
                              disabled={
                                confirmingPayment ||
                                String(order.status) === "paid"
                              }
                              className="mt-2.5 w-full rounded-full px-5 py-1.5 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 disabled:opacity-50 font-black text-[9px] uppercase tracking-[0.14em]"
                            >
                              {String(order.status) === "paid"
                                ? t(
                                    "shop.products.actions.payment_confirmed"
                                  ) || "Payment Confirmed"
                                : confirmingPayment
                                  ? t("shop.products.actions.processing") ||
                                    "Processing..."
                                  : t(
                                      "shop.products.payment_methods.dummy_gateway_short"
                                    ) || "Confirm Dummy Payment"}
                            </Button>
                          ) : (
                            <p className="mt-2.5 text-[11px] text-white/80">
                              {t("shop.products.order.manual_follow_up") ||
                                "Your order request is saved. Complete the assisted checkout by contacting us on WhatsApp or waiting for the follow-up email/invoice."}
                            </p>
                          )}
                          {/* What happens next */}
                          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" /> What happens next
                            </p>
                            <div className="space-y-2">
                              {[
                                "You'll receive an order confirmation via email.",
                                "Our team will review and contact you via WhatsApp or email.",
                                "Once payment is confirmed, we'll arrange delivery to your address.",
                              ].map((text, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="shrink-0 h-4 w-4 rounded-full bg-zim-gold/15 border border-zim-gold/30 text-zim-gold text-[9px] font-black flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <p className="text-[10px] text-white/55 leading-relaxed">
                                    {text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/70">
                        <ShieldCheck className="h-3.5 w-3.5 text-zim-gold" />
                        <span>
                          {isAuthenticated
                            ? t("shop.products.notes.logged_in_checkout") ||
                              "Signed-in checkout active."
                            : t("shop.products.notes.guest_checkout") ||
                              "Guest checkout enabled: no login required."}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/70">
                        <CreditCard className="h-3.5 w-3.5 text-zim-gold" />
                        <span>
                          {supportsDummyGateway
                            ? t("shop.products.notes.supported_methods_dev") ||
                              "Supported methods: assisted checkout in production, plus dummy payment simulation in dev/test."
                            : t("shop.products.notes.supported_methods") ||
                              "Supported methods: assisted checkout with email or WhatsApp follow-up."}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Dialog
        open={Boolean(notifyDialogProduct)}
        onOpenChange={open => {
          if (!open) {
            setNotifyDialogProduct(null);
            setNotifyEmailError("");
          }
        }}
      >
        <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              {t("shop.products.notify.dialog_title") ||
                "Notify me when it is back in stock"}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {notifyDialogProduct
                ? `${notifyDialogProduct.name} ${t("shop.products.notify.dialog_description") || "is currently unavailable. Enter your email address and we will let you know when stock returns."}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label
              htmlFor="restock-email"
              className="text-[10px] uppercase tracking-[0.14em] text-white/70"
            >
              {t("shop.products.fields.email_address") || "Email Address"}
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <Input
                id="restock-email"
                type="email"
                value={notifyEmailInput}
                onChange={event => setNotifyEmailInput(event.target.value)}
                placeholder={
                  t("shop.products.fields.email_address") || "Email Address"
                }
                className="border-white/20 bg-white/[0.04] pl-9 text-white placeholder:text-white/60"
              />
            </div>
            {notifyEmailError ? (
              <p className="text-[11px] text-rose-300" role="alert">
                {notifyEmailError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNotifyDialogProduct(null)}
              className="border-white/20 bg-transparent text-white hover:bg-white hover:text-black"
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={submitNotifyRequest}
              disabled={
                !notifyDialogProduct ||
                notifyState[notifyDialogProduct.id] === "saving"
              }
              className="bg-zim-gold text-black hover:bg-white"
            >
              {notifyDialogProduct &&
              notifyState[notifyDialogProduct.id] === "saving"
                ? t("shop.products.notify.saving") || "Saving..."
                : t("shop.products.notify.cta") || "Notify Me"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {mobileView === "products" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
          <div className="bg-slate-950/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart className="h-4 w-4 shrink-0 text-zim-gold" />
              <span className="text-xs text-white/80 truncate">
                {cartItemCount > 0
                  ? `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} · ${formatMoney(totalCents)}`
                  : t("shop.products.cart.empty_short") || "Your cart is empty"}
              </span>
            </div>
            <Button
              type="button"
              onClick={() => setMobileView("checkout")}
              className="shrink-0 rounded-full px-5 py-2 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[10px] uppercase tracking-[0.14em]"
            >
              {t("shop.products.actions.checkout") || "Checkout"}
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
