import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";

// Section 1: Hero Configuration
interface HeroContent {
  currentBgIndex: number;
  heroBackgrounds: string[];
}

interface MainPageProps {
  hero: HeroContent;
}

export default function MainPageHero({ hero }: MainPageProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div id="main-page-hero-wrapper" className="flex flex-col w-full">
      
      {/* SECTION 1: CINEMATIC HERO */}
      <section className="relative h-screen min-h-[700px] w-full flex items-center justify-center overflow-hidden bg-slate-950">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={hero.currentBgIndex}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(8px)" }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { opacity: { duration: 0.9 }, scale: { duration: 10, ease: "linear" } }}
            className="absolute inset-0 z-0"
          >
            <img
              src={hero.heroBackgrounds[hero.currentBgIndex]}
              alt=""
              aria-hidden="true"
              loading="eager"
              fetchPriority={hero.currentBgIndex === 0 ? "high" : "auto"}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 container mx-auto px-6 flex flex-col items-center justify-center">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1.2 }} 
            id="home-hero-logo"
            className="mb-8 md:mb-12"
          >
            <div className="relative inline-flex h-20 w-20 items-center justify-center md:h-28 md:w-28">
              <span className="pointer-events-none absolute inset-0 rounded-[1.75rem] md:rounded-full border border-white/25 bg-slate-950/30 backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.35)]" />
              <img
                src="/images/pages/shared/diaspora_unlocked.png"
                alt="Diaspora Unlocked"
                className="relative h-16 scale-[1.12] md:h-20 md:scale-100 object-contain drop-shadow-2xl"
              />
            </div>
          </motion.div>
          
          {/* Headline - Added shadow for legibility against lighter background */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1, delay: 0.4 }}
            className="text-[12vw] sm:text-[14rem] md:text-[18rem] lg:text-[22rem] xl:text-[26rem] font-black text-white leading-[0.75] text-center uppercase tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
          >
            {t('home.hero_title')}
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ duration: 1.2, delay: 0.8 }}
            className="mt-15 text-lg md:text-xl font-bold text-white max-w-2xl text-center drop-shadow-md"
          >
            {t('home.hero_subtitle')}.
          </motion.p>  

          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 1.8, duration: 1, type: "spring" }} 
            className="mt-32 md:mt-20"
          >
            <motion.button
              type="button"
              animate={prefersReducedMotion ? undefined : { y: [0, 12, 0] }}
              transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 cursor-pointer border-0 bg-transparent text-white"
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: prefersReducedMotion ? "auto" : "smooth" })}
            >
              <span className="text-[10px] uppercase tracking-[0.5em] font-black text-white drop-shadow-md">
                Explore
              </span>
              <ChevronDown size={28} strokeWidth={1.5} className="text-white" />
            </motion.button>
          </motion.div>
        </div>

        {/* REFINED INNER VIGNETTE: Reduced from 0.8 to 0.4 for less "muddy" edges */}
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_20vw_rgba(0,0,0,0.4)]" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent z-10" />
      </section>
    </div>
  );
}
