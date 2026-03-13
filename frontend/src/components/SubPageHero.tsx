import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight, LucideIcon } from 'lucide-react';
import InstantImage, { preloadImages } from '@/components/InstantImage';

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

const SLIDE_INTERVAL_MS = 5000;

export default function SubPageHero({ heroSlides, heroHeightClassName }: SubPageHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const current = heroSlides[currentIndex];

  const navigate = useCallback((nextIndex: number, dir: 1 | -1) => {
    setDirection(dir);
    setCurrentIndex(nextIndex);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (index === currentIndex) return;
      navigate(index, index > currentIndex ? 1 : -1);
    },
    [currentIndex, navigate]
  );

  const goNext = useCallback(() => {
    navigate((currentIndex + 1) % heroSlides.length, 1);
  }, [currentIndex, heroSlides.length, navigate]);

  const goPrev = useCallback(() => {
    navigate((currentIndex - 1 + heroSlides.length) % heroSlides.length, -1);
  }, [currentIndex, heroSlides.length, navigate]);

  // Auto-advance
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [goNext, heroSlides.length]);

  const resetInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (heroSlides.length > 1) {
      intervalRef.current = setInterval(goNext, SLIDE_INTERVAL_MS);
    }
  }, [goNext, heroSlides.length]);

  // Preload next slide image
  useEffect(() => {
    const nextIndex = (currentIndex + 1) % heroSlides.length;
    const imgs = [heroSlides[currentIndex]?.image, heroSlides[nextIndex]?.image].filter(Boolean) as string[];
    if (imgs.length) preloadImages(imgs, 1);
  }, [currentIndex, heroSlides]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      resetInterval();
      diff > 0 ? goNext() : goPrev();
    }
    touchStartX.current = null;
  };

  const renderIcon = (IconInput: any, className: string) => {
    if (!IconInput) return null;
    return <IconInput className={className} />;
  };

  if (!current) return null;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div id="sub-page-hero-wrapper" className="flex flex-col w-full">
      {/* CINEMATIC HERO */}
      <section
        className={`relative ${heroHeightClassName ?? "h-[40vh] min-h-[340px]"} w-full flex items-center justify-center overflow-hidden bg-slate-950`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* BACKGROUND LAYER */}
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: [0.32, 0, 0.67, 0] }}
            className="absolute inset-0 z-0"
          >
            <motion.div
              initial={{ scale: 1.04 }}
              animate={{ scale: 1.02 }}
              transition={{ duration: 10, ease: "easeOut" }}
              className="absolute inset-0 saturate-[1.1] brightness-[1.05]"
            >
              <InstantImage
                src={current.image}
                alt=""
                aria-hidden="true"
                priority
                wrapperClassName="absolute inset-0 h-full w-full bg-slate-900"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* CONTENT LAYER */}
        <div className="relative z-20 container mx-auto h-full px-6 md:px-12">
          <div className="flex h-full flex-col justify-end pb-12 pt-20 md:pb-14 md:pt-24">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-5xl"
              >
                {/* BADGE */}
                {(current.badge || current.badgeIcon) && (
                  <div className="mb-4 flex items-center gap-3 drop-shadow-md">
                    {renderIcon(current.badgeIcon, "h-5 w-5 text-zim-gold")}
                    <span className="text-zim-gold text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] border-l border-zim-gold/50 pl-4">
                      {current.badge}
                    </span>
                  </div>
                )}

                {/* TITLE */}
                <h1 className="mb-4 text-4xl font-black leading-[0.96] tracking-tighter text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] md:text-5xl lg:text-6xl">
                  {current.title}
                  {current.titleHighlight && (
                    <span className="text-zim-gold opacity-95 italic font-serif capitalize tracking-normal ml-3">
                      {current.titleHighlight}
                    </span>
                  )}
                </h1>

                {/* SUBTITLE */}
                {current.subtitle && (
                  <div className="mb-5 max-w-4xl drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]">
                    <p className="text-lg font-medium tracking-tight text-white md:text-xl">
                      {current.subtitle}
                    </p>
                  </div>
                )}

                {/* BUTTONS */}
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
                        className={`h-10 min-w-[148px] rounded-full px-4 text-xs font-black uppercase tracking-[0.18em] transition-all duration-500 ${buttonToneClassName} hover:scale-105 active:scale-95 backdrop-blur-md shadow-2xl`}
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
            </AnimatePresence>
          </div>
        </div>

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_15vw_rgba(0,0,0,0.4)]" />

        {/* CAROUSEL CONTROLS — only shown when multiple slides */}
        {heroSlides.length > 1 && (
          <>
            {/* Prev / Next arrows */}
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => { resetInterval(); goPrev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-black/30 border border-white/20 text-white/80 hover:bg-black/50 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => { resetInterval(); goNext(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-black/30 border border-white/20 text-white/80 hover:bg-black/50 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => { resetInterval(); goTo(i); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "w-5 h-1.5 bg-zim-gold"
                      : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
