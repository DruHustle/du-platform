import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import InstantImage from "@/components/InstantImage";
import WaterfallBackdrop from "./WaterfallBackdrop";

export default function MainPageHero() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div id="main-page-hero-wrapper" className="flex flex-col w-full">
      {/* SECTION 1: CINEMATIC HERO */}
      <section className="relative min-h-[max(40rem,100svh)] py-28 w-full flex items-center justify-center overflow-hidden bg-slate-950">
        <WaterfallBackdrop />

        <div
          className="absolute inset-0 z-10 bg-slate-950/35"
          aria-hidden="true"
        />

        <div className="relative z-20 container mx-auto translate-y-15 px-6 flex flex-col items-center justify-center text-center md:translate-y-18">
          {/* Place the brand mark at the former heading position. */}
          <motion.div
            id="home-hero-logo"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            className="mb-0"
          >
            <div className="relative inline-flex h-20 w-20 items-center justify-center md:h-28 md:w-28">
              <span className="pointer-events-none absolute inset-0 rounded-[1.75rem] border border-white/25 bg-slate-950/30 backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.35)]" />
              <InstantImage
                src="/images/brand/diaspora_unlocked_336.webp"
                alt={t("brand", { defaultValue: "Diaspora Unlocked" })}
                priority
                wrapperClassName="relative overflow-visible bg-transparent"
                placeholderClassName="bg-transparent animate-none"
                className="relative md:h-24 md:scale-[1.05] object-contain drop-shadow-2xl"
              />
            </div>
          </motion.div>

          <h1 className="sr-only">{t("home.hero_title")}</h1>

          {/* Subtitle */}
          <motion.p
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.7, ease: "easeOut" }}
            className="mt-6 text-lg md:text-xl font-bold text-white max-w-2xl text-center drop-shadow-md"
          >
            {t("home.hero_subtitle")}
          </motion.p>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/90">
            {t("pilot.home_purpose")}
          </p>
          {/* Scroll Indicator */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 1, type: "spring" }}
            className="mt-12 md:mt-16"
          >
            <button
              type="button"
              className="flex min-h-11 flex-col items-center gap-2 rounded cursor-pointer border-0 bg-transparent text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zim-gold"
              onClick={() =>
                document.getElementById("explore-platform")?.scrollIntoView({
                  behavior: prefersReducedMotion ? "instant" : "smooth",
                  block: "start",
                })
              }
            >
              <span className="text-[10px] uppercase tracking-[0.5em] font-black text-white drop-shadow-md">
                {t("home.explore_now")}
              </span>
              <motion.span
                aria-hidden="true"
                className="inline-flex"
                animate={prefersReducedMotion ? undefined : { y: [0, 12, 0] }}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
              >
                <ChevronDown
                  size={28}
                  strokeWidth={1.5}
                  className="text-white"
                />
              </motion.span>
            </button>
          </motion.div>
        </div>

        {/* REFINED INNER VIGNETTE: Reduced from 0.8 to 0.4 for less "muddy" edges */}
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_20vw_rgba(0,0,0,0.4)]" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent z-10" />
      </section>
    </div>
  );
}
