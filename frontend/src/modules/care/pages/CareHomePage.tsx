import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import SubPageHero from "@/components/SubPageHero";
import { api } from "@/lib/api";
import { HeartHandshake, ShieldCheck, Users, Globe2, Home } from "lucide-react";
import WhyItMatters from "@/modules/care/components/WhyItMatters";
import CoverageCards from "@/modules/care/components/CoverageCards";
import HowItWorks from "@/modules/care/components/HowItWorks";
import CallToAction from "@/modules/care/components/CallToAction";

const CARE_PROVIDER = "nyaradzo";
const DEFAULT_ONBOARDING_URL = "https://www.nyaradzo.co.zw/";

function buildReferralId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `du-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildOnboardingUrl(baseUrl: string, referralId: string, userId: number | null) {
  const normalizedBase = String(baseUrl || DEFAULT_ONBOARDING_URL).trim() || DEFAULT_ONBOARDING_URL;
  try {
    const url = new URL(normalizedBase);
    url.searchParams.set("referral_id", referralId);
    if (userId) url.searchParams.set("user_id", String(userId));
    url.searchParams.set("source", "diaspora_unlocked");
    return url.toString();
  } catch {
    const separator = normalizedBase.includes("?") ? "&" : "?";
    const userPart = userId ? `&user_id=${encodeURIComponent(String(userId))}` : "";
    return `${normalizedBase}${separator}referral_id=${encodeURIComponent(referralId)}${userPart}&source=diaspora_unlocked`;
  }
}

export default function CareHomePage() {
  const { t } = useTranslation();
  const [userId, setUserId] = useState<number | null>(null);
  const referralId = useMemo(() => buildReferralId(), []);
  const onboardingBaseUrl = String(import.meta.env.VITE_NYARADZO_ONBOARDING_URL || DEFAULT_ONBOARDING_URL).trim();

  const onboardingUrl = useMemo(
    () => buildOnboardingUrl(onboardingBaseUrl, referralId, userId),
    [onboardingBaseUrl, referralId, userId]
  );

  useEffect(() => {
    let mounted = true;
    api
      .get("/auth/me")
      .then((response) => {
        if (!mounted) return;
        const id = Number(response?.data?.user?.id);
        setUserId(Number.isFinite(id) && id > 0 ? id : null);
      })
      .catch(() => {
        if (!mounted) return;
        setUserId(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const logReferralClick = useCallback(() => {
    if (!userId) return;
    void api.post("/care/referrals", { provider: CARE_PROVIDER, referral_id: referralId }).catch(() => {});
  }, [referralId, userId]);

  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/care/family-gathering-zimbabwe.jpg",
        badge: t("care.hero.slide_1.badge", { defaultValue: "Family Care Partner" }),
        badgeIcon: ShieldCheck,
        title: t("care.hero.slide_1.title", { defaultValue: "Protect Family" }),
        titleHighlight: t("care.hero.slide_1.highlight", { defaultValue: "With Confidence" }),
        subtitle: t("care.hero.slide_1.subtitle", {
          defaultValue: "Diaspora-linked funeral cover powered by trusted local delivery with Nyaradzo.",
        }),
        description: t("care.hero.slide_1.description", {
          defaultValue: "Support loved ones at home with reliable onboarding and transparent care pathways.",
        }),
      },
      {
        image: "/images/pages/care/family-eating-zimbabwe.jpg",
        badge: t("care.hero.slide_2.badge", { defaultValue: "Respect and Dignity" }),
        badgeIcon: HeartHandshake,
        title: t("care.hero.slide_2.title", { defaultValue: "Care That" }),
        titleHighlight: t("care.hero.slide_2.highlight", { defaultValue: "Feels Human" }),
        subtitle: t("care.hero.slide_2.subtitle", {
          defaultValue: "Give elders and dependants dependable support from wherever you live.",
        }),
        description: t("care.hero.slide_2.description", {
          defaultValue: "Designed for diaspora families who need practical, trusted and culturally grounded cover.",
        }),
      },
      {
        image: "/images/pages/care/tonga-family-time-zimbabwe.jpg",
        badge: t("care.hero.slide_3.badge", { defaultValue: "Diaspora Connected" }),
        badgeIcon: Globe2,
        title: t("care.hero.slide_3.title", { defaultValue: "Global Families" }),
        titleHighlight: t("care.hero.slide_3.highlight", { defaultValue: "One Care Path" }),
        subtitle: t("care.hero.slide_3.subtitle", {
          defaultValue: "Manage cover remotely while staying present in family decisions at home.",
        }),
        description: t("care.hero.slide_3.description", {
          defaultValue: "The Care module keeps support clear and coordinated across borders.",
        }),
      },
      {
        image: "/images/pages/care/handshake-men.jpg",
        badge: t("care.hero.slide_4.badge", { defaultValue: "Peace of Mind" }),
        badgeIcon: Home,
        title: t("care.hero.slide_4.title", { defaultValue: "Protect Home" }),
        titleHighlight: t("care.hero.slide_4.highlight", { defaultValue: "From Abroad" }),
        subtitle: t("care.hero.slide_4.subtitle", {
          defaultValue: "Keep family care stable through structured and transparent cover options.",
        }),
        description: t("care.hero.slide_4.description", {
          defaultValue: "Built for monthly diaspora commitments and long-term household resilience.",
        }),
      },
      {
        image: "/images/pages/care/woman-smiling-laptop.jpg",
        badge: t("care.hero.slide_5.badge", { defaultValue: "Trusted Execution" }),
        badgeIcon: Users,
        title: t("care.hero.slide_5.title", { defaultValue: "Local Partner" }),
        titleHighlight: t("care.hero.slide_5.highlight", { defaultValue: "Reliable Service" }),
        subtitle: t("care.hero.slide_5.subtitle", {
          defaultValue: "Nyaradzo delivers local service operations for dependable family support.",
        }),
        description: t("care.hero.slide_5.description", {
          defaultValue: "Integrated onboarding gives one clear path from selection to activation.",
        }),
      },
      {
        image: "/images/pages/care/team-meeting.jpg",
        badge: t("care.hero.slide_6.badge", { defaultValue: "Designed for Diaspora" }),
        badgeIcon: ShieldCheck,
        title: t("care.hero.slide_6.title", { defaultValue: "Family Assurance" }),
        titleHighlight: t("care.hero.slide_6.highlight", { defaultValue: "Made Simple" }),
        subtitle: t("care.hero.slide_6.subtitle", {
          defaultValue: "Access family cover through a secure, familiar Diaspora Gateway experience.",
        }),
        description: t("care.hero.slide_6.description", {
          defaultValue: "Move from account access to active cover with minimal friction.",
        }),
      },
    ],
    [t]
  );

  return (
    <Layout>
      <SubPageHero heroSlides={heroSlides} />

      <section id="care-content" className="p-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container mx-auto px-6 space-y-11">
          <div className="outer-glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 md:p-8 lg:p-10 space-y-10 shadow-[0_20px_40px_rgba(2,6,23,0.45)]">
            <WhyItMatters />
            <CoverageCards />
          </div>

          <div className="outer-glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 md:p-8 lg:p-10 shadow-[0_20px_40px_rgba(2,6,23,0.45)]">
            <HowItWorks />
          </div>

          <div id="care-start" className="scroll-mt-32">
            <CallToAction onboardingUrl={onboardingUrl} onCtaClick={logReferralClick} />
          </div>
        </div>
      </section>
    </Layout>
  );
}
