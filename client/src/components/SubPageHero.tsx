import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ArrowRight, Globe, Icon, LucideIcon, ChevronDown } from 'lucide-react';

interface HeroButton {
  text: string;
  link?: string;
  variant?: "primary" | "outline" | string;
  showArrow?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

interface HeroSlide {
  image: string;
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  titleHighlight?: string;
  subtitle?: string;
  subtitleHighlightIcon?: LucideIcon;
  description?: string;
  descriptionIcon?: LucideIcon;
  buttons?: HeroButton[];
}

// Section 2: Intro/Objective Configuration
interface IntroContent {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface SubPageHeroProps {
  heroSlides: HeroSlide[];
  intro: IntroContent;
}

export default function SubPageHero({ heroSlides, intro }: SubPageHeroProps) {

  //Initialize the translation hook
  const { t } = useTranslation();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    if (!heroSlides || heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroSlides]);

  const current = heroSlides[currentHeroIndex];

  const resolveText = (value?: string) => {
    if (!value) return "";
    const translated = t(value);
    if (!translated || translated === value) return value;
    return translated;
  };

  // Helper to render icons from the heroSlides array
  const renderIcon = (IconInput: any, className: string) => {
    if (!IconInput) return null;
    return <IconInput className={className} />;
  };

  // Extract the intro icon into a capitalized variable 
  // so React recognizes it as a component.
  const IntroIcon = intro?.icon;

  if (!current) return null;

  return (

    <div id="sub-page-hero-wrapper" className="flex flex-col w-full">
      
      {/* SECTION 1: CINEMATIC HERO */}
      <section className="relative h-[80vh] min-h-[650px] w-full flex items-center justify-center overflow-hidden bg-slate-950">
        {/* BACKGROUND LAYER - Cinematic Scale & Reduced Tint */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`bg-${currentHeroIndex}`}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1.02 }} // Tighter final scale for crisper look
            exit={{ opacity: 0, filter: "blur(15px)" }}
            transition={{ 
              opacity: { duration: 1.5, ease: "easeInOut" },
              scale: { duration: 20, ease: "linear" } 
            }}
            className="absolute inset-0 z-0 saturate-[1.1] brightness-[1.05]"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('${current.image}')` }}
            />
            
            {/* OPTIMIZED GRADIENTS - Cleared center for Image Pop */}
            {/* Left vignette for text legibility, but reduced via-opacity */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/20 to-transparent" />
            
            {/* Subtle top/bottom grounding */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-transparent to-slate-950/90" />
          </motion.div>
        </AnimatePresence>
        
        {/* CONTENT LAYER */}
        <div className="relative z-20 container mx-auto px-6 md:px-12 h-full flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl"
            >
              {/* 1. BADGE */}
              {(current.badge || current.badgeIcon) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 mb-6 drop-shadow-md"
                >
                  {renderIcon(current.badgeIcon, "h-5 w-5 text-zim-gold")}
                  <span className="text-zim-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] border-l border-zim-gold/50 pl-4">
                    {current.badge}
                  </span>
                </motion.div>
              )}
              
              {/* 2. TITLE - Added Drop Shadow for legibility on vibrant images */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter mb-6 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                {current.title}
                {current.titleHighlight && (
                  <span className="text-zim-gold opacity-95 italic font-serif capitalize tracking-normal ml-3">
                    {current.titleHighlight}
                  </span>
                )}
              </h1>
              
              {/* 3. SUBTITLE & DESCRIPTION */}
              <div className="max-w-3xl space-y-4 mb-10 drop-shadow-lg">
                {current.subtitle && (
                  <p className="text-xl md:text-2xl text-white font-medium tracking-tight">
                    {current.subtitle}
                  </p>
                )}
                {current.description && (
                  <p className="text-base md:text-lg text-white/80 leading-relaxed font-light">
                    {current.description}
                  </p>
                )}
              </div>

              {/* 4. BUTTONS */}
              <div className="flex flex-wrap gap-4">
                {current.buttons?.filter((btn) => Boolean(btn.link)).map((btn, idx) => (
                  <Button 
                    key={idx}
                    variant="outline"
                    className={`
                      h-14 px-10 rounded-full transition-all duration-500 text-xs font-bold uppercase tracking-[0.2em]
                      ${btn.variant === "primary" 
                        ? "bg-zim-gold border-zim-gold text-black hover:bg-white hover:border-white" 
                        : "bg-white/10 border-white/20 text-white hover:bg-white hover:text-black"}
                      hover:scale-105 active:scale-95 backdrop-blur-md shadow-2xl
                    `}
                    asChild
                  >
                    <a href={btn.link} onClick={btn.onClick}>
                      <span className="relative z-10 flex items-center">
                        {btn.text}
                        {btn.showArrow && <ArrowRight className="ml-2 h-4 w-4" />}
                      </span>
                    </a>
                  </Button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* REFINED INDICATORS */}
        {heroSlides.length > 1 && (
          <div className="absolute bottom-12 left-6 md:left-12 flex items-center gap-4 z-30">
            {heroSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentHeroIndex(idx)}
                className="group py-4"
              >
                <div className={`h-[2px] transition-all duration-700 rounded-full ${
                  idx === currentHeroIndex 
                    ? 'bg-zim-gold w-12 shadow-[0_0_8px_rgba(212,175,55,0.8)]' 
                    : 'bg-white/20 w-6 group-hover:bg-white/40'
                }`} />
              </button>
            ))}
          </div>
        )}

        {/* Global Polish - Reduced Vignette for Clarity */}
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_15vw_rgba(0,0,0,0.4)]" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-950 to-transparent z-10" />
      </section>


      {/* SECTION 2: GLASSY INTRO */}
      <section className="py-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative py-6 px-8 md:px-16 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group"
            >
               <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
               
              <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center space-y-3">
               {IntroIcon && <IntroIcon className="h-6 w-6 text-zim-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.5)]" />}
                <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-2xl mx-auto mb-4">
                  {resolveText(intro.description)}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-zim-gold/40" />
                  <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                    {resolveText(intro.title)}
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
