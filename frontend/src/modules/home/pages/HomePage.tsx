import Layout from "@/components/Layout";
import { Link } from "wouter";
import { useState, useEffect, useMemo, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightLeft, Brain, HeartHandshake, Landmark, MapPin, Package, Plus, ShoppingBag } from "lucide-react";
import MainPageHero from "@/modules/home/components/MainPageHero";

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0); // Hero background images - Zimbabwe tourist destinations
  const scrollRailRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number | null; startX: number; startScrollLeft: number }>({
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });
  const suppressClickUntilRef = useRef(0);
  const heroBackgrounds = useMemo(() => [
    "/images/pages/tourism/victoria_falls.jpg",
    "/images/pages/wikimedia/african-elephant.jpg",
    "/images/pages/tourism/great_zimbabwe.jpeg",
    "/images/pages/home/harare_cbd.png",
    "/images/pages/home/partnership_handshake.png",
    "/images/pages/trade/export_port_01.jpg",
    "/images/pages/shared/minerals_mining.png",
    "/images/pages/trade/manufacturing_factory.jpg",
    "/images/pages/technology/ai_innovation.jpg",
  ], []);

  useEffect(() => {
    if (prefersReducedMotion || heroBackgrounds.length <= 1) return;
    const bgTimer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgrounds.length);
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
    if (!scrollRailRef.current || dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.startX;

    if (Math.abs(deltaX) > 6) {
      suppressClickUntilRef.current = Date.now() + 250;
    }

    scrollRailRef.current.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
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

  const modules = [
    {
      title: "Remittances",
      description: "Send money, pay essential support costs, or top up airtime with secure provider-backed flows and clear fee visibility built for diaspora households.",
      detail: "Track value clearly before you send and keep everyday family support fast, predictable, and simple.",
      href: "/payments",
      bgImage: "/images/pages/payments/mobile-payment-terminal.jpg",
      stats: "Remittance + Airtime",
      icon: ArrowRightLeft,
    },
    {
      title: "Shop",
      description: "Shop Zimbabwean products through a curated marketplace with diaspora-friendly delivery flows, trusted product sourcing, and simpler checkout.",
      detail: "From food and gifts to premium local goods, the experience is designed to make cross-border buying feel direct and dependable.",
      href: "/shop",
      bgImage: "/images/pages/shop/zimbabwe_shop_hero.jpg",
      stats: "Marketplace Ready",
      icon: ShoppingBag,
    },
    {
      title: "Care",
      description: "Coordinate trusted family support and cross-border care services from one place, with clearer pathways for urgent needs and ongoing help.",
      detail: "The goal is to reduce friction when supporting relatives at home and make care decisions easier to manage from abroad.",
      href: "/care",
      bgImage: "/images/pages/care/family-gathering-zimbabwe.jpg",
      stats: "Family Support",
      icon: HeartHandshake,
    },
    {
      title: "Technology",
      description: "Explore Onesa AI, Zimbabwe-focused digital infrastructure, and the tools shaping smarter access across diaspora journeys and local opportunity.",
      detail: "The technology module connects product vision, applied AI, and practical innovation built around Zimbabwean context rather than generic global defaults.",
      href: "/technology",
      bgImage: "/images/pages/technology/ai_innovation.jpg",
      stats: "Onesa AI",
      icon: Brain,
    },
    {
      title: "Trade",
      description: "Access export pathways, market-entry support, and practical trade execution guidance for businesses looking to move from interest to delivery.",
      detail: "Use the platform to understand corridors, requirements, and partner readiness before entering new markets.",
      href: "/trade",
      bgImage: "/images/pages/trade/export_port_01.jpg",
      stats: "Export Growth",
      icon: Package,
    },
    {
      title: "Investment",
      description: "Explore vetted opportunities, diaspora-friendly projects, and structured investment access across sectors with clearer context and better visibility.",
      detail: "Discover projects that align with long-term participation, capital deployment, and practical engagement in Zimbabwe's growth story.",
      href: "/investment",
      bgImage: "/images/pages/investment/rbz_building.png",
      stats: "$50M+ Opportunities",
      icon: Landmark,
    },
    {
      title: "Tourism",
      description: "Explore Zimbabwe's world-class attractions and plan your visit with confidence, from iconic landmarks to deeper cultural and heritage experiences.",
      detail: "Travel planning is shaped for both first-time visitors and diaspora return journeys that need stronger local context.",
      href: "/tourism",
      bgImage: "/images/pages/tourism/victoria_falls.jpg",
      stats: "Diaspora Travel Ready",
      icon: MapPin,
    },
  ];



  return (
    
    <Layout>
      
      {/* Hero Section */}
      <MainPageHero 
        hero={{ 
          currentBgIndex: currentBgIndex, 
          heroBackgrounds: heroBackgrounds
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
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className="h-full w-[84vw] max-w-[24rem] flex-none self-stretch snap-start sm:w-[26rem] lg:w-[29rem] xl:w-[31rem]"
                  >
                    <Link
                      href={module.href}
                      className="group block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      onClick={handleTileClick}
                    >
                      <div className="glass-morphism glow-border h-[35rem] overflow-hidden rounded-3xl p-1 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_12px_30px_rgba(15,23,42,0.32)] md:h-[37rem]">
                        <div className="flex h-full flex-col">
                          <div className="relative mb-6 h-72 overflow-hidden rounded-2xl md:h-80">
                            <div className="relative h-full w-full">
                              <img
                                src={module.bgImage}
                                alt={module.title}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
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
