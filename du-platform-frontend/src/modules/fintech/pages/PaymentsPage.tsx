import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Building2,
  CreditCard,
  Gift,
  Landmark,
  Loader2,
  Plus,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import InstantImage from "@/components/InstantImage";
import SubPageHero from "@/components/SubPageHero";
import SendMoneyForm from "@/modules/fintech/components/SendMoneyForm";
import ErrorBoundary from "@/components/ErrorBoundary";
import { api } from "@/lib/api";
import { resolveCurrentUserBootstrap } from "@/lib/authSessionBootstrap";

type RemittancePayoutType = "mobile_money" | "cash_pickup" | "bank_transfer";
type FintechProduct = RemittancePayoutType | "airtime_topup" | "gift_cards";
type GiftCardCatalogueItem = {
  productId: string;
  name: string;
  category: string;
  denominations: string[];
  logoUrl: string | null;
};
type HistoryItem = {
  id: string;
  kind: "remittance" | "airtime";
  title: string;
  detail: string;
  amountText: string;
  status: string;
  createdAtLabel: string;
  createdAtMs: number;
};

const FALLBACK_GIFT_CARD_CATALOGUE: GiftCardCatalogueItem[] = [
  { productId: "boomplay-zw", name: "Boomplay", category: "Music", denominations: ["5 USD", "10 USD", "20 USD"], logoUrl: null },
  { productId: "razer-gold-zw", name: "Razer Gold", category: "Gaming", denominations: ["5 USD", "10 USD", "25 USD"], logoUrl: null },
  { productId: "xbox-zw", name: "Xbox", category: "Gaming", denominations: ["10 USD", "25 USD", "50 USD"], logoUrl: null },
  { productId: "roblox-zw", name: "Roblox", category: "Gaming", denominations: ["10 USD", "25 USD", "50 USD"], logoUrl: null },
  { productId: "tiktok-zw", name: "TikTok", category: "Social", denominations: ["5 USD", "10 USD", "20 USD"], logoUrl: null },
  { productId: "discord-nitro-zw", name: "Discord Nitro", category: "Entertainment", denominations: ["10 USD", "25 USD", "50 USD"], logoUrl: null },
];

function isFintechProduct(value: string): value is FintechProduct {
  return value === "mobile_money" || value === "cash_pickup" || value === "bank_transfer" || value === "airtime_topup" || value === "gift_cards";
}

export default function Payments() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [selectedProduct, setSelectedProduct] = useState<FintechProduct | null>(null);
  const [giftCardCatalogueVisible, setGiftCardCatalogueVisible] = useState(false);
  const [giftCardCatalogue, setGiftCardCatalogue] = useState<GiftCardCatalogueItem[]>(FALLBACK_GIFT_CARD_CATALOGUE);
  const [giftCardCatalogueLoading, setGiftCardCatalogueLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<HistoryItem[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
  const [paymentHistoryEnabled, setPaymentHistoryEnabled] = useState(false);
  const scrollRailRef = useRef<HTMLDivElement | null>(null);
  const productPanelRef = useRef<HTMLDivElement | null>(null);
  const giftCardCatalogueRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number | null; startX: number; startScrollLeft: number }>({
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });
  const suppressSelectionUntilRef = useRef(0);

  const isInteractiveRailTarget = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, [role='button']"));

  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/payments/mobile-payment-terminal.jpg",
        badge: tr("payments.hero.slide_1.badge", "Secure Checkout"),
        badgeIcon: ShieldCheck,
        title: tr("payments.hero.slide_1.title", "Global Payments"),
        titleHighlight: tr("payments.hero.slide_1.highlight", "Built Right"),
        subtitle: tr("payments.hero.slide_1.subtitle", "Bank-grade remittance and airtime flows for diaspora families."),
        description: tr(
          "payments.hero.slide_1.description",
          "Move money confidently with protected server-side processing and clear transaction tracking."
        ),
      },
      {
        image: "/images/pages/payments/cash-transfer-counter.jpg",
        badge: tr("payments.hero.slide_2.badge", "Cash Pickup Network"),
        badgeIcon: Landmark,
        title: tr("payments.hero.slide_2.title", "Remittance"),
        titleHighlight: tr("payments.hero.slide_2.highlight", "Corridors"),
        subtitle: tr(
          "payments.hero.slide_2.subtitle",
          "Support beneficiaries through mobile money, cash pickup, and bank transfer."
        ),
        description: tr(
          "payments.hero.slide_2.description",
          "Designed for fast diaspora support with operational controls and payout channel flexibility."
        ),
      },
      {
        image: "/images/pages/payments/smartphone-with-money.jpg",
        badge: tr("payments.hero.slide_3.badge", "Mobile First"),
        badgeIcon: Smartphone,
        title: tr("payments.hero.slide_3.title", "Airtime"),
        titleHighlight: tr("payments.hero.slide_3.highlight", "Top-Ups"),
        subtitle: tr(
          "payments.hero.slide_3.subtitle",
          "Detect operators and complete mobile top-ups with a simple, guided flow."
        ),
        description: tr(
          "payments.hero.slide_3.description",
          "Reliable operator lookup and amount options reduce failed transactions and improve speed."
        ),
      },
      {
        image: "/images/pages/payments/visa-debit-cards.jpg",
        badge: tr("payments.hero.slide_4.badge", "Digital Gift Cards"),
        badgeIcon: CreditCard,
        title: tr("payments.hero.slide_4.title", "Gift Card"),
        titleHighlight: tr("payments.hero.slide_4.highlight", "Catalogue"),
        subtitle: tr("payments.hero.slide_4.subtitle", "Browse Zimbabwe-available gift cards for gaming, music, and digital spending platforms."),
        description: tr(
          "payments.hero.slide_4.description",
          "Compare brands and denominations across Boomplay, Xbox, Roblox, TikTok, Discord Nitro, and more."
        ),
      },
      {
        image: "/images/pages/payments/smartphone-with-money.jpg",
        badge: tr("payments.hero.slide_5.badge", "Digital Wallets"),
        badgeIcon: Wallet,
        title: tr("payments.hero.slide_5.title", "Everyday"),
        titleHighlight: tr("payments.hero.slide_5.highlight", "Liquidity"),
        subtitle: tr("payments.hero.slide_5.subtitle", "Keep households connected with on-demand digital value transfer."),
        description: tr(
          "payments.hero.slide_5.description",
          "From monthly support to urgent needs, payments stay traceable and easy to confirm."
        ),
      },
      {
        image: "/images/pages/payments/paying-with-card.jpg",
        badge: tr("payments.hero.slide_6.badge", "Consistent UX"),
        badgeIcon: ArrowRightLeft,
        title: tr("payments.hero.slide_6.title", "Trusted"),
        titleHighlight: tr("payments.hero.slide_6.highlight", "Execution"),
        subtitle: tr(
          "payments.hero.slide_6.subtitle",
          "Professional payment tools aligned with the Diaspora Unlocked platform design system."
        ),
        description: tr(
          "payments.hero.slide_6.description",
          "Unified visual flow across remittance and airtime modules improves clarity and confidence."
        ),
      },
    ],
    [t]
  );

  const productTiles = useMemo(
    () => [
      {
        id: "mobile_money" as const,
        title: tr("payments.tiles.mobile_money.title", "Mobile Money"),
        description: tr(
          "payments.tiles.mobile_money.description",
          "Send funds directly to a supported mobile wallet for fast household support and everyday family needs."
        ),
        detail: tr(
          "payments.tiles.mobile_money.detail",
          "Best for fast support when the recipient uses a mobile wallet."
        ),
        image: "/images/pages/payments/smartphone-with-money.jpg",
        stats: tr("payments.tiles.mobile_money.stats", "Wallet delivery"),
        eta: tr("payments.tiles.mobile_money.eta", "Usually within minutes to 2 hours"),
        nextStep: tr(
          "payments.tiles.mobile_money.next_step",
          "Add the recipient wallet details, confirm the amount, and review the live quote before payment."
        ),
        icon: Wallet,
      },
      {
        id: "cash_pickup" as const,
        title: tr("payments.tiles.cash_pickup.title", "Cash Pickup"),
        description: tr(
          "payments.tiles.cash_pickup.description",
          "Send money for collection at a supported cash pickup location when the recipient prefers cash in hand."
        ),
        detail: tr(
          "payments.tiles.cash_pickup.detail",
          "Best when the recipient wants to collect cash in person."
        ),
        image: "/images/pages/payments/cash-transfer-counter.jpg",
        stats: tr("payments.tiles.cash_pickup.stats", "Cash collection"),
        eta: tr("payments.tiles.cash_pickup.eta", "Usually within 1 hour after provider confirmation"),
        nextStep: tr(
          "payments.tiles.cash_pickup.next_step",
          "Add the recipient details, confirm pickup information, and review the transfer summary before payment."
        ),
        icon: Landmark,
      },
      {
        id: "bank_transfer" as const,
        title: tr("payments.tiles.bank_transfer.title", "Bank Transfer"),
        description: tr(
          "payments.tiles.bank_transfer.description",
          "Send directly to a Zimbabwe bank account when the recipient prefers a formal account-based payout."
        ),
        detail: tr(
          "payments.tiles.bank_transfer.detail",
          "Best for direct delivery into a bank account."
        ),
        image: "/images/pages/payments/mobile-payment-terminal.jpg",
        stats: tr("payments.tiles.bank_transfer.stats", "Bank account delivery"),
        eta: tr("payments.tiles.bank_transfer.eta", "Usually 1-3 business days"),
        nextStep: tr(
          "payments.tiles.bank_transfer.next_step",
          "Add the bank account details, confirm the amount, and review the transfer summary before payment."
        ),
        icon: Building2,
      },
      {
        id: "airtime_topup" as const,
        title: tr("payments.tiles.airtime.title", "Airtime Top Up"),
        description: tr(
          "payments.tiles.airtime.description",
          "Top up a Zimbabwe mobile line with live operator detection and simpler amount selection."
        ),
        detail: tr(
          "payments.tiles.airtime.detail",
          "Best for fast connectivity support with simple amount selection."
        ),
        image: "/images/pages/payments/smartphone-with-money.jpg",
        stats: tr("payments.tiles.airtime.stats", "Mobile top-up"),
        eta: tr("payments.tiles.airtime.eta", "Usually within minutes"),
        nextStep: tr(
          "payments.tiles.airtime.next_step",
          "Enter the mobile number, choose the top-up amount, and confirm the delivery details."
        ),
        icon: Smartphone,
      },
      {
        id: "gift_cards" as const,
        title: tr("payments.tiles.gift_cards.title", "Gift Cards"),
        description: tr(
          "payments.tiles.gift_cards.description",
          "Send digital gift cards for gaming, music, entertainment, and online spending — including Boomplay, Razer Gold, Xbox, Roblox, TikTok, and more — delivered by email within minutes."
        ),
        detail: tr(
          "payments.tiles.gift_cards.detail",
          "A direct way to send brand-specific digital value when cash or airtime is not the right fit."
        ),
        image: "/images/pages/payments/paying-with-card.jpg",
        stats: tr("payments.tiles.gift_cards.stats", "300+ brands"),
        eta: tr("payments.tiles.gift_cards.eta", "Email delivery within minutes"),
        nextStep: tr(
          "payments.tiles.gift_cards.next_step",
          "Browse available brands and denominations, then choose the digital card that fits the recipient."
        ),
        icon: Gift,
      },
    ],
    [t]
  );
  const selectedTile = useMemo(
    () => (selectedProduct ? productTiles.find((tile) => tile.id === selectedProduct) ?? null : null),
    [productTiles, selectedProduct]
  );

  const formatHistoryItems = (remittanceRows: any[], airtimeRows: any[]): HistoryItem[] => {
    const formatCurrency = (amount: number, currency: string) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 2,
      }).format(amount);

    const remittanceItems = remittanceRows.map((row) => ({
      id: `remittance-${String(row?.id ?? crypto.randomUUID())}`,
      kind: "remittance" as const,
      title:
        String(row?.recipient_type ?? "").trim() === "bank_transfer"
          ? tr("payments.history.bank_transfer", "Bank Transfer")
          : String(row?.recipient_type ?? "").trim() === "cash_pickup"
            ? tr("payments.history.cash_pickup", "Cash Pickup")
            : tr("payments.history.mobile_money", "Mobile Money"),
      detail: String(row?.recipient_name ?? "").trim() || tr("payments.history.recipient", "Recipient"),
      amountText: formatCurrency(Number(row?.amount_sent ?? 0), String(row?.currency_from ?? "EUR")),
      status: String(row?.status ?? "").trim() || tr("payments.history.pending", "pending"),
      createdAtLabel: new Date(String(row?.created_at ?? Date.now())).toLocaleString(),
      createdAtMs: Date.parse(String(row?.created_at ?? "")) || Date.now(),
    }));

    const airtimeItems = airtimeRows.map((row) => ({
      id: `airtime-${String(row?.id ?? crypto.randomUUID())}`,
      kind: "airtime" as const,
      title: tr("payments.history.airtime", "Airtime Top Up"),
      detail: String(row?.phone_number ?? "").trim() || tr("payments.history.mobile_line", "Zimbabwe mobile line"),
      amountText: formatCurrency(Number(row?.amount ?? 0), String(row?.currency ?? "USD")),
      status: String(row?.status ?? "").trim() || tr("payments.history.pending", "pending"),
      createdAtLabel: new Date(String(row?.created_at ?? Date.now())).toLocaleString(),
      createdAtMs: Date.parse(String(row?.created_at ?? "")) || Date.now(),
    }));

    return [...remittanceItems, ...airtimeItems]
      .sort((left, right) => right.createdAtMs - left.createdAtMs)
      .slice(0, 8);
  };

  const loadPaymentHistory = async () => {
    const user = await resolveCurrentUserBootstrap();
    if (!user) {
      setPaymentHistoryEnabled(false);
      setPaymentHistory([]);
      return;
    }

    setPaymentHistoryEnabled(true);
    setPaymentHistoryLoading(true);
    try {
      const [remittanceResponse, airtimeResponse] = await Promise.all([
        api.get("/fintech/remittance?limit=6"),
        api.get("/fintech/airtime?limit=6"),
      ]);
      const remittanceRows = Array.isArray(remittanceResponse.data?.transactions) ? remittanceResponse.data.transactions : [];
      const airtimeRows = Array.isArray(airtimeResponse.data?.transactions) ? airtimeResponse.data.transactions : [];
      setPaymentHistory(formatHistoryItems(remittanceRows, airtimeRows));
    } catch {
      setPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  };

  const loadGiftCardCatalogue = async () => {
    setGiftCardCatalogueLoading(true);
    try {
      const response = await api.get("/fintech/gift-cards/catalog?countryCode=ZW");
      const products = Array.isArray(response.data?.products) ? response.data.products : [];
      if (products.length > 0) {
        setGiftCardCatalogue(
          products.map((product: any) => ({
            productId: String(product?.productId ?? crypto.randomUUID()),
            name: String(product?.name ?? "").trim(),
            category: String(product?.category ?? tr("payments.gift_cards.catalogue.label", "Gift Cards")).trim(),
            denominations: Array.isArray(product?.denominations)
              ? product.denominations.map((value: unknown) => String(value ?? "").trim()).filter(Boolean)
              : [],
            logoUrl: String(product?.logoUrl ?? "").trim() || null,
          }))
        );
      } else {
        setGiftCardCatalogue(FALLBACK_GIFT_CARD_CATALOGUE);
      }
    } catch {
      setGiftCardCatalogue(FALLBACK_GIFT_CARD_CATALOGUE);
    } finally {
      setGiftCardCatalogueLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const service = String(query.get("service") ?? "").trim();
    if (isFintechProduct(service)) {
      setSelectedProduct(service);
    }
  }, []);

  useEffect(() => {
    void loadPaymentHistory();
  }, []);

  const handleRailPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isInteractiveRailTarget(event.target)) return;
    if (event.pointerType === "touch" || !scrollRailRef.current) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scrollRailRef.current.scrollLeft,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleRailPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!scrollRailRef.current || dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.startX;

    if (Math.abs(deltaX) > 6) {
      suppressSelectionUntilRef.current = Date.now() + 250;
    }

    scrollRailRef.current.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  };

  const handleRailPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
    };
  };

  const handleTileSelect = (product: FintechProduct) => {
    if (Date.now() < suppressSelectionUntilRef.current) return;
    setSelectedProduct(product);
  };

  const handleSelectionCancel = () => {
    setSelectedProduct(null);
    window.requestAnimationFrame(() => {
      document.getElementById("send-money")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const handleGiftCardBrowse = () => {
    setGiftCardCatalogueVisible(true);
    void loadGiftCardCatalogue();
  };

  const isRemittanceProduct = (product: FintechProduct): product is RemittancePayoutType =>
    product === "mobile_money" || product === "cash_pickup" || product === "bank_transfer";

  useEffect(() => {
    if (!selectedProduct || !productPanelRef.current) return;

    window.requestAnimationFrame(() => {
      productPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [selectedProduct]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextUrl = new URL(window.location.href);
    if (selectedProduct) {
      nextUrl.searchParams.set("service", selectedProduct);
    } else {
      nextUrl.searchParams.delete("service");
    }
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProduct !== "gift_cards") {
      setGiftCardCatalogueVisible(false);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedProduct !== "gift_cards" || !giftCardCatalogueVisible || !giftCardCatalogueRef.current) return;

    window.requestAnimationFrame(() => {
      giftCardCatalogueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [giftCardCatalogueVisible, selectedProduct]);

  return (
    <Layout>
      <SubPageHero heroSlides={heroSlides} />

      <AnimatePresence mode="wait">
        {!selectedProduct ? (
          <motion.section
            key="tiles"
            id="send-money"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="relative overflow-hidden bg-slate-950 pt-8 pb-0 scroll-mt-32"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05)_0%,transparent_60%)]" />
            <div
              ref={scrollRailRef}
              className="home-tiles-scroll relative z-10 -mt-4 overflow-x-auto px-0 pb-8 pt-4 scroll-pl-6 scroll-smooth overscroll-x-contain snap-x snap-mandatory md:-mt-5 md:pb-12 md:pt-5 md:scroll-pl-8 md:cursor-grab active:cursor-grabbing"
              onPointerCancel={handleRailPointerEnd}
              onPointerDown={handleRailPointerDown}
              onPointerMove={handleRailPointerMove}
              onPointerUp={handleRailPointerEnd}
            >
              <div className="flex w-max items-stretch gap-5 pl-6 pr-0 md:gap-7 md:pl-8 md:pr-0">
                {productTiles.map((tile, index) => {
                  const Icon = tile.icon;
                  return (
                    <motion.div
                      key={tile.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      className="h-full w-[84vw] max-w-[24rem] flex-none self-stretch snap-start sm:w-[26rem] lg:w-[29rem] xl:w-[31rem]"
                    >
                      <div className="group h-full rounded-3xl">
                        <div className="glass-morphism glow-border h-[35rem] overflow-hidden rounded-3xl p-1 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)] md:h-[37rem]">
                          <div className="flex h-full flex-col">
                            <div className="relative mb-6 h-72 overflow-hidden rounded-2xl md:h-80">
                              <InstantImage
                                src={tile.image}
                                alt={tile.title}
                                priority={index < 2}
                                loading={index < 2 ? "eager" : "lazy"}
                                fetchPriority={index === 0 ? "high" : "auto"}
                                wrapperClassName="h-full w-full bg-slate-900"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-[#f8f6f6]/10 mix-blend-overlay" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/12 to-[#f8f6f6]/5" />
                            </div>

                            <div className="flex flex-1 flex-col px-6 pb-8">
                              <div className="mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(30,41,59,0.7)] text-zim-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                  <Icon className="h-5 w-5" strokeWidth={2} />
                                </span>
                                <h3 className="text-base font-black tracking-tight text-white">{tile.title}</h3>
                              </div>

                              <p className="text-[11px] font-light leading-relaxed text-white/70">{tile.description}</p>

                              <p className="mt-4 flex-grow text-[11px] font-light leading-relaxed text-white/70">
                                {tile.detail}
                              </p>

                              <div className="mt-8 flex items-end justify-between gap-4">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zim-gold">
                                    {tile.stats}
                                  </p>
                                  <p className="mt-1 text-[11px] font-light leading-relaxed text-white/60">{tile.eta}</p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleTileSelect(tile.id)}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  aria-label={`${tr("payments.tiles.action.select", "Select")}: ${tile.title}`}
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.35)] transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 group-hover:scale-105 group-hover:rotate-90"
                                >
                                  <Plus className="h-5 w-5" strokeWidth={2.6} />
                                  <span className="sr-only">{tr("payments.tiles.action.select", "Select")}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        ) : (
          <motion.section
            key={selectedProduct}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 sm:py-10 lg:px-10"
          >
            <div ref={productPanelRef} className="container relative mx-auto space-y-5 px-0">
              {selectedTile && (
                <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 text-white shadow-[0_20px_40px_rgba(2,6,23,0.45)] sm:p-6 md:p-8">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zim-gold">
                          {tr("payments.selection.label", "Selected service")}
                        </p>
                        <div className="mt-3 min-w-0">
                          <h2 className="!text-lg !font-black tracking-tight text-white md:!text-[1.2rem]">{selectedTile.title}</h2>
                          <p className="mt-1 text-sm font-light leading-relaxed text-white/72">{selectedTile.description}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSelectionCancel}
                        aria-label={tr("payments.form.actions.back", "Back")}
                        title={tr("payments.form.actions.back", "Back")}
                        className="inline-flex min-h-11 self-start items-center justify-center gap-2 rounded-full border border-white/30 bg-slate-950 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(15,23,42,0.35)] transition hover:bg-white hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                        <span>{tr("payments.form.actions.back", "Back")}</span>
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-[1.25fr_0.75fr_0.75fr]">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zim-gold">
                          {tr("payments.selection.next_step_label", "Next step")}
                        </p>
                        <p className="mt-2 text-[12px] font-light leading-relaxed text-white/72">{selectedTile.nextStep}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zim-gold">
                          {tr("payments.selection.delivery_label", "Delivery")}
                        </p>
                        <p className="mt-2 text-[12px] font-light leading-relaxed text-white/72">{selectedTile.stats}</p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zim-gold">
                          {tr("payments.selection.timing_label", "Timing")}
                        </p>
                        <p className="mt-2 text-[12px] font-light leading-relaxed text-white/72">{selectedTile.eta}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedProduct === "gift_cards" ? (
                <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 text-white shadow-[0_20px_40px_rgba(2,6,23,0.45)] sm:p-6 md:p-8">
                  <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
                    <div className="flex flex-col justify-between">
                      <div>
                        <h3 className="text-2xl font-black tracking-tight text-white">
                          {tr("payments.gift_cards.preview.title", "Digital Gift Cards")}
                        </h3>
                        <p className="mt-4 max-w-2xl text-sm font-light leading-relaxed text-white/72">
                          {tr(
                            "payments.gift_cards.preview.subtitle",
                            "Browse digital gift cards for brands available in Zimbabwe — including Boomplay, Razer Gold, Xbox, Roblox, PUBG Mobile, Free Fire, Mobile Legends, TikTok Coins, Discord Nitro, and AliExpress. Compare brands and denominations before you choose."
                          )}
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-3">
                          {[
                            {
                              title: tr("payments.gift_cards.preview.catalogue_title", "Zimbabwe-available brands"),
                              detail: tr(
                                "payments.gift_cards.preview.catalogue_detail",
                                "Gaming, music, streaming, and digital spending brands confirmed available for Zimbabwe recipients."
                              ),
                            },
                            {
                              title: tr("payments.gift_cards.preview.fee_title", "Compare denominations"),
                              detail: tr(
                                "payments.gift_cards.preview.fee_detail",
                                "View available denominations per brand before making a selection."
                              ),
                            },
                            {
                              title: tr("payments.gift_cards.preview.redemption_title", "Zimbabwe-confirmed brands"),
                              detail: tr(
                                "payments.gift_cards.preview.redemption_detail",
                                "Brands are filtered to those confirmed available for Zimbabwe recipients."
                              ),
                            },
                          ].map((item) => (
                            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-zim-gold">{item.title}</p>
                              <p className="mt-2 text-sm font-light leading-relaxed text-white/68">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zim-gold">
                          {tr("payments.gift_cards.preview.use_case_label", "When to use gift cards")}
                        </p>
                        <p className="mt-2 text-sm font-light leading-relaxed text-white/72">
                          {tr(
                            "payments.gift_cards.preview.use_case_copy",
                            "Gift cards work well for gaming credits, music subscriptions like Boomplay, or online spending when you want the value to go directly to a specific platform rather than open cash or airtime."
                          )}
                        </p>
                      </div>

                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={handleGiftCardBrowse}
                          aria-controls="gift-card-catalogue"
                          aria-expanded={giftCardCatalogueVisible}
                          disabled={giftCardCatalogueLoading}
                          className="inline-flex items-center gap-2 rounded-full bg-zim-gold px-6 py-3 text-sm font-black uppercase tracking-widest text-black transition-opacity hover:opacity-80"
                        >
                          {giftCardCatalogueLoading
                            ? tr("payments.gift_cards.preview.loading", "Loading Catalogue")
                            : tr("payments.gift_cards.preview.cta", "Browse Gift Cards")}
                          {giftCardCatalogueLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        </button>
                        <p className="mt-2 text-[11px] text-white/40">
                          {tr("payments.gift_cards.preview.cta_note", "Jump to the brand list below and compare popular denominations before you choose.")}
                        </p>
                      </div>
                    </div>

                    <div className="relative min-h-[21rem] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950">
                      <InstantImage
                        src="/images/pages/payments/paying-with-card.jpg"
                        alt={tr("payments.tiles.gift_cards.title", "Gift Cards")}
                        wrapperClassName="h-full w-full bg-slate-900"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/95 via-[#0f172a]/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zim-gold">
                          {tr("payments.gift_cards.preview.bottom_label", "Secure digital delivery")}
                        </p>
                        <p className="mt-3 max-w-sm text-sm font-light leading-relaxed text-white/82">
                          {tr(
                            "payments.gift_cards.preview.bottom_copy",
                            "Browse a wide range of digital cards, compare popular categories, and choose the right fit for the recipient before moving forward."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {giftCardCatalogueVisible && (
                      <motion.div
                        id="gift-card-catalogue"
                        ref={giftCardCatalogueRef}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                        className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zim-gold">
                              {tr("payments.gift_cards.catalogue.label", "Browse brands")}
                            </p>
                            <h4 className="mt-2 text-xl font-black tracking-tight text-white">
                              {tr("payments.gift_cards.catalogue.title", "Popular digital gift cards")}
                            </h4>
                          </div>
                          <p className="max-w-xl text-sm font-light leading-relaxed text-white/60">
                            {tr(
                              "payments.gift_cards.catalogue.subtitle",
                              "Use this catalogue to compare available brands and denominations before you choose the right card."
                            )}
                          </p>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {giftCardCatalogue.map((brand) => (
                            <div key={brand.productId} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {brand.logoUrl ? (
                                    <img src={brand.logoUrl} alt={brand.name} className="h-9 w-9 rounded-xl object-cover" />
                                  ) : null}
                                  <h5 className="text-base font-black tracking-tight text-white">{brand.name}</h5>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zim-gold">
                                  {brand.category}
                                </span>
                              </div>
                              <p className="mt-3 text-[11px] font-light leading-relaxed text-white/55">
                                {tr("payments.gift_cards.catalogue.denominations", "Common denominations")}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {brand.denominations.map((value) => (
                                  <span
                                    key={value}
                                    className="inline-flex min-h-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 text-[11px] font-semibold text-white/78"
                                  >
                                    {value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <ErrorBoundary>
                  <SendMoneyForm
                    key={selectedProduct}
                    forcedTransferType={selectedProduct === "airtime_topup" ? "airtime_topup" : "send_money"}
                    forcedRecipientType={isRemittanceProduct(selectedProduct) ? selectedProduct : null}
                    showTransferTypeSelector={false}
                    onTransactionSubmitted={loadPaymentHistory}
                  />
                </ErrorBoundary>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section className="bg-slate-950 px-4 pb-12 sm:px-6 lg:px-10">
        <div className="container mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 text-white shadow-[0_20px_40px_rgba(2,6,23,0.45)] sm:p-6 md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zim-gold">
                  {tr("payments.history.label", "Recent activity")}
                </p>
                <h2 className="mt-2 !text-lg font-black tracking-tight text-white md:!text-[1.2rem]">
                  {tr("payments.history.title", "Your recent payments")}
                </h2>
              </div>
              <p className="max-w-xl text-sm font-light leading-relaxed text-white/60">
                {tr("payments.history.subtitle", "Track recent remittances and airtime top-ups without saving transaction IDs manually.")}
              </p>
            </div>

            {!paymentHistoryEnabled ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm font-light leading-relaxed text-white/72">
                {tr("payments.history.login_prompt", "Sign in to view your recent remittances and airtime top-ups here.")}
              </div>
            ) : paymentHistoryLoading ? (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/72">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{tr("payments.history.loading", "Loading your recent payments...")}</span>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm font-light leading-relaxed text-white/72">
                {tr("payments.history.empty", "No recent remittances or airtime top-ups yet. Your confirmed activity will appear here.")}
              </div>
            ) : (
              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {paymentHistory.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black tracking-tight text-white">{item.title}</p>
                        <p className="mt-1 text-sm font-light leading-relaxed text-white/68">{item.detail}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zim-gold">{item.status}</span>
                    </div>
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <p className="text-base font-black tracking-tight text-white">{item.amountText}</p>
                      <p className="text-[11px] font-light text-white/50">{item.createdAtLabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
