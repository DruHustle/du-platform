import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Globe, Shield, Zap, MessageSquare, TrendingUp, Lightbulb, Award, CheckCircle, Plane, Tractor, Pickaxe, Truck, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

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

  const features = [
    {
      icon: Globe,
      title: t('tech.features.context.title'),
      description: t('tech.features.context.desc')
    },
    {
      icon: MessageSquare,
      title: t('tech.features.translation.title'),
      description: t('tech.features.translation.desc')
    },
    {
      icon: Shield,
      title: t('tech.features.risk.title'),
      description: t('tech.features.risk.desc')
    },
    {
      icon: Lightbulb,
      title: t('tech.features.brainstorm.title'),
      description: t('tech.features.brainstorm.desc')
    },
    {
      icon: Plane,
      title: t('tech.features.tourism.title'),
      description: t('tech.features.tourism.desc')
    }
  ];

  const sectors = [
    {
      icon: Pickaxe,
      title: t('tech.sectors.mining.title'),
      description: t('tech.sectors.mining.desc'),
      details: [t('tech.sectors.mining.d1'), t('tech.sectors.mining.d2')]
    },
    {
      icon: Tractor,
      title: t('tech.sectors.farming.title'),
      description: t('tech.sectors.farming.desc'),
      details: [t('tech.sectors.farming.d1'), t('tech.sectors.farming.d2')]
    },
    {
      icon: Truck,
      title: t('tech.sectors.logistics.title'),
      description: t('tech.sectors.logistics.desc'),
      details: [t('tech.sectors.logistics.d1'), t('tech.sectors.logistics.d2')]
    },
    {
      icon: GraduationCap,
      title: t('tech.sectors.education.title'),
      description: t('tech.sectors.education.desc'),
      details: [t('tech.sectors.education.d1'), t('tech.sectors.education.d2')]
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-to-b from-zim-black/70 via-zim-black/50 to-zim-black/85" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container text-white text-center">
          <AnimatePresence initial={false}>
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                <Brain className="h-10 w-10 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex]?.badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex]?.title}
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed font-medium">
                {heroSlides[currentHeroIndex]?.subtitle}
              </p>
              <div className="flex items-center justify-center gap-3 mb-10">
                <Zap className="h-6 w-6 text-zim-green" />
                <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex]?.highlight}</span>
              </div>
              <Button size="lg" className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-xl px-12 h-16 rounded-full font-bold shadow-2xl transform hover:scale-105 transition-all">
                {t('tech.explore_onesa')}
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentHeroIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentHeroIndex ? 'bg-zim-gold w-8' : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Onesa AI Introduction */}
      <div id="technology-capabilities" className="scroll-mt-24" />
      <section className="py-24 bg-background">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1 text-sm font-semibold">
                  {t('tech.onesa_badge')}
                </Badge>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary leading-tight">
                  {t('tech.onesa_title')}
                </h2>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed italic">
                  "{t('tech.onesa_meaning')}"
                </p>
                <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                  <p>{t('tech.onesa_desc1')}</p>
                  <p>{t('tech.onesa_desc2')}</p>
                </div>
                <div className="mt-10 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg border border-border">
                    <CheckCircle className="h-5 w-5 text-zim-green" />
                    <span className="font-medium">{t('tech.onesa_usp1')}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-lg border border-border">
                    <CheckCircle className="h-5 w-5 text-zim-green" />
                    <span className="font-medium">{t('tech.onesa_usp2')}</span>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="absolute -inset-4 bg-zim-gold/20 rounded-full blur-3xl opacity-50 animate-pulse" />
                <Card className="relative overflow-hidden border-none shadow-2xl bg-zim-black text-white p-8 md:p-12 rounded-3xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Brain className="h-48 w-48" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-zim-gold rounded-2xl">
                        <Sparkles className="h-8 w-8 text-zim-black" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">Onesa AI</h3>
                        <p className="text-zim-gold font-medium">{t('tech.ai_status')}</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <p className="text-white/80 italic mb-4">"How can I invest in Zimbabwe's agriculture sector?"</p>
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-zim-gold flex-shrink-0 flex items-center justify-center text-zim-black font-bold text-xs">O</div>
                          <p className="text-sm text-white/90 leading-relaxed">
                            {t('tech.ai_demo_response')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/30">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('tech.features_title')}</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('tech.features_subtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="h-full border-none shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader>
                        <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Icon className="h-7 w-7 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">{feature.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

      {/* Sector Transformation Section */}
      <div id="technology-sectors" className="scroll-mt-24" />
      <section className="py-24 bg-background">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-zim-gold/10 text-zim-gold border-zim-gold/20 px-4 py-1">
                {t('tech.sectors_badge')}
              </Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">{t('tech.sectors_title')}</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {t('tech.sectors_subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {sectors.map((sector, index) => {
                const Icon = sector.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Card className="h-full overflow-hidden border border-border/50 hover:border-zim-gold/50 transition-all duration-300 group">
                      <div className="grid grid-cols-1 sm:grid-cols-3 h-full">
                        <div className="sm:col-span-1 bg-muted flex items-center justify-center p-8 group-hover:bg-zim-gold/5 transition-colors">
                          <Icon className="h-16 w-16 text-zim-gold" />
                        </div>
                        <div className="sm:col-span-2 p-8">
                          <h3 className="text-2xl font-bold mb-4">{sector.title}</h3>
                          <p className="text-muted-foreground mb-6 leading-relaxed">
                            {sector.description}
                          </p>
                          <ul className="space-y-3">
                            {sector.details.map((detail, dIdx) => (
                              <li key={dIdx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-5 w-5 text-zim-green flex-shrink-0 mt-0.5" />
                                <span>{detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Globe className="h-96 w-96" />
        </div>
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('tech.cta_title')}</h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto opacity-90">
            {t('tech.cta_desc')}
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-10 h-14 font-bold shadow-xl">
            {t('tech.cta_button')}
          </Button>
        </div>
      </section>
    </Layout>
  );
}
