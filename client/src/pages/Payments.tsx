import { useMemo } from "react";
import { ArrowRightLeft, CreditCard, Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import Layout from "@/components/Layout";
import SubPageHero from "@/components/SubPageHero";
import SendMoneyForm from "@/components/SendMoneyForm";

export default function Payments() {
  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/payments/mobile-payment-terminal.jpg",
        badge: "Secure Checkout",
        badgeIcon: ShieldCheck,
        title: "Global Payments",
        titleHighlight: "Built Right",
        subtitle: "Bank-grade remittance and airtime flows for diaspora families.",
        description: "Move money confidently with protected server-side processing and clear transaction tracking.",
        buttons: [
          { text: "Start Send Money", variant: "primary", link: "#send-money", showArrow: true },
          { text: "Top Up Airtime", variant: "outline", link: "#send-money" },
        ],
      },
      {
        image: "/images/pages/payments/cash-transfer-counter.jpg",
        badge: "Cash Pickup Network",
        badgeIcon: Landmark,
        title: "Remittance",
        titleHighlight: "Corridors",
        subtitle: "Support beneficiaries through mobile money, cash pickup, and card payout rails.",
        description: "Designed for fast diaspora support with operational controls and payout channel flexibility.",
      },
      {
        image: "/images/pages/payments/send-receive-money-app.jpg",
        badge: "Mobile First",
        badgeIcon: Smartphone,
        title: "Airtime",
        titleHighlight: "Top-Ups",
        subtitle: "Detect operators and complete mobile top-ups with a simple, guided flow.",
        description: "Reliable operator lookup and amount options reduce failed transactions and improve speed.",
      },
      {
        image: "/images/pages/payments/visa-debit-cards.jpg",
        badge: "Card Deposits",
        badgeIcon: CreditCard,
        title: "Visa Debit",
        titleHighlight: "Payouts",
        subtitle: "Route eligible transfers directly to supported Visa debit cards.",
        description: "Structured payment experiences with clear status visibility from initiation to completion.",
      },
      {
        image: "/images/pages/payments/smartphone-with-money.jpg",
        badge: "Digital Wallets",
        badgeIcon: Wallet,
        title: "Everyday",
        titleHighlight: "Liquidity",
        subtitle: "Keep households connected with on-demand digital value transfer.",
        description: "From monthly support to urgent needs, payments stay traceable and easy to confirm.",
      },
      {
        image: "/images/pages/payments/paying-with-card.jpg",
        badge: "Consistent UX",
        badgeIcon: ArrowRightLeft,
        title: "Trusted",
        titleHighlight: "Execution",
        subtitle: "Professional payment tools aligned with the Diaspora Unlocked platform design system.",
        description: "Unified visual flow across remittance and airtime modules improves clarity and confidence.",
      },
    ],
    []
  );

  const introData = {
    icon: Wallet,
    title: "Cross-Border Payments",
    description:
      "Send remittances and airtime securely through licensed financial infrastructure providers with transparent steps, controlled payout channels, and status-driven confirmations.",
  };

  const paymentProcessTiles = [
    {
      emoji: "🔐",
      title: "Add Details",
      description:
        "Enter recipient and payout details. Inputs are validated and financial calls are protected server-side.",
    },
    {
      emoji: "🛡️",
      title: "Review and Protect",
      description:
        "Confirm amount, fees, and FX preview. KYC and transaction controls are checked before submission.",
    },
    {
      emoji: "💳",
      title: "Pay",
      description:
        "Approve the transfer to initiate provider processing. Status updates track progress from pending to completion.",
    },
    {
      emoji: "✅",
      title: "Collect",
      description:
        "Recipient collects funds or receives airtime. Reflect times vary by channel and provider checks.",
    },
  ];

  return (
    <Layout>
      <SubPageHero heroSlides={heroSlides} intro={introData} />

      <section className="p-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container mx-auto px-6 space-y-6">

          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <ShieldCheck className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">Payments</h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                Follow a clear four-step journey: add details, review, pay, and collect. Security is applied at every stage with
                server-side processing, compliance checks, and traceable transaction references. Airtime is often near-instant, while
                mobile money, card, and cash pickup can take longer depending on provider processing windows.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {paymentProcessTiles.map((tile) => (
                <div
                  key={tile.title}
                  className="group rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 text-center transition-all duration-500 hover:bg-slate-950/60"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 p-2.5">
                    <span className="text-3xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{tile.emoji}</span>
                  </div>
                  <h3 className="mb-2 text-base font-black tracking-tight text-white">{tile.title}</h3>
                  <p className="text-[11px] font-light leading-snug text-white/40">{tile.description}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-[11px] leading-relaxed text-white/55">
              Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.
            </p>
          </div>

          <div id="send-money" className="pt-5 scroll-mt-32">
            <SendMoneyForm />
          </div>
        </div>
      </section>
    </Layout>
  );
}
