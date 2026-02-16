import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Globe, Shield, Zap, MessageSquare, TrendingUp, Lightbulb, Award, CheckCircle, Plane, Tractor, Pickaxe, Truck, GraduationCap, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import SubPageHero from "@/components/SubPageHero";

export default function Technology() {
  const { t } = useTranslation();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/tech/ai_innovation.jpg",
      badge: t('tech.hero.badge1'),
      badgeIcon: Brain,
      title: t('tech.hero.title1'),
      subtitle: t('tech.hero.subtitle1'),
      highlight: t('tech.hero.highlight1')
    },
    {
      image: "/images/tech/ai_context.jpg",
      badge: t('tech.hero.badge2'),
      badgeIcon: Lightbulb,
      title: t('tech.hero.title2'),
      subtitle: t('tech.hero.subtitle2'),
      highlight: t('tech.hero.highlight2')
    },
    {
      image: "/images/tech/zim_tech_map.jpg",
      badge: t('tech.hero.badge3'),
      badgeIcon: Globe,
      title: t('tech.hero.title3'),
      subtitle: t('tech.hero.subtitle3'),
      highlight: t('tech.hero.highlight3')
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

 const introData = {
  icon: Brain, // 
  title: t('tech.objective_title'),
  description: t('tech.objective_subtitle')
 };

  const sectors = [
    { icon: Pickaxe, title: t('tech.sectors.mining.title'), description: t('tech.sectors.mining.desc'), details: [t('tech.sectors.mining.d1'), t('tech.sectors.mining.d2')] },
    { icon: Tractor, title: t('tech.sectors.farming.title'), description: t('tech.sectors.farming.desc'), details: [t('tech.sectors.farming.d1'), t('tech.sectors.farming.d2')] },
    { icon: Truck, title: t('tech.sectors.logistics.title'), description: t('tech.sectors.logistics.desc'), details: [t('tech.sectors.logistics.d1'), t('tech.sectors.logistics.d2')] },
    { icon: GraduationCap, title: t('tech.sectors.education.title'), description: t('tech.sectors.education.desc'), details: [t('tech.sectors.education.d1'), t('tech.sectors.education.d2')] }
  ];

  return (
    <Layout>
      
      {/* Hero Section */}
      <section id="hero" >
        <SubPageHero 
          heroSlides={heroSlides} 
          intro={introData} 
          />
      </section>

    {/* Onesa Intro - Glassy UI */}
    <section id="technology-capabilities" className="pt-12 pb-5 bg-slate-950 relative overflow-hidden">
      <div className="container relative z-10 px-6 mx-auto">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            className="relative py-8 px-8 md:px-16 rounded-[2.5rem] overflow-hidden border border-white/10 backdrop-blur-3xl bg-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group"
          >
            {/* The Crispy Edge Finish */}
            <span className="absolute inset-0 rounded-[2.5rem] border border-white/10 pointer-events-none" />
            
            {/* Subtle Animated Glow in the corner */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-zim-gold/10 blur-[80px] rounded-full group-hover:bg-zim-gold/20 transition-all duration-700" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              
              {/* Left Column: AI Interface Simulation */}
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zim-gold/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-zim-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Onesa AI</h3>
                    <span className="text-zim-gold text-[9px] uppercase font-black tracking-widest border-l border-zim-gold/30 pl-3">
                      {t('tech.ai_status')}
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-3 relative">
                  <p className="text-white/40 italic text-[11px] font-medium leading-relaxed">
                    "{t('tech.ai_demo_question')}"
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-zim-gold flex-shrink-0 flex items-center justify-center text-zim-black font-black text-[10px] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                      O
                    </div>
                    <p className="text-[13px] text-white/90 leading-relaxed font-light">
                      {t('tech.ai_demo_response')}
                    </p>
                  </div>
                  {/* Subtle scanning line effect */}
                  <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-zim-gold/20 to-transparent" />
                </div>
              </div>

              {/* Right Column: Title and USPs */}
              <div className="w-full md:w-1/2 text-center md:text-left space-y-4">
                <h4 className="text-2xl font-black text-white leading-tight tracking-tight">
                  {t('tech.onesa_title')}
                </h4>
                <p className="text-sm text-white/60 leading-relaxed font-light">
                  {t('tech.onesa_desc1')}
                </p>
                
                <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                  <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-zim-gold" />
                      <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{t('tech.onesa_usp1')}</span>
                    </div>
                    <div className="h-3 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-zim-gold" />
                      <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{t('tech.onesa_usp2')}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* Sector Transformation - Cinematic Glass Grid */}
    <section id="technology-industries" className="pt-10 pb-20 bg-slate-950 relative overflow-hidden">
      {/* Background glow for depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="container relative z-10 px-6 mx-auto">
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-4"
          >
            <div className="h-px w-8 bg-zim-gold/40" />
            <span className="text-zim-gold text-[10px] font-black uppercase tracking-[0.3em]">
              {t('tech.sectors_badge') || "Impact Sectors"}
            </span>
            <div className="h-px w-8 bg-zim-gold/40" />
          </motion.div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter">
            {t('tech.sectors_title')}
          </h2>
          <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
            {t('tech.sectors_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {sectors.map((sector, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              {/* Glass Card Container */}
              <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-1 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 hover:bg-white/[0.06] hover:-translate-y-1">
                
                {/* Internal "Crispy" Edge */}
                <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row h-full">
                  {/* Icon Section */}
                  <div className="sm:w-1/3 flex items-center justify-center p-8 bg-white/5 relative group-hover:bg-zim-gold/5 transition-colors duration-500">
                    <sector.icon className="h-12 w-12 text-zim-gold drop-shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-transform duration-500 group-hover:scale-110" />
                    {/* Decorative corner accent */}
                    <div className="absolute top-4 left-4 h-2 w-2 border-t border-l border-zim-gold/30" />
                  </div>

                  {/* Content Section */}
                  <div className="p-8 sm:w-2/3 flex flex-col justify-center">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-zim-gold transition-colors">
                      {sector.title}
                    </h3>
                    <p className="text-[13px] text-white/60 mb-5 leading-relaxed font-light">
                      {sector.description}
                    </p>
                    
                    <ul className="space-y-2.5">
                      {sector.details.map((detail, dIdx) => (
                        <li key={dIdx} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-white/80">
                          <div className="h-1.5 w-1.5 rounded-full bg-zim-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    </Layout>
  );
}