import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Shield, CreditCard, Award, CheckCircle2, Brain, Sparkles, Globe, Building2, Car, Globe2, Heart, FileText, Dog } from "lucide-react";
import ZimbabweShopInfo from "@/components/ZimbabweShopInfo";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";
import ComingSoon from "@/components/ComingSoon";

export default function Tourism() {
  const { t } = useTranslation();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/victoria_falls.jpg",
      badge: t('tourism.hero.badge1'),
      badgeIcon: Globe,
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
      badgeIcon: Award,
      title: t('tourism.hero.title2'),
      subtitle: t('tourism.hero.subtitle2'),
      buttons: []
    },
    {
      image: "/images/hwange_elephants.jpg",
      badge: t('tourism.hero.badge3'),
      badgeIcon: Car,
      title: t('tourism.hero.title3'),
      subtitle: t('tourism.hero.subtitle3'),
      buttons: []
    },
    {
      image: "/images/great_zimbabwe.jpeg",
      badge: t('tourism.hero.badge4'),
      badgeIcon: Building2,
      title: t('tourism.hero.title4'),
      subtitle: t('tourism.hero.subtitle4'),
      buttons: []
    }
    ,
    {
      image: "/images/cheetah.png",
      badge: t('tourism.hero.badge3'),
      badgeIcon: Dog,
      title: t('tourism.hero.title3'),
      subtitle: t('tourism.hero.subtitle3'),
      buttons: []
    }
  
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const introData = {
    icon: Heart,
    title: t('tourism.objective_title'),
    description: t('tourism.objective_subtitle')
  };

  const attractions = [
    { name: t('tourism.attractions.vicfalls.name'), image: "/images/victoria_falls.jpg", highlights: [t('tourism.attractions.vicfalls.h1'), t('tourism.attractions.vicfalls.h2'), t('tourism.attractions.vicfalls.h3')], summary: t('tourism.attractions.vicfalls.summary') },
    { name: t('tourism.attractions.greatzim.name'), image: "/images/great_zimbabwe.jpeg", highlights: [t('tourism.attractions.greatzim.h1'), t('tourism.attractions.greatzim.h2'), t('tourism.attractions.greatzim.h3')], summary: t('tourism.attractions.greatzim.summary') },
    { name: t('tourism.attractions.kariba.name'), image: "/images/kariba_dam.webp", highlights: [t('tourism.attractions.kariba.h1'), t('tourism.attractions.kariba.h2'), t('tourism.attractions.kariba.h3')], summary: t('tourism.attractions.kariba.summary') },
    { name: t('tourism.attractions.rocks.name'), image: "/images/balancing_rocks.jpg", highlights: [t('tourism.attractions.rocks.h1'), t('tourism.attractions.rocks.h2'), t('tourism.attractions.rocks.h3')], summary: t('tourism.attractions.rocks.summary') }
  ];

  const planningInfo = [
    { icon: MapPin, title: t('tourism.planning.visa.title'), description: t('tourism.planning.visa.desc'), details: [t('tourism.planning.visa.d1'), t('tourism.planning.visa.d2'), t('tourism.planning.visa.d3')] },
    { icon: Shield, title: t('tourism.planning.health.title'), description: t('tourism.planning.health.desc'), details: [t('tourism.planning.health.d1'), t('tourism.planning.health.d2'), t('tourism.planning.health.d3')] },
    { icon: CreditCard, title: t('tourism.planning.payment.title'), description: t('tourism.planning.payment.desc'), details: [t('tourism.planning.payment.d1'), t('tourism.planning.payment.d2'), t('tourism.planning.payment.d3')] },
    { icon: Calendar, title: t('tourism.planning.time.title'), description: t('tourism.planning.time.desc'), details: [t('tourism.planning.time.d1'), t('tourism.planning.time.d2'), t('tourism.planning.time.d3')] }
  ];

  const onesaTouristFeatures = [
    { icon: Brain, title: t('tourism.onesa.guide.title'), description: t('tourism.onesa.guide.desc') },
    { icon: MapPin, title: t('tourism.onesa.navigate.title'), description: t('tourism.onesa.navigate.desc') },
    { icon: Calendar, title: t('tourism.onesa.plan.title'), description: t('tourism.onesa.plan.desc') }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} intro={introData} />
      </section>

      {/* Zimbabwe Shop Section */}
      <section className="py-0 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <ZimbabweShopInfo />
        </div>
      </section>

      {/* Onesa AI Tourist Companion Section - Glassy UI Upgrade */}
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container max-w-5xl relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t('tourism.onesa.title')}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('tourism.onesa.subtitle')}</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative py-12 px-8 md:px-16 rounded-[3rem] overflow-hidden border border-white/10 backdrop-blur-3xl bg-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] group"
          >
             {/* The Crispy Edge Finish */}
             <span className="absolute inset-0 rounded-[3rem] border border-white/10 pointer-events-none" />
            
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              {/* Left Column */}
              <div className="lg:col-span-6 space-y-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zim-gold/10 rounded-xl border border-zim-gold/20">
                    <Sparkles className="h-5 w-5 text-zim-gold" />
                  </div>
                  <Badge variant="outline" className="border-zim-gold/40 text-zim-gold px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
                    {t('tourism.onesa.badge')}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-white leading-tight">{t('tourism.onesa.companion_title')}</h3>
                  <p className="text-sm text-white/50 leading-relaxed font-light">{t('tourism.onesa.companion_subtitle')}</p>
                </div>

                <div className="space-y-3">
                  {onesaTouristFeatures.map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <div key={idx} className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all group/item">
                        <div className="p-2 bg-slate-950 rounded-lg border border-white/10 group-hover/item:border-zim-gold/50 transition-colors">
                          <Icon className="h-4 w-4 text-zim-gold" />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-white tracking-tight">{feature.title}</h4>
                          <p className="text-[11px] text-white/40 leading-snug">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              <ComingSoon featureName={t('tourism.onesa.chat')}>
                <Button className="bg-zim-gold text-zim-black hover:bg-white hover:scale-105 transition-all px-8 h-12 rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl shadow-zim-gold/20">
                  {t('tourism.onesa.chat')}
                </Button>
              </ComingSoon>
              </div>

              {/* Right Column: Phone Mockup */}
              <div className="lg:col-span-6 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-[300px] aspect-[9/18.5] rounded-[3rem] p-3 border-[6px] border-white/10 bg-zinc-950 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                  <div className="relative h-full w-full rounded-[2.2rem] overflow-hidden bg-slate-950">
                    <img src="/images/tech/zim_think.jpg" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[3000ms]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <div className="absolute inset-x-4 bottom-8 space-y-4">
                      <div className="bg-zim-gold p-4 rounded-2xl rounded-br-none shadow-xl w-[90%] ml-auto">
                        <p className="text-zim-black text-[11px] font-bold leading-tight">{t("tourism.onesa.prompt_question")}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-2xl rounded-bl-none border border-white/20 shadow-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-zim-gold animate-pulse shadow-[0_0_8px_rgba(212,175,55,1)]" />
                          <span className="text-[9px] font-black text-zim-gold uppercase tracking-[0.2em]">{t("tourism.onesa.name")}</span>
                        </div>
                        <p className="text-white text-[11px] leading-relaxed font-light">{t("tourism.onesa.prompt_response")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Key Attractions - Cinematic Glass Grid */}
      <section id="attractions" className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("tourism.attractions_title")}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t("tourism.attractions_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {attractions.map((attraction, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div className="group relative h-[450px] rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-2">
                  <img src={attraction.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110 saturate-[0.8]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <h3 className="text-2xl font-black text-white mb-4 tracking-tight group-hover:text-zim-gold transition-colors">{attraction.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {attraction.highlights.map((highlight, idx) => (
                        <span key={idx} className="text-[10px] font-black uppercase tracking-widest bg-white/10 backdrop-blur-xl text-white/80 px-3 py-1 rounded-full border border-white/10">
                          {highlight}
                        </span>
                      ))}
                    </div>
                    <p className="text-sm text-white/60 font-light leading-relaxed line-clamp-2 group-hover:text-white transition-colors">{attraction.summary}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Other Destinations - Compact Glass Grid */}
          <div className="pt-24">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-black text-white tracking-tight mb-3">{t("tourism.other_attractions_title")}</h2>
              <p className="text-sm text-white/40 max-w-xl mx-auto font-light">{t("tourism.other_attractions_subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Hwange National Park", img: "/images/dest_hwange.png", desc: t("tourism.other_attractions.hwange.desc") },
                { name: "Matobo National Park", img: "/images/dest_matobo.jpg", desc: t("tourism.other_attractions.matobo.desc") },
                { name: "Eastern Highlands", img: "/images/dest_eastern_highlands.jpg", desc: t("tourism.other_attractions.eastern_highlands.desc") },
                { name: "Mana Pools", img: "/images/dest_mana_pools.jpg", desc: t("tourism.other_attractions.mana_pools.desc") },
                { name: "Nyanga National Park", img: "/images/dest_nyanga.jpg", desc: t("tourism.other_attractions.nyanga.desc") },
                { name: "Gonarezhou", img: "/images/dest_gonarezhou.jpg", desc: t("tourism.other_attractions.gonarezhou.desc") }
              ].map((dest, i) => (
                <motion.div key={i} whileHover={{ y: -5 }} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden group">
                  <div className="h-44 overflow-hidden relative">
                    <img src={dest.img} className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
                  </div>
                  <div className="p-5">
                    <h4 className="text-base font-bold text-white mb-2 group-hover:text-zim-gold transition-colors">{dest.name}</h4>
                    <p className="text-xs text-white/40 leading-snug font-light">{dest.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Planning Info - High-End Dashboard Style */}
      <section id="plan-visit" className="pt-10 pb-24 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("tourism.planning.essential_info")}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t("tourism.planning.essential_desc")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {planningInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <div key={index} className="relative p-8 rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] group">
                  <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-zim-gold/10 rounded-xl">
                      <Icon className="h-5 w-5 text-zim-gold" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{info.title}</h3>
                  </div>
                  <p className="text-sm text-white/50 mb-8 font-light leading-relaxed">{info.description}</p>
                  <ul className="space-y-3">
                    {info.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-[11px] font-black uppercase tracking-wider text-white/80">
                        <CheckCircle2 className="h-4 w-4 text-zim-gold opacity-60" />
                        <span>{detail}</span>
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