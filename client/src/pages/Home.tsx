import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { FileText, BookOpen, Plane, TrendingUp, Package, ArrowRight, CheckCircle, Globe, Users, BarChart3, Award, Brain, Heart, Lightbulb, Globe2, Icon } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import ContactForm from "@/components/ContactForm";
import MainPageHero from "@/components/MainPageHero";

export default function Home() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0); // Hero background images - Zimbabwe tourist destinations
  const heroBackgrounds = useMemo(() => [
    "/images/victoria_falls.jpg",
    "/images/hwange_elephants.jpg",
    "/images/balancing_rocks.jpg",
    "/images/great_zimbabwe.jpeg",
    "/images/eastern_highlands.jpg",
    "/images/zimbabwe_lion.png",
    "/images/mana_pools.jpg",
    "/images/kariba_sunset.jpg",
    "/images/partnership_handshake.png",
    "/images/african_trade.jpg",
    "/images/harare_airport.png",
    "/images/eu_symbol.png",
    "/images/dest_mana_pools.jpg",
    "/images/dest_gonarezhou.jpg",
    "/images/dest_matobo.jpg",
    "/images/minerals_mining.png",
    "/images/manufacturing_factory.jpg",
    "/images/tech/ai_innovation.jpg",
    "/images/tech/ai_context.jpg"
  ], []);

  const navButtons = [
  { href: '/technology', label: 'home.technology' },
  { href: '/export-hub', label: 'home.export_hub' },
  { href: '/tourism', label: 'home.tourism' },
  { href: '/investment', label: 'home.investments' },
];

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgrounds.length);
    }, 5000);
    return () => clearInterval(bgTimer);
  }, [heroBackgrounds.length]);

//Hero Intro Section
  const introData = {
    icon: Globe2, // Pass the component reference, not a string
    title: "home.objective_title", // i18n key
    description: "home.objective_desc" // i18n key
  };

  const modules = [
    {
      title: t('home.modules.technology.title'),
      description: t('home.modules.technology.desc'),
      href: "/technology",
      color: " bg-purple-600/5 hover:bg-purple-600/10",
      bgImage: "/images/tech/ai_innovation.jpg",
      stats: t('home.modules.technology.stats')
    },
    {
      
      title: t('home.modules.export.title'),
      href: "/export-hub",
      color: " bg-green-600/5 hover:bg-green-600/10",
      bgImage: "/images/eu_symbol.png",
      stats: t('home.modules.export.stats')
    },
    {
      title: t('home.modules.tourism.title'),
      description: t('home.modules.tourism.desc'),
      href: "/tourism",
      color: " bg-yellow-500/5 hover:bg-yellow-500/10",
      bgImage: "/images/hwange_elephants.jpg",
      stats: t('home.modules.tourism.stats')
    },
    {
      title: t('home.modules.investment.title'),
      description: t('home.modules.investment.desc'),
      href: "/investment",
      color: " bg-red-600/5 hover:bg-red-600/10",
      bgImage: "/images/minerals_mining.png",
      stats: t('home.modules.investment.stats')
    },
    {
      title: t('home.modules.trade.title'),
      description: t('home.modules.trade.desc'),
      href: "/trade",
      color: " bg-slate-800/5 hover:bg-slate-800/10",
      bgImage: "/images/african_trade.jpg",
      stats: t('home.modules.trade.stats')
    },
    {
      title: t('home.modules.success.title'),
      description: t('home.modules.success.desc'),
      href: "/success-stories",
      color: " bg-zim-gold/5 hover:bg-zim-gold/10",
      bgImage: "/images/partnership_handshake.png",
      stats: t('home.modules.success.stats')
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
      <section className="py-20  bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {modules.map((module, index) => {
             const Icon = (module as any).icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="h-full"
                >
                  <div className="
                    relative h-full py-8 px-6 rounded-[2.5rem] overflow-hidden 
                    /* EXACT GLASS EDGES */
                    border-t border-l border-white/25 
                    border-b border-r border-white/10 
                    backdrop-blur-3xl bg-white/[0.03] 
                    /* EXACT SHADOW & INSET */
                    shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.15)] 
                    transition-all duration-500 group hover:scale-[1.02] hover:border-white/30
                  ">
                    {/* EXACT SHINE & TEXTURE */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
                    <div className="absolute inset-0 bg-[url('/images/carbon-fibre.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center h-full">
                      
                      {/* 1. Icon (Matching Intro Styling) */}
                      {Icon && (
                        <div className="relative mb-4">
                          <Icon className="h-8 w-8 text-zim-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.5)] transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-zim-gold/10 blur-xl rounded-full" />
                        </div>
                      )}
                      
                      {/* 2. Image Preview (Integrated into the glass tile) */}
                      <div className="w-full h-56 md:h-64 rounded-3xl overflow-hidden mb-6 border border-white/10 shadow-inner">
                        <div 
                          className="w-full h-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-110"
                          style={{ backgroundImage: `url('${module.bgImage}')` }}
                        >
                          {/* Refined gradient overlay for better text legibility */}
                          <div className="w-full h-full bg-gradient-to-t from-[#050505]/90 via-transparent to-transparent" />
                        </div>
                      </div>

                      {/* 3. Title (Matching Intro Description Styling) */}
                      <h3 className="text-lg md:text-xl font-bold text-white/95 leading-snug mb-3">
                        {module.title}
                      </h3>
                      
                      {/* 4. Description (Subtle) */}
                      <p className="text-sm text-white/60 leading-relaxed mb-6 flex-grow px-2">
                        {module.description}
                      </p>

                      {/* 5. Stat/Label (Matching Intro Label Styling) */}
                      <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="h-px w-6 bg-zim-gold/40" />
                        <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                          {module.stats}
                        </p>
                        <div className="h-px w-6 bg-zim-gold/40" />
                      </div>

                      {/* 6. Explore Button (Matches Hero Buttons) */}
                      <Link href={module.href} className="w-full">
                        <button className="
                          w-full py-4 rounded-full border-t border-l border-white/20 border-b border-r border-white/5 
                          bg-white/5 text-white text-[10px] font-black uppercase tracking-[0.2em] 
                          hover:bg-white hover:text-black transition-all duration-500
                        ">
                          {t('home.explore_now')}
                        </button>
                      </Link>
                    </div>

                    {/* Edge Polish Line */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
