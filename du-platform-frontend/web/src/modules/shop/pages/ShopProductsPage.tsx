import DeliveryCoverage from "../components/DeliveryCoverage";
import ProductInterest from "../components/ProductInterest";
import { canRequestProduct } from "../lib/useShopCatalog";
import { Textarea } from "@/components/ui/textarea";
import { getCookieConsent } from "@/lib/cookieConsent";
import { trackShopFunnel } from "../lib/shopFunnel";
import OrderStatus from "../components/OrderStatus";
import { matchesShopSegment, shopProductDescription } from "../lib/shopContent";
import { convertShopCents, calculateShopShippingCents } from "@/domain/shopCurrency";
import { useShopCurrency } from "../lib/useShopCurrency";
import ShopCurrencySelect from "../components/ShopCurrencySelect";
import PilotReadinessNotice from "../components/PilotReadinessNotice";
import { customerLanguage } from "@/domain/customerLanguage";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useSearch } from "wouter/use-browser-location";
import {
  ArrowLeft,
  ShoppingCart,
  CreditCard,
  ShieldCheck,
  Loader2,
  MessageCircle,
  Package,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { useShopCatalog, type ShopProduct } from "../lib/useShopCatalog";
import { useShopCart } from "../lib/useShopCart";
import { useCheckoutPanelHeight } from "../lib/useCheckoutPanelHeight";
import type { CartItem } from "../lib/cartStore";
import ProductCard from "../components/ProductCard";
import QuantityControl from "../components/QuantityControl";
import CatalogNotice from "../components/CatalogNotice";
import { formatShopMoney as formatMoney } from "../lib/formatShopMoney";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveCurrentUserBootstrap } from "@/lib/authSessionBootstrap";
import { api, type AuthUser } from "@/lib/api";
import {
  shopOrderRequestSchema,
} from "@/domain/shopCheckout";
import {
  isOrderReceipt,
  prepareCheckoutAttempt,
  readOrderReceipt,
  saveOrderReceipt,
  type OrderReceipt,
} from "../lib/checkoutSession";
import { SHOP_CATEGORY_CONFIG } from "@/lib/shopCategories";

import {
  catalogCategories,
  catalogCategory,
  catalogQuery,
  emptyCatalogFilters,
  matchesCatalogQuery,
  readCatalogFilters,
  type CatalogFilters,
} from "../lib/catalogFilters";

type PaymentMethod = "manual_assisted" | "dummy_gateway";
type DeliverySpeed = "normal" | "express";

type PlacedOrder = OrderReceipt;

function normalizeWhatsAppPhone(raw: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : "4915147416152";
}

export default function ShopProducts() {
  const { t, i18n } = useTranslation();
  const { currency } = useShopCurrency();
  const money = (cents: number) => formatMoney(cents, currency);
  const [pathname, setLocation] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const filters = useMemo(() => readCatalogFilters(params), [params]);
  const { category, segment, query, availableOnly, product: selectedProduct } = filters;
  const language = params.has("lng") ? customerLanguage(i18n.language) : undefined;
  const filterQuery = catalogQuery(filters, language);
  const hasFilters = Boolean(category !== "all" || segment || query || availableOnly || selectedProduct);
  const resultCount = useRef<HTMLParagraphElement>(null);
  const location = `${pathname}${search}`;
  const processedAddToCartQueryRef = useRef<string | null>(null);
  const queryAddProductSlug = params.get("add")?.trim().toLowerCase();
  const {
    products: allProducts,
    status: catalogStatus,
    source: catalogSource,
    pricing,
    refresh: refreshCatalog,
    readiness,
  } = useShopCatalog();
  const {
    cart,
    add: addToSharedCart,
    removeOne,
    clear: clearCart,
    setQuantity,
    consume: consumeCart,
    itemCount: cartItemCount,
  } = useShopCart();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingCountry, setShippingCountry] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>("normal");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("manual_assisted");
  const [placingOrder, setPlacingOrder] = useState(false);
  const submittingRef = useRef(false);
  const confirmationRef = useRef<HTMLDivElement | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [order, setOrder] = useState<PlacedOrder | null>(readOrderReceipt);
  const mobileView = params.get("cart") === "1" ? "checkout" : "products";
  const checkoutScrollRef = useCheckoutPanelHeight(mobileView);
  const updateFilters = (changes: Partial<CatalogFilters>, replace = false) => {
    const next = catalogQuery({ ...filters, ...changes }, language, mobileView === "checkout");
    setLocation(`/shop/products${next}`, { replace });
  };
  const clearFilters = () => {
    updateFilters(emptyCatalogFilters);
    resultCount.current?.focus({ preventScroll: true });
  };
  const setMobileView = (view: "products" | "checkout") => {
    setLocation(`/shop/products${catalogQuery(filters, language, view === "checkout")}`);
    requestAnimationFrame(() => {
      document
        .getElementById(
          view === "checkout" ? "shop-cart-checkout" : "shop-products-heading"
        )
        ?.scrollIntoView({ block: "start" });
    });
  };
  const receiptOnly = Boolean(order && cart.length === 0);
  const supportsDummyGateway =
    import.meta.env.MODE === "development" || import.meta.env.MODE === "test";

  useEffect(() => {
    if (
      !queryAddProductSlug ||
      catalogStatus !== "ready" ||
      allProducts.length === 0
    )
      return;
    if (processedAddToCartQueryRef.current === location) return;

    const targetProduct = allProducts.find(
      product =>
        String(product.slug ?? "")
          .trim()
          .toLowerCase() === queryAddProductSlug
    );
    if (!targetProduct) return;

    processedAddToCartQueryRef.current = location;
    if (!canRequestProduct(readiness, targetProduct)) {
      toast.error(
        t("shop.products.stock.out_message", {
          defaultValue:
            "Currently unavailable. Leave your email for a stock update.",
        })
      );
    } else {
      addToSharedCart(targetProduct.id, targetProduct.stock_qty);
    }
    const nextParams = new URLSearchParams(search);
    nextParams.delete("add");
    setLocation(`/shop/products${nextParams.size ? `?${nextParams}` : ""}`, { replace: true });
  }, [
    allProducts,
    catalogStatus,
    readiness,
    addToSharedCart,
    location,
    queryAddProductSlug,
    search,
    setLocation,
    t,
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
    if (!supportsDummyGateway && paymentMethod === "dummy_gateway") {
      setPaymentMethod("manual_assisted");
    }
  }, [paymentMethod, supportsDummyGateway]);

  const products = useMemo(() => {
    const matches = [];
    for (const product of allProducts) {
      if (category !== "all" && catalogCategory(product.category) !== category) continue;
      if (!matchesShopSegment(product, segment)) continue;
      if (availableOnly && !canRequestProduct(readiness, product)) continue;
      if (selectedProduct && product.slug !== selectedProduct) continue;
      const description = shopProductDescription(product, (key, fallback) =>
        t(key, { defaultValue: fallback })
      );
      if (matchesCatalogQuery(product.name, description, query)) matches.push({ product, description });
    }
    return matches;
  }, [allProducts, category, segment, availableOnly, readiness, selectedProduct, query, t]);

  useEffect(() => {
    if (catalogStatus === "ready") trackShopFunnel("product_discovery");
  }, [catalogStatus]);
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
          lineTotal:
            convertShopCents(product.price_cents, product.currency, currency) *
            item.quantity,
        };
      })
      .filter(Boolean) as Array<{
      item: CartItem;
      product: ShopProduct;
      lineTotal: number;
    }>;
  }, [cart, productsById, currency]);

  const invalidBasket =
    cartRows.length !== cart.length ||
    cartRows.some(row => row.item.quantity > row.product.stock_qty);
  const canCheckout =
    catalogStatus === "ready" &&
    cart.length > 0 &&
    !invalidBasket &&
    cartRows.every(row => canRequestProduct(readiness, row.product));

  const subtotalCents = cartRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const baseSubtotalCents = cartRows.reduce(
    (sum, row) =>
      sum +
      convertShopCents(row.product.price_cents, row.product.currency, "EUR") *
        row.item.quantity,
    0
  );
  const shippingBase = calculateShopShippingCents(baseSubtotalCents, deliverySpeed);
  const shippingCents = Number.isFinite(shippingBase) ? convertShopCents(shippingBase, "EUR", currency) : Number.NaN;
  const totalCents = subtotalCents + shippingCents;
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
      t("shop.products.whatsapp.intro", {
        defaultValue:
          "Hello, I would like to request these products from Diaspora Unlocked.",
      }),
      "",
      t("shop.products.whatsapp.order_items", { defaultValue: "Order Items:" }),
      ...cartRows.map(
        row =>
          `- ${row.product.name} x${row.item.quantity} (${money(convertShopCents(row.product.price_cents, row.product.currency, currency))} ${t("shop.products.whatsapp.each", { defaultValue: "each" })})`
      ),
      "",
      `${t("shop.currency.label")}: ${currency}`,
      `${t("shop.products.totals.subtotal", { defaultValue: "Subtotal" })}: ${money(subtotalCents)}`,
      `${t("shop.products.totals.shipping", { defaultValue: "Delivery allowance (estimate)" })}: ${money(shippingCents)}`,
      `${t("shop.products.totals.total", { defaultValue: "Estimated total" })}: ${money(totalCents)}`,
      `${t("shop.products.delivery_speed.label", { defaultValue: "Delivery preference" })}: ${
        deliverySpeed === "express"
          ? t("shop.products.delivery_speed.express", {
              defaultValue: "Express delivery request",
            })
          : t("shop.products.delivery_speed.normal", {
              defaultValue: "Standard delivery request",
            })
      }`,
      "",
      t("shop.products.whatsapp.customer_details", {
        defaultValue: "Customer Details:",
      }),
      `${t("shop.products.fields.name", { defaultValue: "Name" })}: ${effectiveCustomerName || "-"}`,
      `${t("shop.products.fields.email", { defaultValue: "Email" })}: ${effectiveCustomerEmail || "-"}`,
      `${t("shop.products.fields.country", { defaultValue: "Country" })}: ${shippingCountry || "-"}`,
      `${t("shop.products.fields.city", { defaultValue: "City" })}: ${shippingCity || "-"}`,
      `${t("shop.products.fields.address", { defaultValue: "Address" })}: ${shippingAddress || "-"}`,
      `${t("pilot.postal_code")}: ${postalCode || "-"}`,
      `${t("pilot.requested_options")}: ${customerNotes || "-"}`,
      "",
      t("shop.products.whatsapp.outro", {
        defaultValue:
          "Please confirm stock, DHL delivery to my destination, final costs and payment instructions.",
      }),
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
    postalCode,
    customerNotes,
    currency,
    t,
    i18n.resolvedLanguage,
    i18n.language,
    deliverySpeed,
    whatsappNumber,
  ]);

  const addToCart = (product: ShopProduct) => {
    if (
      canRequestProduct(readiness, product) &&
      catalogStatus === "ready" &&
      addToSharedCart(product.id, product.stock_qty)
    ) {
      setCheckoutError("");
    }
  };

  const placeOrder = async () => {
    if (submittingRef.current || !canCheckout) return;
    setCheckoutError("");
    if (cartRows.length === 0) {
      setCheckoutError(
        t("shop.products.errors.empty_cart", {
          defaultValue: "Your cart is empty.",
        })
      );
      return;
    }
    if (
      catalogStatus !== "ready" ||
      cartRows.length !== cart.length ||
      cartRows.some(row => row.item.quantity > row.product.stock_qty)
    ) {
      setCheckoutError(
        t("shop.products.errors.availability_changed", {
          defaultValue:
            "Please review the cart. Some items are unavailable or exceed the current stock.",
        })
      );
      return;
    }
    submittingRef.current = true;
    setPlacingOrder(true);
    try {
      const parsed = shopOrderRequestSchema.safeParse({
        currency,
        pricingRevision: pricing?.revision,
        language: customerLanguage(i18n.resolvedLanguage ?? i18n.language),
        customerName: effectiveCustomerName,
        customerEmail: effectiveCustomerEmail,
        shippingCountry,
        postalCode,
        customerNotes,
        analyticsConsent: getCookieConsent() === "accepted",
        shippingCity,
        shippingAddress,
        deliverySpeed,
        paymentMethod,
        items: cartRows.map(row => ({
          productId: row.product.id,
          quantity: row.item.quantity,
        })),
      });
      if (!parsed.success) {
        setCheckoutError(t("shop.products.errors.complete_fields"));
        return;
      }
      const payload = parsed.data;
      const requestToken = await prepareCheckoutAttempt(payload);
      const { data } = await api.post(
        "/shop/orders",
        { ...payload, requestToken },
        { timeout: 20_000 }
      );
      if (!isOrderReceipt(data?.order))
        throw new Error("Invalid order response");
      saveOrderReceipt(data.order);
      setOrder(data.order);
      consumeCart(payload.items);
      requestAnimationFrame(() => confirmationRef.current?.focus());
    } catch (error: any) {
      if (error?.response?.status === 400 || error?.response?.status === 409)
        void refreshCatalog();
      setCheckoutError(
        String(
          error?.response?.data?.message ??
            t("shop.products.errors.unable_place_order", {
              defaultValue:
                "Your request could not be saved. Try again, or contact us on WhatsApp.",
            })
        )
      );
    } finally {
      submittingRef.current = false;
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
      const confirmed = { ...order, ...data?.order };
      if (!isOrderReceipt(confirmed))
        throw new Error("Invalid payment response");
      saveOrderReceipt(confirmed);
      setOrder(confirmed);
    } catch (error: any) {
      setCheckoutError(
        String(
          error?.response?.data?.message ??
            t("shop.products.errors.unable_confirm_payment", {
              defaultValue: "Unable to confirm payment.",
            })
        )
      );
    } finally {
      setConfirmingPayment(false);
    }
  };

  return (
    <Layout>
      <section className="shop-products-section bg-slate-950 min-h-screen">
        <div className="container px-6 mx-auto">
          <div className="shop-products-shell relative">
            <div className="relative z-10">
              <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
                <div>
                  <h1 id="shop-products-heading" className="page-title">
                    {t("shop.products.title", {
                      defaultValue: "Shop Products",
                    })}
                  </h1>
                  <p className="text-sm text-white/75 mt-3 max-w-2xl">
                    {t("shop.products.subtitle", {
                      defaultValue:
                        "Build your basket and send an order request. Before you pay, the team confirms stock, DHL delivery to your destination and final costs.",
                    })}
                  </p>
                  <DeliveryCoverage />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ShopCurrencySelect compact disabled={placingOrder} />
                  <Link
                    href="/shop"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-300 hover:text-zim-gold"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("shop.products.back_to_shop", {
                      defaultValue: "Back to Shop",
                    })}
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div
                  className={`lg:col-span-8 space-y-6${mobileView === "checkout" ? " hidden lg:block" : ""}`}
                >
                  <div className="space-y-3 rounded-2xl border border-white/15 bg-white/[0.03] p-4">
                    <label htmlFor="shop-product-search" className="sr-only">
                      {t("shop.products.filters.search")}
                    </label>
                    <div className="relative">
                      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="shop-product-search"
                        type="search"
                        value={query}
                        placeholder={t("shop.products.filters.search")}
                        onChange={event => updateFilters({ query: event.target.value, product: "" }, true)}
                        className="min-h-11 border-white/20 bg-slate-950/70 pl-10 text-white placeholder:text-slate-400"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                      <label className="min-w-0 text-xs font-medium text-slate-300">
                        {t("shop.products.filters.category")}
                        <select
                          value={category}
                          onChange={event => updateFilters({ category: catalogCategory(event.target.value), segment: "", product: "" })}
                          className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-2.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-zim-gold"
                        >
                          {catalogCategories.map(key => (
                            <option key={key} value={key}>{t(`shop.products.filters.${key}`)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="min-w-0 text-xs font-medium text-slate-300">
                        {t("shop.products.filters.select_segment")}
                        <select
                          value={segment}
                          onChange={event => updateFilters({ segment: event.target.value, product: "" })}
                          className="mt-1 block min-h-11 w-full rounded-lg border border-white/20 bg-slate-900 px-2.5 text-sm text-white focus-visible:outline-2 focus-visible:outline-zim-gold"
                        >
                          <option value="">{t("shop.products.filters.all_segments")}</option>
                          {availableSegments.map(item => (
                            <option key={item.key} value={item.key}>
                              {t(`shop.categories.${item.key}.title`, { defaultValue: item.title })}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3">
                      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={availableOnly}
                          onChange={event => updateFilters({ availableOnly: event.target.checked })}
                          className="size-4 accent-zim-gold"
                        />
                        {t("pilot.available_now")}
                      </label>
                      {hasFilters && (
                        <button type="button" onClick={clearFilters} className="min-h-11 text-sm font-medium text-zim-gold underline underline-offset-4">
                          {t("shop.products.clear_filters")}
                        </button>
                      )}
                    </div>
                  </div>
                  <p ref={resultCount} tabIndex={-1} role="status" aria-atomic="true" className="text-sm text-slate-300">
                    {catalogStatus === "ready" && t("shop.products.filters.result_count", { count: products.length })}
                  </p>
                  <CatalogNotice
                    status={catalogStatus}
                    source={catalogSource}
                    pricingAvailable={pricing !== null}
                    hasProducts={allProducts.length > 0}
                    onRetry={() => void refreshCatalog()}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:gap-5">
                    {catalogStatus === "ready" && products.length === 0 ? (
                      <div className="col-span-2 rounded-[2rem] border border-white/10 bg-white/[0.02] p-10 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                          <Package className="h-7 w-7 text-white/25" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">
                            {t(hasFilters ? "shop.products.filters.no_matches" : "shop.products.empty_state")}
                          </p>
                          <p className="text-slate-300 text-sm mt-1">
                            {availableOnly && !allProducts.some(product => canRequestProduct(readiness, product))
                              ? t("product_interest.available_empty")
                              : hasFilters
                                ? t("shop.products.filter_hint")
                                : t("shop.products.empty_hint")}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {products.map(({ product, description }) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        quantity={
                          cart.find(item => item.productId === product.id)
                            ?.quantity || 0
                        }
                        available={catalogStatus === "ready"}
                        onAdd={() => addToCart(product)}
                        onRemove={() => removeOne(product.id)}
                        description={description}
                        catalogQuery={filterQuery}
                      />
                    ))}
                  </div>
                </div>

                <div
                  id="shop-cart-checkout"
                  className={`lg:col-span-4 lg:sticky lg:top-24 lg:self-start lg:h-fit scroll-mt-28${mobileView === "products" ? " hidden lg:block" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setMobileView("products")}
                    className="lg:hidden mb-3 flex min-h-11 items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t("shop.products.actions.back_to_products", {
                      defaultValue: "Back to Products",
                    })}
                  </button>
                  <form
                    ref={checkoutScrollRef}
                    className="content-panel shop-checkout-scroll"
                    tabIndex={0}
                    aria-labelledby="shop-cart-title"
                    onSubmit={event => {
                      event.preventDefault();
                      void placeOrder();
                    }}
                    aria-busy={placingOrder}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShoppingCart className="h-3.5 w-3.5 text-zim-gold" />
                      <h2 id="shop-cart-title" className="cart-panel-title">
                        {receiptOnly
                          ? t("shop.products.order.received_title")
                          : !canCheckout
                            ? t("product_interest.saved_basket")
                            : t("shop.products.cart.title", {
                                defaultValue: "Cart & order request",
                              })}
                      </h2>
                      <span
                        className="shop-cart-count"
                        hidden={receiptOnly}
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {cartItemCount}
                      </span>
                    </div>

                    {!receiptOnly && <PilotReadinessNotice />}
                    {!receiptOnly && canCheckout && !pricing && (
                      <p role="status" className="mb-4 text-sm text-amber-200">
                        Current delivery and conversion estimates are unavailable. You can still send an assisted request; the server will calculate the request total, and the team will confirm the final quote before payment.
                      </p>
                    )}
                    {!receiptOnly && invalidBasket && (
                      <p role="alert" className="mb-4 text-sm text-amber-200">
                        {t("product_interest.saved_notice")}
                      </p>
                    )}
                    {(canCheckout || receiptOnly) && (
                      <p className="mb-4 text-xs leading-5 text-slate-400">
                        {t("shop.currency.note")}
                      </p>
                    )}

                    {!receiptOnly && (
                      <>
                        {cart.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              clearCart();
                              setCheckoutError("");
                            }}
                            className="mb-3 min-h-11 text-xs text-slate-300 underline underline-offset-4 hover:text-white"
                          >
                            {t("shop.products.cart.clear", {
                              defaultValue: "Clear cart",
                            })}
                          </button>
                        )}
                        {catalogStatus === "ready" &&
                          cartRows.length !== cart.length && (
                            <p
                              role="alert"
                              className="mb-3 text-sm text-amber-200"
                            >
                              {t("shop.products.cart.unavailable", {
                                defaultValue:
                                  "Some saved items are no longer available. Remove those items to continue.",
                              })}{" "}
                              <button
                                type="button"
                                className="min-h-11 underline"
                                onClick={() =>
                                  cart
                                    .filter(
                                      item => !productsById.has(item.productId)
                                    )
                                    .forEach(item =>
                                      setQuantity(item.productId, 0)
                                    )
                                }
                              >
                                {t("shop.products.cart.remove_unavailable")}
                              </button>
                            </p>
                          )}
                        {cartRows.length === 0 ? (
                          <p className="cart-empty text-slate-300">
                            {cart.length > 0
                              ? t("product_interest.saved_notice")
                              : !readiness?.commercialReady
                                ? t("product_interest.saved_empty")
                                : t("shop.products.cart.empty", {
                                    defaultValue:
                                      "Your cart is empty. Add products to start an order request.",
                                  })}
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {cartRows.map(row => (
                              <div
                                key={row.product.id}
                                className="shop-cart-row"
                              >
                                <p className="text-sm font-bold text-white break-words">
                                  {row.product.name}
                                </p>
                                {catalogStatus === "ready" &&
                                  row.item.quantity > row.product.stock_qty && (
                                    <p
                                      role="alert"
                                      className="text-xs text-amber-200"
                                    >
                                      {t(
                                        "shop.products.errors.availability_changed"
                                      )}{" "}
                                      <button
                                        type="button"
                                        className="min-h-11 underline"
                                        onClick={() =>
                                          setQuantity(
                                            row.product.id,
                                            Math.min(
                                              row.item.quantity,
                                              row.product.stock_qty
                                            )
                                          )
                                        }
                                      >
                                        {t(
                                          row.product.stock_qty === 0
                                            ? "product_interest.remove_item"
                                            : "shop.products.cart.update_stock"
                                        )}
                                      </button>
                                    </p>
                                  )}
                                {!canRequestProduct(readiness, row.product) && (
                                  <div className="my-3">
                                    <ProductInterest product={row.product} />
                                  </div>
                                )}
                                <div className="shop-cart-row-controls">
                                  <QuantityControl
                                    name={row.product.name}
                                    quantity={row.item.quantity}
                                    limit={row.product.stock_qty}
                                    disabled={
                                      catalogStatus !== "ready" ||
                                      !canRequestProduct(readiness, row.product)
                                    }
                                    onAdd={() => addToCart(row.product)}
                                    onRemove={() => removeOne(row.product.id)}
                                  />
                                  <p className="text-right text-sm text-zim-gold font-black">
                                    {money(row.lineTotal)}
                                    <span className="block text-xs font-normal text-slate-400">
                                      {t("product_interest.indicative_price")}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {canCheckout && (
                          <div className="cart-totals mt-5 border-t border-white/10 pt-4 text-slate-300 space-y-2">
                            <div className="flex justify-between">
                              <span>
                                {t("shop.products.totals.subtotal", {
                                  defaultValue: "Subtotal",
                                })}
                              </span>
                              <span>{money(subtotalCents)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>
                                {t("shop.products.totals.shipping", {
                                  defaultValue: "Delivery allowance (estimate)",
                                })}
                              </span>
                              <span>{money(shippingCents)}</span>
                            </div>
                            <div className="flex justify-between text-white font-black text-sm">
                              <span>
                                {t("shop.products.totals.total", {
                                  defaultValue: "Estimated total",
                                })}
                              </span>
                              <span>{money(totalCents)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="mt-3 border-t border-white/10 pt-2.5">
                      {!receiptOnly && canCheckout && (
                        <>
                          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-zim-gold mb-1.5">
                            {isAuthenticated
                              ? t("shop.products.checkout.title", {
                                  defaultValue: "Your order request",
                                })
                              : t("shop.products.guest_checkout.title", {
                                  defaultValue: "Your order request",
                                })}
                          </h3>

                          {isAuthenticated ? (
                            <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/75">
                              {t("shop.products.checkout.logged_in_as", {
                                defaultValue: "Signed in as",
                              })}{" "}
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
                                    className="text-xs uppercase tracking-[0.14em] text-white/70"
                                  >
                                    {t("shop.products.fields.full_name", {
                                      defaultValue: "Full Name",
                                    })}
                                  </Label>
                                  <Input
                                    id="shop-customer-name"
                                    name="name"
                                    autoComplete="name"
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    disabled={placingOrder}
                                    value={customerName}
                                    onChange={e =>
                                      setCustomerName(e.target.value)
                                    }
                                    placeholder={t(
                                      "shop.products.fields.full_name",
                                      { defaultValue: "Full Name" }
                                    )}
                                    className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label
                                    htmlFor="shop-customer-email"
                                    className="text-xs uppercase tracking-[0.14em] text-white/70"
                                  >
                                    {t("shop.products.fields.email_address", {
                                      defaultValue: "Email Address",
                                    })}
                                  </Label>
                                  <Input
                                    id="shop-customer-email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    maxLength={254}
                                    disabled={placingOrder}
                                    type="email"
                                    value={customerEmail}
                                    onChange={e =>
                                      setCustomerEmail(e.target.value)
                                    }
                                    placeholder={t(
                                      "shop.products.fields.email_address",
                                      { defaultValue: "Email Address" }
                                    )}
                                    className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                                  />
                                </div>
                              </>
                            ) : null}
                            <div className="space-y-1">
                              <Label
                                htmlFor="shop-shipping-country"
                                className="text-xs uppercase tracking-[0.14em] text-white/70"
                              >
                                {t("shop.products.fields.country", {
                                  defaultValue: "Country",
                                })}
                              </Label>
                              <Input
                                id="shop-shipping-country"
                                name="country"
                                autoComplete="country-name"
                                required
                                minLength={2}
                                maxLength={120}
                                disabled={placingOrder}
                                value={shippingCountry}
                                onChange={e =>
                                  setShippingCountry(e.target.value)
                                }
                                placeholder={t("shop.products.fields.country", {
                                  defaultValue: "Country",
                                })}
                                className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label
                                htmlFor="shop-shipping-city"
                                className="text-xs uppercase tracking-[0.14em] text-white/70"
                              >
                                {t("shop.products.fields.city", {
                                  defaultValue: "City",
                                })}
                              </Label>
                              <Input
                                id="shop-shipping-city"
                                name="city"
                                autoComplete="address-level2"
                                required
                                minLength={2}
                                maxLength={120}
                                disabled={placingOrder}
                                value={shippingCity}
                                onChange={e => setShippingCity(e.target.value)}
                                placeholder={t("shop.products.fields.city", {
                                  defaultValue: "City",
                                })}
                                className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="shop-customer-notes">
                                {t("pilot.requested_options")}
                              </Label>
                              <Textarea
                                id="shop-customer-notes"
                                value={customerNotes}
                                disabled={placingOrder}
                                maxLength={1000}
                                onChange={e => setCustomerNotes(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="shop-postal-code">
                                {t("pilot.postal_code")}
                              </Label>
                              <Input
                                id="shop-postal-code"
                                autoComplete="postal-code"
                                maxLength={30}
                                disabled={placingOrder}
                                value={postalCode}
                                onChange={e => setPostalCode(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label
                                htmlFor="shop-shipping-address"
                                className="text-xs uppercase tracking-[0.14em] text-white/70"
                              >
                                {t("shop.products.fields.shipping_address", {
                                  defaultValue: "Shipping Address",
                                })}
                              </Label>
                              <Input
                                id="shop-shipping-address"
                                name="address"
                                autoComplete="street-address"
                                required
                                minLength={5}
                                maxLength={400}
                                disabled={placingOrder}
                                value={shippingAddress}
                                onChange={e =>
                                  setShippingAddress(e.target.value)
                                }
                                placeholder={t(
                                  "shop.products.fields.shipping_address",
                                  { defaultValue: "Shipping Address" }
                                )}
                                className="w-full rounded-xl border-white/20 bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-white/70"
                              />
                            </div>
                          </div>

                          <div className="mt-2.5 space-y-1">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/70">
                              {t("shop.products.delivery_speed.label", {
                                defaultValue: "Delivery preference",
                              })}
                            </p>
                            {[
                              {
                                value: "normal" as DeliverySpeed,
                                label: t(
                                  "shop.products.delivery_speed.normal",
                                  {
                                    defaultValue: "Standard delivery request",
                                  }
                                ),
                                hint: t(
                                  "shop.products.delivery_speed.normal_hint",
                                  {
                                    defaultValue:
                                      "Timing confirmed after review",
                                  }
                                ),
                              },
                              {
                                value: "express" as DeliverySpeed,
                                label: t(
                                  "shop.products.delivery_speed.express",
                                  {
                                    defaultValue: "Express delivery request",
                                  }
                                ),
                                hint: `${t("shop.products.delivery_speed.express_hint", { defaultValue: "Availability and timing confirmed after review" })}${pricing ? ` (+${money(convertShopCents(pricing.shipping.expressCents, "EUR", currency))})` : ""}`,
                              },
                            ].map(option => (
                              <label
                                key={option.value}
                                htmlFor={`shop-delivery-${option.value}`}
                                className="flex items-center justify-between gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-sm text-white/85"
                              >
                                <span className="flex items-center gap-1">
                                  <input
                                    id={`shop-delivery-${option.value}`}
                                    name="deliverySpeed"
                                    disabled={placingOrder}
                                    type="radio"
                                    checked={deliverySpeed === option.value}
                                    onChange={() =>
                                      setDeliverySpeed(option.value)
                                    }
                                  />
                                  {option.label}
                                </span>
                                <span className="text-xs text-white/70">
                                  {option.hint}
                                </span>
                              </label>
                            ))}
                          </div>

                          <div className="mt-2.5 space-y-1">
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/70">
                              {t("shop.products.payment_methods.label", {
                                defaultValue: "Order support",
                              })}
                            </p>
                            {[
                              {
                                value: "manual_assisted" as PaymentMethod,
                                label:
                                  t(
                                    "shop.products.payment_methods.manual_assisted"
                                  ) || "Confirm details by email or WhatsApp",
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
                                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-sm text-white/80"
                              >
                                <input
                                  id={`shop-payment-${option.value}`}
                                  name="paymentMethod"
                                  disabled={placingOrder}
                                  type="radio"
                                  checked={paymentMethod === option.value}
                                  onChange={() =>
                                    setPaymentMethod(option.value)
                                  }
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                      {checkoutError ? (
                        <p role="alert" className="mt-2 text-sm text-rose-300">
                          {checkoutError}
                        </p>
                      ) : null}

                      {(!order || cart.length > 0) && canCheckout && (
                        <>
                          <Button
                            type="submit"
                            disabled={
                              !canCheckout ||
                              placingOrder ||
                              catalogStatus !== "ready" ||
                              cart.length === 0
                            }
                            className="mt-2.5 w-full rounded-full px-4 py-1.5 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-xs uppercase tracking-[0.14em] disabled:opacity-70"
                          >
                            {placingOrder ? (
                              <>
                                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                {t("shop.products.actions.creating_order", {
                                  defaultValue: "Sending request…",
                                })}
                              </>
                            ) : (
                              t("shop.products.actions.place_order", {
                                defaultValue: "Send order request",
                              })
                            )}
                          </Button>
                          <Button
                            asChild
                            type="button"
                            variant="outline"
                            className="mt-1.5 w-full rounded-full px-4 py-1.5 h-auto border-[#25D366] bg-[#25D366] text-white hover:bg-[#1ebe5d] hover:border-[#1ebe5d] disabled:opacity-40 font-black text-xs uppercase tracking-[0.14em]"
                          >
                            <a
                              href={whatsappOrderHref || undefined}
                              aria-disabled={!whatsappOrderHref || placingOrder}
                              onClick={event => {
                                if (!whatsappOrderHref || placingOrder)
                                  event.preventDefault();
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                              {t("shop.products.actions.order_whatsapp", {
                                defaultValue:
                                  "Ask about this order on WhatsApp",
                              })}
                            </a>
                          </Button>
                        </>
                      )}
                      {order && (
                        <div
                          ref={confirmationRef}
                          tabIndex={-1}
                          role="status"
                          className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-3"
                        >
                          <p className="text-xs text-white">
                            {t("shop.products.order.reference", {
                              defaultValue: "Request reference",
                            })}
                            :{" "}
                            <span className="break-all font-black">
                              {order.orderRef}
                            </span>
                          </p>
                          {order.paymentMethod === "dummy_gateway" && (
                            <p className="text-sm text-white/70 mt-1">
                              {t("shop.products.order.status", {
                                defaultValue: "Status",
                              })}
                              :{" "}
                              {t(`shop.products.order.status_${order.status}`, {
                                defaultValue: "Request status unavailable",
                              })}
                            </p>
                          )}
                          {order.paymentMethod === "dummy_gateway" ? (
                            <Button
                              type="button"
                              onClick={confirmPayment}
                              disabled={
                                confirmingPayment ||
                                String(order.status) === "paid"
                              }
                              className="mt-2.5 w-full rounded-full px-5 py-1.5 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 disabled:opacity-50 font-black text-xs uppercase tracking-[0.14em]"
                            >
                              {String(order.status) === "paid"
                                ? t(
                                    "shop.products.actions.payment_confirmed"
                                  ) || "Payment Confirmed"
                                : confirmingPayment
                                  ? t("shop.products.actions.processing", {
                                      defaultValue: "Processing...",
                                    })
                                  : t(
                                      "shop.products.payment_methods.dummy_gateway_short"
                                    ) || "Confirm Dummy Payment"}
                            </Button>
                          ) : null}
                          {order.items?.map(item => (
                            <p
                              key={item.productId}
                              className="mt-2 break-words text-xs text-white/80"
                            >
                              {item.productName} × {item.quantity} ·{" "}
                              {formatMoney(item.lineTotalCents, order.currency)}
                            </p>
                          ))}
                          <p className="mt-2 text-sm font-semibold text-white">
                            {t("shop.products.order.request_total")}:{" "}
                            {formatMoney(order.totalCents, order.currency)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zim-gold underline underline-offset-4">
                            <a
                              href={`mailto:info@diasporaunlocked.com?subject=${encodeURIComponent(`Order request ${order.orderRef}`)}`}
                            >
                              {t("shop.products.order.contact_email")}
                            </a>
                            <a
                              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello, please help me with order request ${order.orderRef}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t("shop.products.order.contact_whatsapp")}
                            </a>
                          </div>
                          {order.manageToken && (
                            <OrderStatus
                              orderRef={order.orderRef}
                              token={order.manageToken}
                              showEstimate={false}
                            />
                          )}
                        </div>
                      )}

                      {canCheckout || receiptOnly ? (
                        <>
                          <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/70">
                            <ShieldCheck className="h-3.5 w-3.5 text-zim-gold" />
                            <span>
                              {isAuthenticated
                                ? t("shop.products.notes.logged_in_checkout", {
                                    defaultValue:
                                      "Your request uses the contact details above.",
                                  })
                                : t("shop.products.notes.guest_checkout", {
                                    defaultValue:
                                      "No account needed to send an order request.",
                                  })}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/70">
                            <CreditCard className="h-3.5 w-3.5 text-zim-gold" />
                            <span>
                              {supportsDummyGateway
                                ? t(
                                    "shop.products.notes.supported_methods_dev",
                                    {
                                      defaultValue:
                                        "Supported methods: assisted checkout in production, plus dummy payment simulation in dev/test.",
                                    }
                                  )
                                : t("shop.products.notes.supported_methods", {
                                    defaultValue:
                                      "No payment is taken here. DHL service availability and the final delivery cost are confirmed for your destination. The allowance shown is a planning estimate, not a DHL quote.",
                                  })}
                            </span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {mobileView === "products" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
          <div
            data-mobile-basket-summary
            className="bg-slate-950/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart className="h-4 w-4 shrink-0 text-zim-gold" />
              <span className="text-xs text-white/80 truncate">
                {cartItemCount > 0 ? (
                  canCheckout ? (
                    `${t("shop.products.cart.item_count", { count: cartItemCount })} · ${money(totalCents)}`
                  ) : (
                    <>
                      <span data-mobile-basket-count>
                        {t("shop.products.cart.item_count", {
                          count: cartItemCount,
                        })}
                      </span>
                      {` · ${t("product_interest.saved_basket")}`}
                    </>
                  )
                ) : !readiness?.commercialReady ? (
                  t("product_interest.saved_empty")
                ) : (
                  t("shop.products.cart.empty_short", {
                    defaultValue: "Your cart is empty",
                  })
                )}
              </span>
            </div>
            <Button
              type="button"
              onClick={() => setMobileView("checkout")}
              disabled={!order && cartItemCount === 0}
              className="shrink-0 rounded-full px-5 py-2 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[10px] uppercase tracking-[0.14em]"
            >
              {receiptOnly
                ? t("shop.products.order.view_request")
                : t("shop.products.actions.checkout", {
                    defaultValue: "Review basket",
                  })}
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
