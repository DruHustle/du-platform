import { useMemo, useState } from "react";
import { ArrowRightLeft, CreditCard, Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import SubPageHero from "@/components/SubPageHero";
import SendMoneyForm from "@/modules/fintech/components/SendMoneyForm";

type TransferType = "send_money" | "airtime_topup";

export default function Payments() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [heroTransferType, setHeroTransferType] = useState<TransferType | null>(null);
  const processTileTitleClass = "mb-2 text-base font-black tracking-tight text-white";
  const processTileBodyClass = "text-[11px] font-light leading-relaxed text-white/70";

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

  return (
    <Layout>
      <SubPageHero heroSlides={heroSlides} />

      <section className="p-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-6 space-y-6">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="relative z-10">
              <div className="mb-10 text-center">
                <div className="flex items-center justify-center gap-3 mb-5">
                  <ShieldCheck className="h-6 w-6 text-zim-gold" />
                  <h3 className="text-xl font-black text-white tracking-tight">{tr("nav.payments", "Payments")}</h3>
                </div>
                <p className="mx-auto max-w-3xl text-sm text-white/75 font-light leading-relaxed">
                  {tr(
                    "payments.process.intro",
                    "Follow a clear four-step journey: add details, review, pay, and collect. Security is applied at every stage with server-side processing, compliance checks, and traceable transaction references. Airtime is often near-instant, while mobile money, card, and cash pickup can take longer depending on provider processing windows."
                  )}
                </p>
                <p className="mx-auto mt-3 max-w-3xl text-[11px] font-light leading-relaxed text-white/60">
                  {tr(
                    "payments.disclaimer",
                    "Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds."
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {paymentProcessTiles.map((tile) => (
                  <div
                    key={tile.title}
                    className="group flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 text-center transition-all duration-500 hover:bg-slate-950/60"
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 p-2.5">
                      <span className="text-3xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{tile.emoji}</span>
                    </div>
                    <h3 className={processTileTitleClass}>{tile.title}</h3>
                    <p className={processTileBodyClass}>{tile.description}</p>
                  </div>
                ))}
              </div>
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
