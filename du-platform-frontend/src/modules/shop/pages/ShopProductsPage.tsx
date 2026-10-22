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
import { useShopCatalog, type ShopProduct } from "../lib/useShopCatalog";
import { useShopCart } from "../lib/useShopCart";
import { useCheckoutPanelHeight } from "../lib/useCheckoutPanelHeight";
import type { CartItem } from "../lib/cartStore";
import ProductCard from "../components/ProductCard";
import QuantityControl from "../components/QuantityControl";
import CatalogNotice from "../components/CatalogNotice";
import { formatShopMoney as formatMoney } from "../lib/formatShopMoney";
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
import {
  shopOrderRequestSchema,
  calculateShopShippingCents,
} from "@shared/shopCheckout";
import {
  isOrderReceipt,
  prepareCheckoutAttempt,
  readOrderReceipt,
  saveOrderReceipt,
  type OrderReceipt,
} from "../lib/checkoutSession";
import { SHOP_CATEGORY_CONFIG } from "@/lib/shopCategories";

type ProductCategory = "all" | "sports" | "crafts" | "food" | "beverage";
type PaymentMethod = "manual_assisted" | "dummy_gateway";
type DeliverySpeed = "normal" | "express";

type PlacedOrder = OrderReceipt;

type QueryState = {
  queryCategory: ProductCategory;
  querySegment: string;
  queryAddProductSlug: string;
};

function normalizeWhatsAppPhone(raw: string) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : "4915147416152";
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
  const {
    products: allProducts,
    status: catalogStatus,
    refresh: refreshCatalog,
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
  const [notifyState, setNotifyState] = useState<
    Record<number, "idle" | "saving" | "saved">
  >({});
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyDialogProduct, setNotifyDialogProduct] =
    useState<ShopProduct | null>(null);
  const [notifyEmailInput, setNotifyEmailInput] = useState("");
  const [notifyEmailError, setNotifyEmailError] = useState("");
  const mobileView =
    new URLSearchParams(search).get("cart") === "1" ? "checkout" : "products";
  const checkoutScrollRef = useCheckoutPanelHeight(mobileView);
  const setMobileView = (view: "products" | "checkout") => {
    const params = new URLSearchParams(search);
    if (view === "checkout") params.set("cart", "1");
    else params.delete("cart");
    setLocation(`/shop/products${params.size ? `?${params}` : ""}`);
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
    setCategory(queryCategory);
    setSegment(querySegment);
  }, [queryCategory, querySegment]);

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
    if (targetProduct.stock_qty <= 0) {
      toast.error(
        t("shop.products.stock.out_message", {
          defaultValue:
            "Currently unavailable. Leave your email for a stock update.",
        })
      );
    } else {
      addToSharedCart(targetProduct.id, targetProduct.stock_qty);
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
    catalogStatus,
    addToSharedCart,
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

  const products = useMemo(
    () =>
      allProducts.filter(product => {
        const normalized = normalizeProductCategory(product.category);
        return (
          (category === "all" || normalized === category) &&
          matchesSegment(product, segment)
        );
      }),
    [allProducts, category, segment]
  );

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
    t(`shop.products.descriptions.${product.slug}`, {
      defaultValue: product.description,
    });

  const subtotalCents = cartRows.reduce((sum, row) => sum + row.lineTotal, 0);
  const shippingCents = calculateShopShippingCents(
    subtotalCents,
    deliverySpeed
  );
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
          `- ${row.product.name} x${row.item.quantity} (${formatMoney(
            row.product.price_cents,
            row.product.currency
          )} ${t("shop.products.whatsapp.each", { defaultValue: "each" })})`
      ),
      "",
      `${t("shop.products.totals.subtotal", { defaultValue: "Subtotal" })}: ${formatMoney(subtotalCents)}`,
      `${t("shop.products.totals.shipping", { defaultValue: "Estimated delivery" })}: ${formatMoney(shippingCents)}`,
      `${t("shop.products.totals.total", { defaultValue: "Estimated total" })}: ${formatMoney(totalCents)}`,
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
      "",
      t("shop.products.whatsapp.outro", {
        defaultValue: "Please confirm availability and payment instructions.",
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
    deliverySpeed,
    whatsappNumber,
  ]);

  const addToCart = (product: ShopProduct) => {
    if (
      catalogStatus === "ready" &&
      addToSharedCart(product.id, product.stock_qty)
    ) {
      setCheckoutError("");
    }
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
        t("shop.products.notify.invalid_email", {
          defaultValue: "Please enter a valid email address.",
        })
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
          t("shop.products.notify.saved", {
            defaultValue: "We'll notify you when this product is available.",
          })
      );
      setNotifyMessage(message);
      setCustomerEmail(email);
      setNotifyState(prev => ({ ...prev, [notifyDialogProduct.id]: "saved" }));
      setNotifyDialogProduct(null);
      toast.success(t("shop.products.notify.toast_title"), {
        description: t("shop.products.notify.toast_detail", {
          name: notifyDialogProduct.name,
        }),
        duration: 4000,
      });
    } catch (error: any) {
      setNotifyEmailError(
        String(
          error?.response?.data?.message ??
            t("shop.products.notify.failed", {
              defaultValue: "Unable to save notify request right now.",
            })
        )
      );
      setNotifyState(prev => ({ ...prev, [notifyDialogProduct.id]: "idle" }));
    }
  };

  const placeOrder = async () => {
    if (submittingRef.current) return;
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
                        "Add products to your cart and send an order request. Availability, delivery and payment are confirmed with you before the order goes ahead.",
                    })}
                  </p>
                </div>
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

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div
                  className={`lg:col-span-8 space-y-6${mobileView === "checkout" ? " hidden lg:block" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="hidden sm:flex flex-wrap gap-2">
                      {[
                        {
                          key: "all" as ProductCategory,
                          label: t("shop.products.filters.all", {
                            defaultValue: "All",
                          }),
                        },
                        {
                          key: "sports" as ProductCategory,
                          label: t("shop.products.filters.sports", {
                            defaultValue: "Sports",
                          }),
                        },
                        {
                          key: "crafts" as ProductCategory,
                          label: t("shop.products.filters.crafts", {
                            defaultValue: "Arts & Crafts",
                          }),
                        },
                        {
                          key: "food" as ProductCategory,
                          label: t("shop.products.filters.food", {
                            defaultValue: "Food & Nostalgia",
                          }),
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
                        aria-label={t("shop.products.filters.select_segment")}
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
                          {t("shop.products.filters.select_segment", {
                            defaultValue: "Select Segment",
                          })}
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

                  <CatalogNotice
                    status={catalogStatus}
                    onRetry={() => void refreshCatalog()}
                  />
                  <div className="grid grid-cols-2 gap-3 sm:gap-5">
                    {products.length === 0 ? (
                      <div className="col-span-2 rounded-[2rem] border border-white/10 bg-white/[0.02] p-10 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                          <Package className="h-7 w-7 text-white/25" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">
                            {t("shop.products.empty_state", {
                              defaultValue: "No products found",
                            })}
                          </p>
                          <p className="text-white/45 text-xs mt-1">
                            {category !== "all" || segment
                              ? t("shop.products.filter_hint")
                              : t("shop.products.empty_hint")}
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
                            {t("shop.products.clear_filters")}
                          </Button>
                        )}
                      </div>
                    ) : null}
                    {products.map(product => (
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
                        description={getLocalizedProductDescription(product)}
                        footer={
                          catalogStatus === "ready" &&
                          product.stock_qty <= 0 ? (
                            <Button
                              type="button"
                              disabled={notifyState[product.id] === "saving"}
                              onClick={() => openNotifyDialog(product)}
                              className="h-auto min-h-11 w-full whitespace-normal rounded-full border border-white/20 bg-transparent px-2 py-2 text-xs font-medium text-white hover:bg-white/10"
                            >
                              {notifyState[product.id] === "saving"
                                ? t("shop.products.notify.saving", {
                                    defaultValue: "Saving...",
                                  })
                                : notifyState[product.id] === "saved"
                                  ? t("shop.products.notify.saved_short", {
                                      defaultValue: "Notify Saved",
                                    })
                                  : t("shop.products.notify.cta", {
                                      defaultValue: "Notify Me",
                                    })}
                            </Button>
                          ) : undefined
                        }
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
                            {t("shop.products.cart.empty", {
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
                                <p className="text-[11px] font-bold text-white break-words">
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
                                        {t("shop.products.cart.update_stock")}
                                      </button>
                                    </p>
                                  )}
                                <div className="shop-cart-row-controls">
                                  <QuantityControl
                                    name={row.product.name}
                                    quantity={row.item.quantity}
                                    limit={row.product.stock_qty}
                                    disabled={catalogStatus !== "ready"}
                                    onAdd={() => addToCart(row.product)}
                                    onRemove={() => removeOne(row.product.id)}
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

                        <div className="cart-totals mt-5 border-t border-white/10 pt-4 text-slate-300 space-y-2">
                          <div className="flex justify-between">
                            <span>
                              {t("shop.products.totals.subtotal", {
                                defaultValue: "Subtotal",
                              })}
                            </span>
                            <span>{formatMoney(subtotalCents)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>
                              {t("shop.products.totals.shipping", {
                                defaultValue: "Estimated delivery",
                              })}
                            </span>
                            <span>{formatMoney(shippingCents)}</span>
                          </div>
                          <div className="flex justify-between text-white font-black text-[11px]">
                            <span>
                              {t("shop.products.totals.total", {
                                defaultValue: "Estimated total",
                              })}
                            </span>
                            <span>{formatMoney(totalCents)}</span>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="mt-3 border-t border-white/10 pt-2.5">
                      {!receiptOnly && (
                        <>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-zim-gold mb-1.5">
                            {isAuthenticated
                              ? t("shop.products.checkout.title", {
                                  defaultValue: "Your order request",
                                })
                              : t("shop.products.guest_checkout.title", {
                                  defaultValue: "Your order request",
                                })}
                          </h3>

                          {isAuthenticated ? (
                            <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px] text-white/75">
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
                                    className="text-[10px] uppercase tracking-[0.14em] text-white/70"
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
                                    className="text-[10px] uppercase tracking-[0.14em] text-white/70"
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
                                className="text-[10px] uppercase tracking-[0.14em] text-white/70"
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
                                className="text-[10px] uppercase tracking-[0.14em] text-white/70"
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
                              <Label
                                htmlFor="shop-shipping-address"
                                className="text-[10px] uppercase tracking-[0.14em] text-white/70"
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
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
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
                                hint: `${t("shop.products.delivery_speed.express_hint", { defaultValue: "Availability and timing confirmed after review" })} (+${formatMoney(800)})`,
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
                                <span className="text-[10px] text-white/70">
                                  {option.hint}
                                </span>
                              </label>
                            ))}
                          </div>

                          <div className="mt-2.5 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">
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
                                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-[11px] text-white/80"
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
                        <p
                          role="alert"
                          className="mt-2 text-[11px] text-rose-300"
                        >
                          {checkoutError}
                        </p>
                      ) : null}
                      {notifyMessage ? (
                        <p
                          role="status"
                          className="mt-2 text-[11px] text-white/75"
                        >
                          {notifyMessage}
                        </p>
                      ) : null}

                      {(!order || cart.length > 0) && (
                        <>
                          <Button
                            type="submit"
                            disabled={
                              placingOrder ||
                              catalogStatus !== "ready" ||
                              cart.length === 0
                            }
                            className="mt-2.5 w-full rounded-full px-4 py-1.5 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[9px] uppercase tracking-[0.14em] disabled:opacity-70"
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
                            className="mt-1.5 w-full rounded-full px-4 py-1.5 h-auto border-[#25D366] bg-[#25D366] text-white hover:bg-[#1ebe5d] hover:border-[#1ebe5d] disabled:opacity-40 font-black text-[9px] uppercase tracking-[0.14em]"
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
                            <span className="font-black">{order.orderRef}</span>
                          </p>
                          <p className="text-[11px] text-white/70 mt-1">
                            {t("shop.products.order.status", {
                              defaultValue: "Status",
                            })}
                            :{" "}
                            {t(`shop.products.order.status_${order.status}`, {
                              defaultValue: "Request status unavailable",
                            })}
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
                                  ? t("shop.products.actions.processing", {
                                      defaultValue: "Processing...",
                                    })
                                  : t(
                                      "shop.products.payment_methods.dummy_gateway_short"
                                    ) || "Confirm Dummy Payment"}
                            </Button>
                          ) : (
                            <p className="mt-2.5 text-[11px] text-white/80">
                              {t("shop.products.order.manual_follow_up", {
                                defaultValue:
                                  "Request received. Payment has not been taken and delivery is not yet confirmed. Contact us with your reference to agree availability, delivery costs and payment instructions.",
                              })}
                            </p>
                          )}
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
                          {/* What happens next */}
                          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />{" "}
                              {t("shop.products.order.next_title")}
                            </p>
                            <div className="space-y-2">
                              {[
                                t("shop.products.order.next_reference"),
                                t("shop.products.order.next_review"),
                                t("shop.products.order.next_delivery"),
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
                            ? t("shop.products.notes.supported_methods_dev", {
                                defaultValue:
                                  "Supported methods: assisted checkout in production, plus dummy payment simulation in dev/test.",
                              })
                            : t("shop.products.notes.supported_methods", {
                                defaultValue:
                                  "Availability, final delivery costs and payment instructions are agreed after review.",
                              })}
                        </span>
                      </div>
                    </div>
                  </form>
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
              {t("shop.products.notify.dialog_title", {
                defaultValue: "Notify me when it is back in stock",
              })}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {notifyDialogProduct
                ? `${notifyDialogProduct.name} ${t("shop.products.notify.dialog_description", { defaultValue: "is currently unavailable. Enter your email address and we will let you know when stock returns." })}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label
              htmlFor="restock-email"
              className="text-[10px] uppercase tracking-[0.14em] text-white/70"
            >
              {t("shop.products.fields.email_address", {
                defaultValue: "Email Address",
              })}
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <Input
                id="restock-email"
                type="email"
                value={notifyEmailInput}
                onChange={event => setNotifyEmailInput(event.target.value)}
                placeholder={t("shop.products.fields.email_address", {
                  defaultValue: "Email Address",
                })}
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
              {t("cancel", { defaultValue: "Cancel" })}
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
                ? t("shop.products.notify.saving", {
                    defaultValue: "Saving...",
                  })
                : t("shop.products.notify.cta", { defaultValue: "Notify Me" })}
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
                  ? `${t("shop.products.cart.item_count", { count: cartItemCount })} · ${formatMoney(totalCents)}`
                  : t("shop.products.cart.empty_short", {
                      defaultValue: "Your cart is empty",
                    })}
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
                    defaultValue: "Checkout",
                  })}
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}
