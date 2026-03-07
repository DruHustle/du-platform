import Layout from "@/components/Layout";
import { Link } from "wouter";
import { Globe2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import MainPageHero from "@/modules/home/components/MainPageHero";

export default function Home() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0); // Hero background images - Zimbabwe tourist destinations
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

const navButtons = [
  { href: '/technology', label: 'home.technology' },
  { href: '/shop', label: 'nav.shop' },
  { href: '/payments', label: 'nav.payments' },
  { href: '/tourism', label: 'home.tourism' },
  { href: '/investment', label: 'home.investments' },
];

  useEffect(() => {
    if (prefersReducedMotion || heroBackgrounds.length <= 1) return;
    const bgTimer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgrounds.length);
    }, 9000);
    return () => clearInterval(bgTimer);
  }, [heroBackgrounds.length, prefersReducedMotion]);

//Hero Intro Section
  const introData = {
    icon: Globe2, // Pass the component reference, not a string
    title: "home.objective_title", // i18n key
    description: "home.objective_desc" // i18n key
  };

  const modules = [
    {
      title: t('home.modules.technology.title') || "Technology & AI",
      description: t('home.modules.technology.desc') || "Meet Onesa AI, our specialized model built to illuminate the Zimbabwean context.",
      href: "/technology",
      bgImage: "/images/pages/technology/ai_innovation.jpg",
      stats: t('home.modules.technology.stats') || "Onesa AI"
    },
    {
      title: t('home.modules.tourism.title') || "Tourism",
      description: t('home.modules.tourism.desc') || "Discover Zimbabwe's world-class attractions and  plan your visit.",
      href: "/tourism",
      bgImage: "/images/pages/tourism/victoria_falls.jpg",
      stats: t('home.modules.tourism.stats') || "Diaspora Travel Ready"
    },
    {
      title: t('home.modules.investment.title') || "Investment",
      description: t('home.modules.investment.desc') || "Explore diaspora-friendly micro-investment and crowdfunding opportunities.",
      href: "/investment",
      bgImage: "/images/pages/shared/minerals_mining.png",
      stats: t('home.modules.investment.stats') || "$50M+ Opportunities"
    },
    {
      title: t("nav.payments", { defaultValue: "Payments" }),
      description:
        t("home.modules.payments.desc") ||
        "Send money or top up airtime with secure provider-backed flows and clear fee visibility.",
      href: "/payments",
      bgImage: "/images/pages/payments/mobile-payment-terminal.jpg",
      stats: t("home.modules.payments.stats") || "Remittance + Airtime",
    },
    {
      title: t('home.modules.trade.title') || "Trade",
      description: t('home.modules.trade.desc') || "Access comprehensive trade and export execution resources in one place.",
      href: "/trade",
      bgImage: "/images/pages/trade/export_port_01.jpg",
      stats: t('home.modules.trade.stats') || "8 Export Sectors"
    },
    {
      title: t('home.modules.success.title') || "Impact",
      description: t('home.modules.success.desc') || "Explore real-world examples of projects thriving through diaspora engagement.",
      href: "/impact",
      bgImage: "/images/pages/home/partnership_handshake.png",
      stats: t('home.modules.success.stats') || "Impact Stories"
    }
  ];



  return (
    
    <Layout>
      
      {/* Hero Section */}
      <MainPageHero 
        hero={{ 
          currentBgIndex: currentBgIndex, 
          heroBackgrounds: heroBackgrounds, 
          navButtons: navButtons 
        }} 
        intro={introData} 
      />

      {/* Modules Section */}
      <section className="pt-5 pb-15 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module, index) => {
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="h-full"
                >
                  <div className="block h-full focus:outline-none">
                    <div className="
                      relative h-full py-6 px-5 rounded-[2rem] overflow-hidden
                      border-t border-l border-white/25
                      border-b border-r border-white/10
                      bg-white/[0.02]
                      shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.15)]
                      transition-all duration-500 group hover:scale-[1.02] hover:border-white/30
                    ">
                      <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />

                      <div className="relative z-10 flex flex-col items-center text-center h-full">
                        <div className="w-full h-44 md:h-52 rounded-3xl overflow-hidden mb-4 border border-white/10 shadow-inner">
                          <div className="relative w-full h-full">
                            <img
                              src={module.bgImage}
                              alt={module.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/90 via-transparent to-transparent" />
                          </div>
                        </div>

                        <h3 className="section-title-compact mb-2">
                          {module.title}
                        </h3>

                        <p className="text-sm text-white/80 leading-relaxed mb-4 flex-grow px-2">
                          {module.description}
                        </p>

                        <div className="flex items-center justify-center gap-4 mb-4">
                          <div className="h-px w-6 bg-zim-gold/40" />
                          <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                            {module.stats}
                          </p>
                          <div className="h-px w-6 bg-zim-gold/40" />
                        </div>

                        <Link
                          href={module.href}
                          className="
                            w-full inline-flex items-center justify-center py-2.5 rounded-full border border-white/25
                            bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em]
                            hover:bg-white hover:text-black hover:border-white transition-all duration-500
                          "
                        >
                          {t('home.explore_now') || "Explore Now"}
                        </Link>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

    </Layout>
  );
}
