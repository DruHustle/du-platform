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
    { icon: Globe, title: t('tech.features.context.title'), description: t('tech.features.context.desc') },
    { icon: MessageSquare, title: t('tech.features.translation.title'), description: t('tech.features.translation.desc') },
    { icon: Shield, title: t('tech.features.risk.title'), description: t('tech.features.risk.desc') },
    { icon: Lightbulb, title: t('tech.features.brainstorm.title'), description: t('tech.features.brainstorm.desc') },
    { icon: Plane, title: t('tech.features.tourism.title'), description: t('tech.features.tourism.desc') }
  ];

  const sectors = [
    { icon: Pickaxe, title: t('tech.sectors.mining.title'), description: t('tech.sectors.mining.desc'), details: [t('tech.sectors.mining.d1'), t('tech.sectors.mining.d2')] },
    { icon: Tractor, title: t('tech.sectors.farming.title'), description: t('tech.sectors.farming.desc'), details: [t('tech.sectors.farming.d1'), t('tech.sectors.farming.d2')] },
    { icon: Truck, title: t('tech.sectors.logistics.title'), description: t('tech.sectors.logistics.desc'), details: [t('tech.sectors.logistics.d1'), t('tech.sectors.logistics.d2')] },
    { icon: GraduationCap, title: t('tech.sectors.education.title'), description: t('tech.sectors.education.desc'), details: [t('tech.sectors.education.d1'), t('tech.sectors.education.d2')] }
  ];

  return (
    <Layout>
      {/* Hero Section - Tightened gaps */}
      <section className="relative h-[550px] flex items-center justify-center overflow-hidden">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentHeroIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${heroSlides[currentHeroIndex]?.image}')` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-zim-black/70 via-zim-black/40 to-zim-black/80" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container text-white text-center">
          <motion.div
            key={`content-${currentHeroIndex}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-zim-gold" />
              <Badge className="bg-zim-gold text-zim-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-tighter">
                {heroSlides[currentHeroIndex]?.badge}
              </Badge>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-3 leading-none">
              {heroSlides[currentHeroIndex]?.title}
            </h1>
            <p className="text-lg md:text-xl mb-6 text-white/90 font-medium">
              {heroSlides[currentHeroIndex]?.subtitle}
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <Zap className="h-5 w-5 text-zim-green" />
              <span className="text-xl font-bold text-zim-gold">{heroSlides[currentHeroIndex]?.highlight}</span>
            </div>
            <Button size="lg" className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 h-14 px-10 rounded-full font-bold transition-all">
              {t('tech.explore_onesa')}
            </Button>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Onesa AI Introduction */}
      <section id="onesa-ai" className="py-12 bg-background relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto space-y-12">
            
            {/* 1. Prompt Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="relative"
            >
              <Card className="border-none shadow-xl bg-zim-black text-white p-6 md:p-10 rounded-3xl overflow-hidden">
                <Brain className="absolute -top-10 -right-10 h-40 w-40 opacity-5" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-zim-gold rounded-xl">
                    <Sparkles className="h-6 w-6 text-zim-black" />
                  </div>
                  <h3 className="text-xl font-bold">Onesa AI <span className="text-zim-gold ml-2 text-sm font-normal">{t('tech.ai_status')}</span></h3>
                </div>
                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                  <p className="text-white/70 italic text-sm mb-3">"How can I invest in Zimbabwe's agriculture sector?"</p>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-full bg-zim-gold flex-shrink-0 flex items-center justify-center text-zim-black font-bold text-xs">O</div>
                    <p className="text-sm text-white/90 leading-snug">{t('tech.ai_demo_response')}</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* 2. Meaning & Description Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center flex flex-col items-center"
            >
              {/* Reduced mb-3 to mb-1.5 */}
              <Badge className="mb-1.5 bg-primary/10 text-primary border-primary/20 px-4 py-0.5 text-xs font-semibold">
                {t('tech.onesa_badge')}
              </Badge>

              {/* Reduced mb-3 to mb-2 and md:text-5xl to md:text-4xl for a tighter profile */}
              <h2 className="text-3xl md:text-4xl font-bold mb-2 text-primary leading-tight">
                {t('tech.onesa_title')}
              </h2>

              {/* Reduced mb-6 to mb-3 and text-lg to text-md */}
              <p className="text-md text-muted-foreground mb-3 italic">
                "{t('tech.onesa_meaning')}"
              </p>

              {/* Changed space-y-3 to space-y-1.5 and reduced text size slightly */}
              <div className="space-y-1.5 text-sm md:text-base text-muted-foreground leading-snug max-w-2xl">
                <p>{t('tech.onesa_desc1')}</p>
                
                {/* Removed pt-2 and used a small gap instead */}
                <div className="pt-1">
                  <p className="font-bold text-primary inline mr-1">{t('tech.onesa_local_edge_title')}:</p>
                  <span className="inline">{t('tech.onesa_local_edge_desc')}</span>
                </div>
                
                <div className="pt-1">
                  <p className="font-bold text-primary inline mr-1">{t('tech.diaspora_unlocked_title')}:</p>
                  <span className="inline">{t('tech.diaspora_unlocked_desc')}</span>
                </div>
              </div>

              {/* Reduced mt-8 to mt-5 and gap-3 to gap-2 */}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border border-border">
                  <CheckCircle className="h-3.5 w-3.5 text-zim-green" />
                  <span className="font-medium text-xs">{t('tech.onesa_usp1')}</span>
                </div>
                <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md border border-border">
                  <CheckCircle className="h-3.5 w-3.5 text-zim-green" />
                  <span className="font-medium text-xs">{t('tech.onesa_usp2')}</span>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Features Grid - py-24 to py-16 */}
     <section id="technology-capabilities" className="pt-0 pb-8 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">{t('tech.features_title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('tech.features_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-none shadow-sm hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-tight">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sector Transformation - py-24 to py-16 */}
      <section id="technology-industries" className="pt-0 pb-8 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <Badge className="mb-2 bg-primary/10 text-primary">{t('tech.sectors_badge')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('tech.sectors_title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('tech.sectors_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sectors.map((sector, index) => (
              <Card key={index} className="overflow-hidden border-border/50 group">
                <div className="flex flex-col sm:flex-row h-full">
                  <div className="sm:w-1/3 bg-muted flex items-center justify-center p-6 group-hover:bg-zim-gold/5 transition-colors">
                    <sector.icon className="h-12 w-12 text-zim-gold" />
                  </div>
                  <div className="p-6 sm:w-2/3">
                    <h3 className="text-xl font-bold mb-2">{sector.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-snug">{sector.description}</p>
                    <ul className="space-y-1">
                      {sector.details.map((detail, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-2 text-xs">
                          <CheckCircle className="h-4 w-4 text-zim-green flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Tightened */}
      <section className="py-16 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('tech.cta_title')}</h2>
          <p className="text-lg mb-8 max-w-xl mx-auto opacity-90">{t('tech.cta_desc')}</p>
          <Button size="lg" variant="secondary" className="font-bold px-8 h-12 shadow-xl">
            {t('tech.cta_button')}
          </Button>
        </div>
      </section>
    </Layout>
  );
}