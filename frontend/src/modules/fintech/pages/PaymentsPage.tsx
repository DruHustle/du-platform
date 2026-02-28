import { useMemo, useState } from "react";
import { ArrowRightLeft, CreditCard, Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import SubPageHero from "@/components/SubPageHero";
import SendMoneyForm from "@/components/SendMoneyForm";

type TransferType = "send_money" | "airtime_topup";

export default function Payments() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [heroTransferType, setHeroTransferType] = useState<TransferType | null>(null);

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
        buttons: [
          {
            text: tr("payments.hero.actions.send_money", "Start Send Money"),
            variant: "primary",
            link: "#send-money",
            showArrow: true,
            onClick: () => setHeroTransferType("send_money"),
          },
          {
            text: tr("payments.hero.actions.airtime", "Top Up Airtime"),
            variant: "outline",
            link: "#send-money",
            onClick: () => setHeroTransferType("airtime_topup"),
          },
        ],
      },
      {
        image: "/images/pages/payments/cash-transfer-counter.jpg",
        badge: tr("payments.hero.slide_2.badge", "Cash Pickup Network"),
        badgeIcon: Landmark,
        title: tr("payments.hero.slide_2.title", "Remittance"),
        titleHighlight: tr("payments.hero.slide_2.highlight", "Corridors"),
        subtitle: tr(
          "payments.hero.slide_2.subtitle",
          "Support beneficiaries through mobile money, cash pickup, and card payout rails."
        ),
        description: tr(
          "payments.hero.slide_2.description",
          "Designed for fast diaspora support with operational controls and payout channel flexibility."
        ),
      },
      {
        image: "/images/pages/payments/send-receive-money-app.jpg",
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
        badge: tr("payments.hero.slide_4.badge", "Card Deposits"),
        badgeIcon: CreditCard,
        title: tr("payments.hero.slide_4.title", "Visa Debit"),
        titleHighlight: tr("payments.hero.slide_4.highlight", "Payouts"),
        subtitle: tr("payments.hero.slide_4.subtitle", "Route eligible transfers directly to supported Visa debit cards."),
        description: tr(
          "payments.hero.slide_4.description",
          "Structured payment experiences with clear status visibility from initiation to completion."
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

  const introData = {
    icon: Wallet,
    title: tr("payments.intro.title", "Cross-Border Payments"),
    description:
      tr(
        "payments.intro.description",
        "Diaspora Unlocked integrates trusted financial partners to provide secure remittances, family care, and coverage services for Zimbabweans abroad."
      ),
  };

  const paymentProcessTiles = [
    {
      emoji: "🔐",
      title: tr("payments.process.details.title", "Add Details"),
      description:
        tr(
          "payments.process.details.description",
          "Enter recipient and payout details. Inputs are validated and financial calls are protected server-side."
        ),
    },
    {
      emoji: "🛡️",
      title: tr("payments.process.review.title", "Review and Protect"),
      description:
        tr(
          "payments.process.review.description",
          "Confirm amount, fees, and FX preview. KYC and transaction controls are checked before submission."
        ),
    },
    {
      emoji: "💳",
      title: tr("payments.process.pay.title", "Pay"),
      description:
        tr(
          "payments.process.pay.description",
          "Approve the transfer to initiate provider processing. Status updates track progress from pending to completion."
        ),
    },
    {
      emoji: "✅",
      title: tr("payments.process.collect.title", "Collect"),
      description:
        tr(
          "payments.process.collect.description",
          "Recipient collects funds or receives airtime. Reflect times vary by channel and provider checks."
        ),
    },
  ];

  const trustHighlights = [
    tr("payments.highlights.secure", "Secure"),
    tr("payments.highlights.transparent_fees", "Transparent fees"),
    tr("payments.highlights.trackable_status", "Trackable status"),
  ];

  return (
    <Layout>
      <SubPageHero heroSlides={heroSlides} intro={introData} />

      <section className="p-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container mx-auto px-6 space-y-6">
          <div className="outer-glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10 shadow-[0_20px_40px_rgba(2,6,23,0.45)]">
            <div className="relative z-10">
              <div className="mb-10 text-center">
                <div className="flex items-center justify-center gap-3 mb-5">
                  <ShieldCheck className="h-6 w-6 text-zim-gold" />
                  <h3 className="text-xl font-black text-white tracking-tight">{tr("nav.payments", "Payments")}</h3>
                </div>
                <p className="text-sm text-white/75 font-light leading-relaxed">
                  {tr(
                    "payments.process.intro",
                    "Follow a clear four-step journey: add details, review, pay, and collect. Security is applied at every stage with server-side processing, compliance checks, and traceable transaction references. Airtime is often near-instant, while mobile money, card, and cash pickup can take longer depending on provider processing windows."
                  )}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {trustHighlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>



              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {paymentProcessTiles.map((tile) => (
                  <div
                    key={tile.title}
                    className="group rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4 text-center transition-all duration-500 hover:bg-slate-950/60"
                  >
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 p-2">
                      <span className="text-2xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{tile.emoji}</span>
                    </div>
                    <h3 className="mb-1 text-[15px] font-black tracking-tight text-white">{tile.title}</h3>
                    <p className="text-[11px] font-light leading-snug text-white/50">{tile.description}</p>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-white/55">
                {tr(
                  "payments.disclaimer",
                  "Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds."
                )}
              </p>
            </div>
          </div>

          <div id="send-money" className="pt-5 scroll-mt-32">
            <SendMoneyForm forcedTransferType={heroTransferType} />
          </div>
        </div>
      </section>
    </Layout>
  );
}
