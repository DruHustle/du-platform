import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronDown, LucideIcon } from "lucide-react";

// Section 1: Hero Configuration
interface HeroContent {
  currentBgIndex: number;
  heroBackgrounds: string[];
  navButtons: { href: string; label: string }[];
}

// Section 2: Intro/Objective Configuration
interface IntroContent {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface MainPageProps {
  hero: HeroContent;
  intro: IntroContent;
}

export default function MainPageHero({ hero, intro }: MainPageProps) {
  const { t } = useTranslation();
  const { icon: Icon } = intro;

  return (
    <div id="main-page-hero-wrapper" className="flex flex-col w-full">
      
      {/* SECTION 1: CINEMATIC HERO */}
      <section className="relative h-screen min-h-[700px] w-full flex items-center justify-center overflow-hidden bg-slate-950">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={hero.currentBgIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0, filter: "blur(15px)" }}
            transition={{ opacity: { duration: 1.5 }, scale: { duration: 20, ease: "linear" } }}
            className="absolute inset-0 z-0"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('${hero.heroBackgrounds[hero.currentBgIndex]}')` }}
            />
            
            {/* REDUCED TINT GRADIENT: 
                Changed 'from' to 40% for light top shadow, 
                'via' to transparent for image clarity,
                'to' stays dark to blend into the footer/intro sections.
            */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-20 container mx-auto px-6 flex flex-col items-center justify-center">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1.2 }} 
            className="mb-8 md:mb-12"
          >
            <img 
              src="/images/pages/shared/made_in_zimbabwe.png" 
              alt="Made in Zimbabwe" 
              className="h-16 md:h-20 object-contain drop-shadow-2xl" 
            />
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
            {t('home.hero_subtitle')}
          </motion.p>  
                
          {/* Nav Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 1.2 }} 
            className="mt-10 flex flex-col sm:flex-row gap-5 items-center"
          >
            {hero.navButtons.map((item) => (
              <Link key={item.href} href={item.href}>
              <Button
                variant="outline"
                className="
                  group relative h-14 px-5 rounded-full overflow-hidden border-none
                  bg-white/[0.1] backdrop-blur-xl
                  text-white text-xs font-black uppercase
                  shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)]
                  transition-all duration-500 
                  hover:scale-105 active:scale-95 min-w-[180px]
                  
                  /* THE WHITE GLOW EFFECT */
                  hover:bg-white/[0.2] 
                  hover:shadow-[0_0_30px_rgba(255,255,255,0.4),inset_0_0_10px_rgba(255,255,255,0.2)]
                  hover:text-white
                "
              >
                {/* Animated White Border Glow Overlay */}
                <span className="absolute inset-0 rounded-full border border-white/20 group-hover:border-white/60 transition-colors duration-500 pointer-events-none" />
                
                {/* Radial Gradient Glow for the shimmer */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <span className="relative z-10">{t(item.label)}</span>
              </Button>
              </Link>
            ))}
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 1.8, duration: 1, type: "spring" }} 
            className="mt-14 md:mt-20"
          >
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-white/60 cursor-pointer group hover:text-zim-gold transition-colors duration-300" 
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
            >
              <span className="text-[10px] uppercase tracking-[0.5em] font-black drop-shadow-md">
                Explore
              </span>
              <ChevronDown size={28} strokeWidth={1.5} className="group-hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
            </motion.div>
          </motion.div>
        </div>

        {/* REFINED INNER VIGNETTE: Reduced from 0.8 to 0.4 for less "muddy" edges */}
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_20vw_rgba(0,0,0,0.4)]" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent z-10" />
      </section>

      {/* SECTION 2: GLASSY INTRO */}
      <section className="py-8 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative py-6 px-8 md:px-16 rounded-[2.5rem] overflow-hidden border border-white/10 backdrop-blur-3xl bg-white/[0.03] shadow-2xl transition-all duration-500"
            >
              <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center space-y-3">
                <Icon className="h-6 w-6 text-zim-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.5)]" />
                <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-2xl mx-auto mb-4">
                  {t(intro.description)}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-zim-gold/40" />
                  <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                    {t(intro.title)}
                  </p>
                  <div className="h-px w-8 bg-zim-gold/40" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}