import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Globe, TrendingUp, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function ExportHub() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = [
    {
      image: "/images/eu_symbol.png",
      badge: t('export.hero.badge1'),
      title: t('export.hero.title1'),
      subtitle: t('export.hero.desc1'),
      highlight: t('export.hero.highlight1')
    },
    {
      image: "/images/germany_flag.png",
      badge: t('export.hero.badge2'),
      title: t('export.hero.title2'),
      subtitle: t('export.hero.desc2'),
      highlight: t('export.hero.highlight2')
    }
  ];

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  return (
    <Layout>
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
                backgroundImage: `url('${heroSlides[currentHeroIndex].image}')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zim-black/70 via-zim-black/50 to-zim-black/85" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container text-white">
          <AnimatePresence initial={false}>
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Globe className="h-8 w-8 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex].badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex].title}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-white/90 leading-relaxed font-medium max-w-3xl">
                {heroSlides[currentHeroIndex].subtitle}
              </p>
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="h-6 w-6 text-zim-green" />
                <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex].highlight}</span>
              </div>
              <div className="flex flex-wrap gap-4">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-lg px-10 h-14 rounded-full font-bold group">
                      {t('export.connect_expert')}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <ContactForm
                      title={t('export.support_request')}
                      description={t('export.support_request_desc')}
                      module="export"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('export.market_req_title')}</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('export.market_req_desc')}
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
