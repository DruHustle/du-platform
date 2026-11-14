import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import InstantImage from "@/components/InstantImage";
import WaterfallBackdrop from "./WaterfallBackdrop";

export default function MainPageHero() {
  const { t } = useTranslation();
  return (
    <div id="main-page-hero-wrapper">
      <section className="relative flex min-h-[min(48rem,92svh)] items-center justify-center overflow-hidden bg-slate-950 px-5 pb-16 pt-28 text-center text-white">
        <WaterfallBackdrop />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/60 to-slate-950/85" aria-hidden="true" />
        <div className="relative z-20 mx-auto flex max-w-3xl flex-col items-center">
          <div id="home-hero-logo" className="mb-5">
            <InstantImage src="/images/brand/diaspora_unlocked_336.webp" alt={t("brand")} priority
              wrapperClassName="h-16 w-16 rounded-2xl border border-white/25 bg-slate-950/35 md:h-20 md:w-20"
              placeholderClassName="bg-transparent" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-balance text-4xl font-bold leading-tight drop-shadow-md md:text-6xl">{t("home.hero_title")}</h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-white md:text-xl">{t("home.hero_subtitle")}</p>
          <div className="mt-7 flex w-full flex-wrap justify-center gap-3">
            <Button asChild className="min-h-12 bg-zim-gold px-6 font-bold text-slate-950 hover:bg-yellow-300">
              <Link href="/travel/flights">{t("home.flights_action")}</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-12 border-white bg-slate-950/65 px-6 font-bold text-white hover:bg-slate-800 hover:text-white">
              <Link href="/travel/stays">{t("home.stays_action")}</Link>
            </Button>
          </div>
          <a className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-white underline underline-offset-4" href="#explore-platform">{t("home.explore_now")}</a>
        </div>
      </section>
    </div>
  );
}
