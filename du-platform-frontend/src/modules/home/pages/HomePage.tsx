import Layout from "@/components/Layout";
import { Link } from "wouter";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Brain, Landmark, MapPin, Plus, ShoppingBag } from "lucide-react";
import MainPageHero from "@/modules/home/components/MainPageHero";
import InstantImage from "@/components/InstantImage";

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0); // Hero background images - Zimbabwe tourist destinations
  const scrollRailRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startScrollLeft: number;
  }>({
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });
  const suppressClickUntilRef = useRef(0);
  const heroBackgrounds = useMemo(
    () => [
      "/images/pages/tourism/victoria_falls.webp",
      "/images/pages/home/eu_symbol.png",
      "/images/pages/home/partnership_handshake.png",
      "/images/pages/shared/export_port_01.jpg",
      "/images/pages/home/zimbabwe_lion.png",
      "/images/pages/home/minerals_mining.png",
      "/images/pages/shared/manufacturing_factory.jpg",
      "/images/pages/technology/ai_innovation.webp",
    ],
    []
  );

  useEffect(() => {
    if (prefersReducedMotion || heroBackgrounds.length <= 1) return;
    const bgTimer = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % heroBackgrounds.length);
    }, 9000);
    return () => clearInterval(bgTimer);
  }, [heroBackgrounds.length, prefersReducedMotion]);

  const handleRailPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || !scrollRailRef.current) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scrollRailRef.current.scrollLeft,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleRailPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !scrollRailRef.current ||
      dragStateRef.current.pointerId !== event.pointerId
    )
      return;

    const deltaX = event.clientX - dragStateRef.current.startX;

    if (Math.abs(deltaX) > 6) {
      suppressClickUntilRef.current = Date.now() + 250;
    }

    scrollRailRef.current.scrollLeft =
      dragStateRef.current.startScrollLeft - deltaX;
  };

  const handleRailPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
    };
  };

  const handleTileClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (Date.now() >= suppressClickUntilRef.current) return;
    event.preventDefault();
  };

  const modules = useMemo(
    () => [
      {
        title: tr("home.tiles.shop.title", "Shop"),
        description: tr(
          "home.tiles.shop.description",
          "Find Zimbabwean food, crafts and supporter apparel for your home or as a gift."
        ),
        detail: tr(
          "home.tiles.shop.detail",
          "Build a basket and send an order request. Confirm availability, delivery and payment with the team before buying."
        ),
        href: "/shop",
        bgImage: "/images/pages/shop/zimbabwe_shop_hero.webp",
        stats: tr("home.tiles.shop.stats", "Browse products"),
        icon: ShoppingBag,
      },
      {
        title: tr("home.tiles.technology.title", "Technology"),
        description: tr(
          "home.tiles.technology.description",
          "Meet Onesa, the AI platform powering assistance on Diaspora Unlocked."
        ),
        detail: tr(
          "home.tiles.technology.detail",
          "Ask questions about Zimbabwe, explore ideas and get help with products, opportunities and travel plans."
        ),
        href: "/technology",
        bgImage: "/images/pages/technology/ai_innovation.webp",
        stats: tr("home.tiles.technology.stats", "Onesa AI"),
        icon: Brain,
      },
      {
        title: tr("home.tiles.investment.title", "Investment"),
        description: tr(
          "home.tiles.investment.description",
          "Explore project profiles across tourism, agriculture, manufacturing, technology and energy."
        ),
        detail: tr(
          "home.tiles.investment.detail",
          "Read the background and identify questions for project promoters. Funding terms and availability need independent confirmation."
        ),
        href: "/investment",
        bgImage: "/images/pages/investment/rbz_building.webp",
        stats: tr("home.tiles.investment.stats", "Explore project profiles"),
        icon: Landmark,
      },
      {
        title: tr("home.tiles.tourism.title", "Tourism"),
        description: tr(
          "home.tiles.tourism.description",
          "Discover waterfalls, wildlife, heritage sites and places to explore across Zimbabwe."
        ),
        detail: tr(
          "home.tiles.tourism.detail",
          "Compare destinations, preview virtual experiences and create an indicative trip plan with Onesa."
        ),
        href: "/tourism",
        bgImage: "/images/pages/tourism/victoria_falls.webp",
        stats: tr("home.tiles.tourism.stats", "Find your next destination"),
        icon: MapPin,
      },
    ],
    [t]
  );

  return (
    <Layout>
      {/* Hero Section */}
      <MainPageHero
        hero={{
          currentBgIndex: currentBgIndex,
          heroBackgrounds: heroBackgrounds,
        }}
      />

      {/* Modules Section */}
      <section className="relative overflow-hidden bg-white pt-16 pb-8 md:pt-20 md:pb-10">
        <div className="relative z-10">
          <div
            ref={scrollRailRef}
            className="home-tiles-scroll -mt-4 overflow-x-auto px-0 pb-8 pt-4 scroll-pl-6 scroll-smooth overscroll-x-contain snap-x snap-mandatory md:-mt-5 md:pb-12 md:pt-5 md:scroll-pl-8 md:cursor-grab active:cursor-grabbing"
            onPointerCancel={handleRailPointerEnd}
            onPointerDown={handleRailPointerDown}
            onPointerMove={handleRailPointerMove}
            onPointerUp={handleRailPointerEnd}
          >
            <div className="flex w-max items-stretch gap-5 pl-6 pr-0 md:gap-7 md:pl-8 md:pr-0">
              {modules.map((module, index) => {
                const Icon = module.icon;
                return (
                  <motion.div
                    key={module.href}
                    initial={false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="h-full w-[84vw] max-w-[24rem] flex-none self-stretch snap-start sm:w-[26rem] lg:w-[29rem] xl:w-[31rem]"
                  >
                    <Link
                      href={module.href}
                      className="group block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-zim-green focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      onClick={handleTileClick}
                    >
                      <div className="glass-morphism glow-border h-[35rem] overflow-hidden rounded-3xl p-1 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)] md:h-[37rem]">
                        <div className="flex h-full flex-col">
                          <div className="relative mb-6 h-72 overflow-hidden rounded-2xl md:h-80">
                            <div className="relative h-full w-full">
                              <InstantImage
                                src={module.bgImage}
                                alt={module.title}
                                priority={false}
                                loading="lazy"
                                fetchPriority="low"
                                draggable={false}
                                wrapperClassName="h-full w-full bg-slate-900"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-[#f8f6f6]/10 mix-blend-overlay" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/90 via-[#0f172a]/12 to-[#f8f6f6]/5" />
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col px-6 pb-8">
                            <div className="mb-4 flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(30,41,59,0.7)] text-zim-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                                <Icon className="h-5 w-5" strokeWidth={2} />
                              </span>
                              <h3 className="text-base font-black tracking-tight text-white">
                                {module.title}
                              </h3>
                            </div>

                            <p className="text-[11px] font-light leading-relaxed text-white/70">
                              {module.description}
                            </p>

                            <p className="mt-4 flex-grow text-[11px] font-light leading-relaxed text-white/70">
                              {module.detail}
                            </p>

                            <div className="mt-8 flex items-end justify-between gap-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zim-gold">
                                {module.stats}
                              </p>

                              <span
                                aria-hidden="true"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.35)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-90"
                              >
                                <Plus className="h-5 w-5" strokeWidth={2.6} />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
