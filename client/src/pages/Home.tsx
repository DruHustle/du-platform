import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { FileText, BookOpen, Plane, TrendingUp, Package, ArrowRight, CheckCircle, Globe, Users, BarChart3, Award, Brain } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
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

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgrounds.length);
    }, 5000);
    return () => clearInterval(bgTimer);
  }, [heroBackgrounds.length]);

  const modules = [
    {
      title: t('home.modules.export.title'),
      description: t('home.modules.export.desc'),
      icon: BookOpen,
      href: "/export-hub",
      color: " bg-green-600/5 hover:bg-green-600/10",
      bgImage: "/images/eu_symbol.png",
      stats: t('home.modules.export.stats')
    },
    {
      title: t('home.modules.tourism.title'),
      description: t('home.modules.tourism.desc'),
      icon: Plane,
      href: "/tourism",
         color: " bg-yellow-500/5 hover:bg-yellow-500/10",
      bgImage: "/images/hwange_elephants.jpg",
      stats: t('home.modules.tourism.stats')
    },
    {
      title: t('home.modules.investment.title'),
      description: t('home.modules.investment.desc'),
      icon: TrendingUp,
      href: "/investment",
      color: " bg-red-600/5 hover:bg-red-600/10",
      bgImage: "/images/infrastructure_investment.webp",
      stats: t('home.modules.investment.stats')
    },
    {
      title: t('home.modules.trade.title'),
      description: t('home.modules.trade.desc'),
      icon: Package,
      href: "/trade",
      color: " bg-slate-800/5 hover:bg-slate-800/10",
      bgImage: "/images/african_trade.jpg",
      stats: t('home.modules.trade.stats')
    },
    {
      title: t('home.modules.technology.title'),
      description: t('home.modules.technology.desc'),
      icon: Brain,
      href: "/technology",
      color: " bg-purple-600/5 hover:bg-purple-600/10",
      bgImage: "/images/tech/ai_innovation.jpg",
      stats: t('home.modules.technology.stats')
    },
    {
      title: t('home.modules.success.title'),
      description: t('home.modules.success.desc'),
      icon: Award,
      href: "/success-stories",
      color: " bg-zim-gold/5 hover:bg-zim-gold/10",
      bgImage: "/images/partnership_handshake.png",
      stats: t('home.modules.success.stats')
    }
  ];



  return (
    
    <Layout>
    {/* Hero Section with Rotating Background */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        {/* Rotating Background Images */}
        <AnimatePresence initial={false}>
          <motion.div
            key={currentBgIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => window.scrollTo({top: 800, behavior: "smooth"})}
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.1 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${heroBackgrounds[currentBgIndex]}')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/40" />
          </motion.div>
        </AnimatePresence>
        
        {/* Animated background elements retained for depth */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 container text-center text-white flex flex-col items-center justify-center py-12">
  
          <div className="flex justify-center mb-6 slide-up">
            <div className="relative min-w-max"> 
              <img
                src="/images/made_in_zimbabwe.png"
                alt="Made in Zimbabwe"
                className="h-24 md:h-36 w-auto object-contain drop-shadow-2xl relative z-10" 
              />
              <div className="absolute -inset-6 bg-white/10 rounded-full blur-2xl -z-10" />
            </div>
          </div>
          
            <h1 className="!text-7xl sm:text-8xl md:text-[10rem] lg:text-[12rem] font-bold mb-4 tracking-tighter leading-none px-4 hero-text-shadow slide-up"style={{ animationDelay: '0.1s' }}>
              {t('home.hero_title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-3 max-w-4xl mx-auto font-semibold px-4 text-secondary slide-up" style={{ animationDelay: '0.2s' }}>
              {t('home.hero_subtitle')}
            </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 slide-up" style={{ animationDelay: '0.5s' }}>
            <Link href="/export-hub">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                {t('home.export_hub')}
              </Button>
            </Link>
            <Link href="/tourism">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                {t('home.tourism')}
              </Button>
            </Link>
            <Link href="/investment">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                {t('home.investments')} 
              </Button>
            </Link>

          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Four Modules */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container">
          <div className="text-center mb-16 px-4">
            <span className="badge-primary mb-4 inline-block">{t('home.platform_services')}</span>
             <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
              {t('home.gateway_title')}
            </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                 {t('home.gateway_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className={`overflow-hidden border-2 ${module.color} group hover:shadow-2xl transition-all duration-500 h-full`}>
                    <div className="relative h-64 overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url('${module.bgImage}')` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                      </div>
                      <div className="absolute bottom-6 left-6 text-white">
                        <div className="bg-white/10 backdrop-blur-lg p-4 rounded-2xl mb-3 inline-block border border-white/20 shadow-2xl">
                          <Icon className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <div className="absolute top-6 right-6">
                        <span className="bg-zim-gold backdrop-blur-md border border-white/20 text-zim-black text-sm font-bold px-4 py-2 rounded-full shadow-xl">
                          {module.stats}
                        </span>
                      </div>
                    </div>
                    <CardHeader className="pb-3 pt-6">
                      <CardTitle className="text-2xl md:text-3xl font-bold group-hover:text-primary transition-colors mb-3">{module.title}</CardTitle>
                      <CardDescription className="text-base md:text-lg leading-relaxed">{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2 pb-6">

                      <Link href={module.href}>
                        <Button 
                          className="w-full group/btn font-bold text-lg py-6" 
                          size="lg"
                          onClick={() => {window.scrollTo({top: 0,left: 0,
                              behavior: 'smooth' // Use 'instant' if you want it to jump immediately
                            });
                          }}
                        >
                          {t('home.explore_now')}
                          <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-2 transition-transform" />
                        </Button>
                      </Link>

                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>


      {/* Trust Indicators */}
      <section className="py-12 bg-background border-t">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">{t('home.trust.diaspora')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              <span className="text-sm font-medium">{t('home.trust.zida')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              <span className="text-sm font-medium">{t('home.trust.zimtrade')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{t('home.trust.vision2030')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* External Links */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('home.ready_to_connect')}
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              {t('home.join_diaspora')}
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/data-visualization">
                <Button size="lg" variant="secondary" className="shadow-lg">
                  {t('home.view_data')}
                </Button>
              </Link>
              <Link href="/success-stories">
                <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                  {t('home.success_stories')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>


    </Layout>
  );
}
