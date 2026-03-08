import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, LucideIcon } from 'lucide-react';

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

interface SubPageHeroProps {
  heroSlides: HeroSlide[];
  heroHeightClassName?: string;
}

export default function SubPageHero({ heroSlides, heroHeightClassName }: SubPageHeroProps) {
  const current = heroSlides[0];

  // Helper to render icons from the heroSlides array
  const renderIcon = (IconInput: any, className: string) => {
    if (!IconInput) return null;
    return <IconInput className={className} />;
  };

  if (!current) return null;

  return (

    <div id="sub-page-hero-wrapper" className="flex flex-col w-full">
      
      {/* SECTION 1: CINEMATIC HERO */}
      <section className={`relative ${heroHeightClassName ?? "h-[40vh] min-h-[340px]"} w-full flex items-center justify-center overflow-hidden bg-slate-950`}>
        {/* BACKGROUND LAYER */}
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1.02 }}
          transition={{
            opacity: { duration: 1.1, ease: "easeInOut" },
            scale: { duration: 10, ease: "easeOut" }
          }}
          className="absolute inset-0 z-0 saturate-[1.1] brightness-[1.05]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${current.image}')` }}
          />
        </motion.div>
        
        {/* CONTENT LAYER */}
        <div className="relative z-20 container mx-auto h-full px-6 md:px-12">
          <div className="flex h-full flex-col justify-end pb-8 pt-20 md:pb-10 md:pt-24">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl"
            >
              {/* 1. BADGE */}
              {(current.badge || current.badgeIcon) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-3 drop-shadow-md"
                >
                  {renderIcon(current.badgeIcon, "h-5 w-5 text-zim-gold")}
                  <span className="text-zim-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] border-l border-zim-gold/50 pl-4">
                    {current.badge}
                  </span>
                </motion.div>
              )}
              
              {/* 2. TITLE - Added Drop Shadow for legibility on vibrant images */}
              <h1 className="mb-4 text-4xl font-black leading-[0.96] tracking-tighter text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] md:text-5xl lg:text-6xl">
                {current.title}
                {current.titleHighlight && (
                  <span className="text-zim-gold opacity-95 italic font-serif capitalize tracking-normal ml-3">
                    {current.titleHighlight}
                  </span>
                )}
              </h1>
              
              {/* 3. SUBTITLE */}
              <div className="mb-5 max-w-4xl drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]">
                {current.subtitle && (
                  <p className="text-lg font-medium tracking-tight text-white md:text-xl">
                    {current.subtitle}
                  </p>
                )}
              </div>

              {/* 4. BUTTONS */}
              <div className="flex flex-wrap gap-3">
                {current.buttons?.filter((btn) => Boolean(btn.link)).map((btn, idx) => {
                  const isPrimary = btn.variant === "primary";
                  const buttonToneClassName = isPrimary
                    ? "bg-zim-gold border-zim-gold !text-black hover:bg-white hover:border-white hover:!text-black"
                    : "border-white bg-white !text-slate-950 hover:bg-white/90 hover:border-white/90 hover:!text-slate-950";

                  return (
                  <Button 
                    key={idx}
                    variant="outline"
                    className={`
                      h-10 min-w-[148px] rounded-full px-4 text-xs font-black uppercase tracking-[0.18em] transition-all duration-500
                      ${buttonToneClassName}
                      hover:scale-105 active:scale-95 backdrop-blur-md shadow-2xl
                    `}
                    asChild
                  >
                    <a
                      href={btn.link}
                      onClick={btn.onClick}
                      className={isPrimary ? "!text-black hover:!text-black" : "!text-slate-950 hover:!text-slate-950"}
                    >
                      <span className="relative z-10 flex items-center leading-none text-inherit">
                        {btn.text}
                        {btn.showArrow && <ArrowRight className="ml-2 h-4 w-4" />}
                      </span>
                    </a>
                  </Button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Global Polish - Reduced Vignette for Clarity */}
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_15vw_rgba(0,0,0,0.4)]" />
      </section>

    </div>


  );
}
