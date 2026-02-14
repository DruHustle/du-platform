import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Calendar, Shield, CreditCard, ExternalLink, Award, ArrowRight, CheckCircle2, Brain, Sparkles } from "lucide-react";
import ZimbabweShopInfo from "@/components/ZimbabweShopInfo";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Tourism() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/victoria_falls.jpg",
      badge: t('tourism.hero.badge1'),
      badgeIcon: true,
      title: t('tourism.hero.title1'),
      titleHighlight: t('tourism.hero.highlight1'),
      subtitle: t('tourism.hero.subtitle1'),
      buttons: [
        { text: t('tourism.hero.plan_journey'), variant: "primary" },
        { text: t('tourism.hero.watch_exp'), variant: "outline" }
      ]
    },
    {
      image: "/images/zimbabwe_shop_hero.jpg",
      badge: t('tourism.hero.badge2'),
      badgeIcon: false,
      title: t('tourism.hero.title2'),
      titleHighlight: "",
      subtitle: t('tourism.hero.subtitle2'),
      description: t('tourism.hero.desc2'),
      buttons: []
    },
    {
      image: "/images/hwange_elephants.jpg",
      badge: t('tourism.hero.badge3'),
      badgeIcon: true,
      title: t('tourism.hero.title3'),
      titleHighlight: "",
      subtitle: t('tourism.hero.subtitle3'),
      buttons: []
    },
    {
      image: "/images/great_zimbabwe.jpeg",
      badge: t('tourism.hero.badge4'),
      badgeIcon: true,
      title: t('tourism.hero.title4'),
      titleHighlight: "",
      subtitle: t('tourism.hero.subtitle4'),
      buttons: []
    },
    {
      image: "/images/victoria_falls.jpg",
      badge: t('tourism.hero.badge5'),
      badgeIcon: true,
      title: t('tourism.hero.title5'),
      titleHighlight: "",
      subtitle: t('tourism.hero.subtitle5'),
      buttons: []
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const attractions = [
    {
      name: t('tourism.attractions.vicfalls.name'),
      description: t('tourism.attractions.vicfalls.desc'),
      image: "/images/victoria_falls.jpg",
      highlights: [
        t('tourism.attractions.vicfalls.h1'), 
        t('tourism.attractions.vicfalls.h2'), 
        t('tourism.attractions.vicfalls.h3')
      ],
      summary: t('tourism.attractions.vicfalls.summary')
    },
    {
      name: t('tourism.attractions.greatzim.name'),
      description: t('tourism.attractions.greatzim.desc'),
      image: "/images/great_zimbabwe.jpeg",
      highlights: [
        t('tourism.attractions.greatzim.h1'), 
        t('tourism.attractions.greatzim.h2'), 
        t('tourism.attractions.greatzim.h3')
      ],
      summary: t('tourism.attractions.greatzim.summary')
    },
    {
      name: t('tourism.attractions.kariba.name'),
      description: t('tourism.attractions.kariba.desc'),
      image: "/images/kariba_dam.webp",
      highlights: [
        t('tourism.attractions.kariba.h1'), 
        t('tourism.attractions.kariba.h2'), 
        t('tourism.attractions.kariba.h3')
      ],
      summary: t('tourism.attractions.kariba.summary')
    },
    {
      name: t('tourism.attractions.rocks.name'),
      description: t('tourism.attractions.rocks.desc'),
      image: "/images/balancing_rocks.jpg",
      highlights: [
        t('tourism.attractions.rocks.h1'), 
        t('tourism.attractions.rocks.h2'), 
        t('tourism.attractions.rocks.h3')
      ],
      summary: t('tourism.attractions.rocks.summary')
    }
  ];
  const planningInfo = [
    {
      icon: MapPin,
      title: t('tourism.planning.visa.title'),
      description: t('tourism.planning.visa.desc'),
      details: [t('tourism.planning.visa.d1'), t('tourism.planning.visa.d2'), t('tourism.planning.visa.d3')]
    },
    {
      icon: Shield,
      title: t('tourism.planning.health.title'),
      description: t('tourism.planning.health.desc'),
      details: [t('tourism.planning.health.d1'), t('tourism.planning.health.d2'), t('tourism.planning.health.d3')]
    },
    {
      icon: CreditCard,
      title: t('tourism.planning.payment.title'),
      description: t('tourism.planning.payment.desc'),
      details: [t('tourism.planning.payment.d1'), t('tourism.planning.payment.d2'), t('tourism.planning.payment.d3')]
    },
    {
      icon: Calendar,
      title: t('tourism.planning.time.title'),
      description: t('tourism.planning.time.desc'),
      details: [t('tourism.planning.time.d1'), t('tourism.planning.time.d2'), t('tourism.planning.time.d3')]
    }
  ];

  const onesaTouristFeatures = [
    {
      icon: Brain,
      title: t('tourism.onesa.guide.title'),
      description: t('tourism.onesa.guide.desc')
    },
    {
      icon: MapPin,
      title: t('tourism.onesa.navigate.title'),
      description: t('tourism.onesa.navigate.desc')
    },
    {
      icon: Calendar,
      title: t('tourism.onesa.plan.title'),
      description: t('tourism.onesa.plan.desc')
    }
  ];

  return (
    <Layout>
   {/* Hero Section  */}
    <section className="relative min-h-[500px] md:h-[600px] flex items-center overflow-hidden">
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
            style={{ backgroundImage: `url('${heroSlides[currentHeroIndex]?.image}')` }}
          />
          {/* Subtle overlay for text protection */}
          <div className="absolute inset-0 bg-gradient-to-r from-zim-black/70 via-zim-black/40 to-transparent" />
        </motion.div>
      </AnimatePresence>
      
      <div className="relative z-10 container mx-auto px-6 md:px-12 py-12">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`content-${currentHeroIndex}`}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl text-left"
          >
            {/* Updated Badge & Icon to match Template 1 */}
            <div className="flex items-center gap-3 mb-6 slide-up justify-start">
              <Award className="h-8 w-8 text-zim-gold" />
              <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                {heroSlides[currentHeroIndex]?.badge}
              </Badge>
            </div>
            
            {/* Standardized Heading Scale: 5xl -> 7xl */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight text-white slide-up">
              {heroSlides[currentHeroIndex]?.title}
              {heroSlides[currentHeroIndex]?.titleHighlight && (
                <span className="text-zim-gold italic ml-4 block sm:inline">
                  {heroSlides[currentHeroIndex]?.titleHighlight}
                </span>
              )}
            </h1>
            
            {/* Standardized Subtitle: xl -> 2xl */}
            <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed font-medium max-w-3xl slide-up">
              {heroSlides[currentHeroIndex]?.subtitle}
            </p>

            {/* Premium Highlight Line */}
            {heroSlides[currentHeroIndex]?.titleHighlight && (
              <div className="flex items-center gap-3 mb-8 slide-up">
                <div className="h-px w-12 bg-zim-gold/50" /> {/* Added a subtle visual line */}
                <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex]?.titleHighlight}</span>
              </div>
            )}

            {/* Standardized Button Dimensions (h-14, px-10) */}
            {heroSlides[currentHeroIndex]?.buttons?.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-start slide-up">
                {heroSlides[currentHeroIndex]?.buttons.map((button, idx) => (
                  <Button 
                    key={idx}
                    size="lg" 
                    variant={button.variant === "primary" ? "default" : "outline"}
                    className={`text-lg px-10 h-14 rounded-full font-bold group transition-all w-full sm:w-auto ${
                      button.variant === "primary" 
                      ? "bg-zim-gold text-zim-black hover:bg-zim-gold/90 border-none shadow-xl" 
                      : "text-white border-white hover:bg-white hover:text-zim-black backdrop-blur-sm"
                    }`}
                  >
                    {button.text}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-12 left-6 md:left-12 flex gap-3 z-20">
        {heroSlides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentHeroIndex(idx)}
            className={`h-1.5 transition-all duration-300 rounded-full ${
              idx === currentHeroIndex ? 'bg-zim-gold w-12' : 'bg-white/40 w-4 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>

      {/* Zimbabwe Shop Section */}
      <section className="py-0 bg-background relative overflow-hidden">
        <div className="container relative z-10">
          <ZimbabweShopInfo />
        </div>
      </section>

      {/* Onesa AI Tourist Companion Section */}
      <section className="container max-w-4xl px-4">

          <div className="text-center mb-6 space-y-3">
            <Badge variant="outline" className="border-zim-red text-zim-red uppercase tracking-widest px-4 text-[10px]">{t('tourism.onesa.name')}</Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t('tourism.onesa.title')}</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            {t('tourism.onesa.subtitle')}
            </p>
          </div>

        <div className="bg-zim-black text-white relative overflow-hidden rounded-[2rem] border border-white/10 py-10 px-6 md:px-10 shadow-2xl">
          
          {/* Large, Visible Watermark Brain */}
          <div className="absolute top-1/2 -translate-y-1/2 right-[10%] opacity-[0.12] pointer-events-none transform -rotate-6 group-hover:rotate-0 transition-all duration-[3000ms] z-0">
            <Brain 
              className="h-[450px] w-[450px] text-zim-gold" 
              strokeWidth={0.5} 
            />
          </div>

          {/* Secondary Glow for Brain Visibility */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-zim-gold/5 blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Content (6/12) */}
              <motion.div
                className="lg:col-span-6"
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                {/* Scaled up Badge & Icon Container */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-1.5 bg-zim-gold/10 rounded-xl border border-zim-gold/20 shadow-sm">
                    <Sparkles className="h-4 w-4 text-zim-gold" />
                  </div>
                  <Badge variant="outline" className="border-zim-gold/40 text-zim-gold px-2.5 py-0 text-[10px] font-bold uppercase tracking-wider">
                    {t('tourism.onesa.badge')}
                  </Badge>
                </div>
                
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 tracking-tight">
                  {t('tourism.onesa.companion_title')}
                </h3>
                
                <p className="text-xs text-white/60 mb-6 leading-relaxed max-w-sm">
                  {t('tourism.onesa.companion_subtitle')}
                </p>

                {/* Compact Feature List */}
                <div className="space-y-2.5 mb-6">
                  {onesaTouristFeatures.map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3 bg-white/[0.02] backdrop-blur-sm p-2.5 rounded-xl border border-white/5 hover:bg-white/[0.06] transition-all group/item">
                        <div className="p-1.5 bg-zim-black rounded-lg border border-white/10 group-hover/item:border-zim-gold/50 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-zim-gold" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">{feature.title}</h4>
                          <p className="text-[10px] text-white/40 leading-none">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button className="bg-zim-gold text-zim-black hover:bg-white transition-all px-5 h-8 rounded-full font-bold text-[10px] shadow-lg shadow-zim-gold/10">
                  {t('tourism.onesa.chat')}
                </Button>
              </motion.div>
              
              {/* Right Content - Wide Phone Mockup (6/12) */}
              <motion.div
                className="lg:col-span-6 flex justify-center lg:justify-end"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-[2.5rem] p-2.5 border-[5px] border-white/10 bg-zinc-900 overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.7)] group">
                  <div className="relative h-full w-full rounded-[2rem] overflow-hidden bg-zim-black">
                    <img 
                      src="/images/tech/zim_think.jpg" 
                      alt= {t("tourism.onesa.img_alt")}
                      className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-[2000ms]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zim-black via-zim-black/10 to-transparent" />
                    
                    <div className="absolute inset-x-3 bottom-6 space-y-3">
                      <div className="bg-zim-gold p-2.5 rounded-2xl rounded-br-none shadow-lg w-[85%] ml-auto transform -rotate-1">
                        <p className="text-zim-black text-[10px] font-bold leading-tight">
                         {t("tourism.onesa.prompt_question")}
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-xl p-3.5 rounded-2xl rounded-bl-none border border-white/20 shadow-2xl transform rotate-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-1 w-1 rounded-full bg-zim-green animate-pulse" />
                          <span className="text-[8px] font-black text-zim-gold uppercase tracking-widest"> {t("tourism.onesa.name")}</span>
                        </div>
                        <p className="text-white text-[10px] leading-snug font-medium">
                          {t("tourism.onesa.prompt_response")}
                        </p>
                      </div>
                    </div>

                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full border border-white/10 shadow-inner" />
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* Key Attractions - Matched to Modules Grid */}
      <section id="attractions" className=" pt-5 py-12 px-4 bg-muted/30 scroll-mt-24">
        <div className="container">
          <div className="text-center mt-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t("tourism.attractions_title")}</h2>
            <p className=" ext-sm text-muted-foreground max-w-2xl mx-auto">{t("tourism.attractions_subtitle")}</p>
          </div>

          <div className=" pt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {attractions.map((attraction, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <Card className="border-2 overflow-hidden group hover:shadow-xl transition-all duration-500 bg-white h-full">
                  <div className="relative h-64 overflow-hidden">
                    <img src={attraction.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                       <h3 className="text-lg font-bold text-white mb-2">{attraction.name}</h3>
                       <div className="flex flex-wrap gap-1.5">
                        {attraction.highlights.map((highlight, idx) => (
                          <span key={idx} className="text-[9px] font-bold uppercase bg-white/20 backdrop-blur-md text-white px-2 py-0.5 rounded">
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground leading-relaxed">{attraction.summary}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Other Destinations Grid */}
          <div id="explore-destinations" className="pt-16 pb-8">
            <div className="text-center mb-5">
              <h2 className="text-lg md:text-xl font-bold mb-2">{t("tourism.other_attractions_title")}</h2>
              <p className="text-xs text-muted-foreground max-w-2xl mx-auto">{t("tourism.other_attractions_subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Hwange National Park", img: "/images/dest_hwange.png", desc: t("tourism.other_attractions.hwange.desc")  },
                { name: "Matobo National Park", img: "/images/dest_matobo.jpg", desc: t("tourism.other_attractions.matobo.desc") },
                { name: "Eastern Highlands", img: "/images/dest_eastern_highlands.jpg", desc: t("tourism.other_attractions.eastern_highlands.desc") },
                { name: "Mana Pools", img: "/images/dest_mana_pools.jpg", desc: t("tourism.other_attractions.mana_pools.desc") },
                { name: "Nyanga National Park", img: "/images/dest_nyanga.jpg", desc: t("tourism.other_attractions.nyanga.desc") },
                { name: "Gonarezhou", img: "/images/dest_gonarezhou.jpg", desc: t("tourism.other_attractions.gonarezhou.desc") }
              
              ].map((dest, i) => (
                <Card key={i} className="border-2 overflow-hidden hover:shadow-lg transition-all">
                  <div className="h-40 overflow-hidden">
                    <img src={dest.img} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <h4 className="text-base font-bold mb-1 text-primary">{dest.name}</h4>
                    <p className="text-xs text-muted-foreground leading-snug">{dest.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

  {/* Planning Info - Now using the Slate-900 Blue from the first code */}
  <section id="plan-visit" className="py-12 bg-slate-900 text-white relative scroll-mt-24 rounded-2xl mx-4 md:mx-0">
    <div className="container relative z-10">
      <div className="text-center mb-10">
        <Badge className="mb-2 bg-white/10 text-white border-white/20 uppercase tracking-widest px-4">
          {t("tourism.planning.guide_badge")}
        </Badge>
        <h2 className="text-xl md:text-2xl font-bold mb-2">
          {t("tourism.planning.essential_info")}
        </h2>
        <p className="text-sm text-white/60 max-w-2xl mx-auto">
          {t("tourism.planning.essential_desc")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {planningInfo.map((info, index) => {
          const Icon = info.icon;
          return (
            /* Using bg-white/5 to give a subtle glass effect over the slate blue */
            <div key={index} className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Icon className="h-5 w-5 text-zim-gold" />
                <h3 className="text-lg font-bold">{info.title}</h3>
              </div>
              <p className="text-xs text-white/60 mb-4 leading-relaxed">
                {info.description}
              </p>
              <ul className="space-y-2">
                {info.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[11px] font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-zim-gold shrink-0 mt-0.5" />
                    <span className="text-white/80">{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  </section>

    </Layout>
  );
}