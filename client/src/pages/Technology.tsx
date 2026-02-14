import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Globe, Shield, Zap, MessageSquare, TrendingUp, Lightbulb, Award, CheckCircle, Plane, Tractor, Pickaxe, Truck, GraduationCap, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export default function Technology() {
  const { t } = useTranslation();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/tech/ai_innovation.jpg",
      badge: t('tech.hero.badge1'),
      title: t('tech.hero.title1'),
      subtitle: t('tech.hero.subtitle1'),
      highlight: t('tech.hero.highlight1')
    },
    {
      image: "/images/tech/ai_context.jpg",
      badge: t('tech.hero.badge2'),
      title: t('tech.hero.title2'),
      subtitle: t('tech.hero.subtitle2'),
      highlight: t('tech.hero.highlight2')
    },
    {
      image: "/images/tech/zim_tech_map.jpg",
      badge: t('tech.hero.badge3'),
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

  const sectors = [
    { icon: Pickaxe, title: t('tech.sectors.mining.title'), description: t('tech.sectors.mining.desc'), details: [t('tech.sectors.mining.d1'), t('tech.sectors.mining.d2')] },
    { icon: Tractor, title: t('tech.sectors.farming.title'), description: t('tech.sectors.farming.desc'), details: [t('tech.sectors.farming.d1'), t('tech.sectors.farming.d2')] },
    { icon: Truck, title: t('tech.sectors.logistics.title'), description: t('tech.sectors.logistics.desc'), details: [t('tech.sectors.logistics.d1'), t('tech.sectors.logistics.d2')] },
    { icon: GraduationCap, title: t('tech.sectors.education.title'), description: t('tech.sectors.education.desc'), details: [t('tech.sectors.education.d1'), t('tech.sectors.education.d2')] }
  ];

  return (
    <Layout>
      <section className="relative h-[600px] flex items-center overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentHeroIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.div 
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${heroSlides[currentHeroIndex]?.image}')`,
              }}
            />
            {/* Overlay removed for "No Overlay" style */}
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl text-left" /* Left justified */
            >
              <div className="flex items-center gap-3 mb-6">
                <Globe className="h-8 w-8 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex]?.badge}
                </Badge>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white drop-shadow-lg">
                {heroSlides[currentHeroIndex]?.title}
              </h1>

              <p className="text-xl md:text-2xl mb-6 text-white leading-relaxed font-medium max-w-2xl drop-shadow-md">
                {heroSlides[currentHeroIndex]?.subtitle}
              </p>

              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="h-6 w-6 text-zim-green" />
                <span className="text-2xl font-bold text-zim-gold drop-shadow-md">
                  {heroSlides[currentHeroIndex]?.highlight}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Carousel Indicators - Moved to left to match justification */}
        <div className="absolute bottom-8 left-4 sm:left-12 flex gap-2 z-20">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentHeroIndex(idx)}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                idx === currentHeroIndex ? 'bg-zim-gold w-12' : 'bg-white/50 w-4 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        
        {/* Subtle ground fade to blend with next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* AI Intro - Reduced spacing to match ZIGD section */}
      <section id="technology-capabilities" className="py-0 bg-background relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="relative py-6 px-8 md:px-16 rounded-[2rem] overflow-hidden group shadow-lg bg-zim-black text-white"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zim-black via-slate-900 to-zim-black opacity-90" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-1/2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-zim-gold" />
                    <h3 className="text-lg font-bold">Onesa AI</h3>
                    <span className="text-zim-gold/80 text-[10px] uppercase font-black tracking-widest">{t('tech.ai_status')}</span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                    <p className="text-white/50 italic text-[11px]">{t('tech.ai_demo_question')}</p>
                    <div className="flex items-start gap-2">
                      <div className="h-5 w-5 rounded-full bg-zim-gold flex-shrink-0 flex items-center justify-center text-zim-black font-black text-[10px]">O</div>
                      <p className="text-xs text-white/90 leading-relaxed line-clamp-3">{t('tech.ai_demo_response')}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-1/2 text-center md:text-left space-y-2">
                    <h4 className="text-lg font-bold text-zim-gold leading-tight">{t('tech.onesa_title')}</h4>
                    <p className="text-xs text-white/70 leading-snug">{t('tech.onesa_desc1')}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                         <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/10">
                            <CheckCircle className="h-3 w-3 text-zim-green" />
                            <span className="text-[10px] font-medium">{t('tech.onesa_usp1')}</span>
                            <CheckCircle className="h-3 w-3 text-zim-green" />
                            <span className="text-[10px] font-medium">{t('tech.onesa_usp2')}</span>
                         </div>
                    </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sector Transformation - Matched to Modules grid */}
      <section id="technology-industries" className="pt-12 pb-12 bg-gradient-to-b from-muted/30 to-background">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t('tech.sectors_title')}</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t('tech.sectors_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sectors.map((sector, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-2 bg-slate-800/5 hover:bg-slate-800/10 group hover:shadow-xl transition-all duration-500 h-full">
                  <div className="flex flex-col sm:flex-row h-full">
                    <div className="sm:w-1/4 bg-muted/50 flex items-center justify-center p-6 group-hover:bg-zim-gold/10 transition-colors">
                      <sector.icon className="h-10 w-10 text-zim-gold" />
                    </div>
                    <div className="p-5 sm:w-3/4">
                      <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{sector.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 leading-snug">{sector.description}</p>
                      <ul className="grid grid-cols-1 gap-1">
                        {sector.details.map((detail, dIdx) => (
                          <li key={dIdx} className="flex items-start gap-2 text-[11px] font-medium">
                            <CheckCircle className="h-3.5 w-3.5 text-zim-green flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </Layout>
  );
}