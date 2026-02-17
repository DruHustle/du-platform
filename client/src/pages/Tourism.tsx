import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Shield, CreditCard, Award, CheckCircle2, Brain, Sparkles, Globe, Building2, Car, Globe2, Heart, FileText, Dog, TrendingUp } from "lucide-react";
import ZimbabweShopInfo from "@/components/ZimbabweShopInfo";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";
import { Link } from "wouter";

export default function Tourism() {
  const { t } = useTranslation();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/pages/tourism/victoria_falls.jpg",
      badge: t('tourism.hero.badge1') || "Visit Zimbabwe",
      badgeIcon: Globe,
      title: t('tourism.hero.title1') || "Discover the Majesty",
      titleHighlight: t('tourism.hero.highlight1') || "World-Class Beauty",
      subtitle: t('tourism.hero.subtitle1') || "From Victoria Falls to Great Zimbabwe, experience the heart of Africa.",
      buttons: [
        { text: t('tourism.hero.plan_journey') || "Plan Your Journey", variant: "primary", link: "/tourism#plan-visit" },
        { text: t('tourism.hero.watch_exp') || "Watch Experience", variant: "outline", link: "/tourism#attractions" }
      ]
    },
    {
      image: "/images/pages/shop/zimbabwe_shop_hero.jpg",
      badge: t('tourism.hero.badge2') || "Cultural Heritage",
      badgeIcon: Award,
      title: t('tourism.hero.title2') || "Rich History",
      subtitle: t('tourism.hero.subtitle2') || "Explore ancient civilizations and vibrant modern culture.",
      buttons: []
    },
    {
      image: "/images/pages/wikimedia/african-elephant.jpg",
      badge: t('tourism.hero.badge3') || "Adventure",
      badgeIcon: Car,
      title: t('tourism.hero.title3') || "Wildlife & Safari",
      subtitle: t('tourism.hero.subtitle3') || "Unforgettable encounters in pristine national parks.",
      buttons: []
    },
    {
      image: "/images/pages/tourism/great_zimbabwe.jpeg",
      badge: t('tourism.hero.badge4') || "Historical Site",
      badgeIcon: Building2,
      title: t('tourism.hero.title4') || "Great Zimbabwe",
      subtitle: t('tourism.hero.subtitle4') || "Ancient stone ruins showcasing medieval African civilization.",
      buttons: []
    }
    ,
    {
      image: "/images/pages/tourism/cheetah.png",
      badge: t('tourism.hero.badge3') || "Adventure",
      badgeIcon: Dog,
      title: t('tourism.hero.title3') || "Wildlife & Safari",
      subtitle: t('tourism.hero.subtitle3') || "Unforgettable encounters in pristine national parks.",
      buttons: []
    },
    {
      image: "/images/pages/tourism/mana_pools.jpg",
      badge: "UNESCO Wilderness",
      badgeIcon: Globe2,
      title: "Mana Pools Experience",
      subtitle: "River-fed plains, walking safaris, and premium wildlife viewing in one of Africa's iconic landscapes.",
      buttons: []
    },
    {
      image: "/images/pages/tourism/dest_hwange.png",
      badge: "National Parks",
      badgeIcon: Shield,
      title: "Hwange Wildlife Corridor",
      subtitle: "Zimbabwe's largest national park, known for elephant herds and strong safari potential.",
      buttons: []
    },
    {
      image: "/images/pages/tourism/kariba_sunset.jpg",
      badge: "Lake & Leisure",
      badgeIcon: TrendingUp,
      title: "Kariba Adventure Tourism",
      subtitle: "Houseboats, sport fishing, and scenic cruises continue to attract regional and international visitors.",
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
    title: t('tourism.objective_title') || "Our Vision",
    description: t('tourism.objective_subtitle') || "To build a global gateway connecting Zimbabwe’s culture, products, tourism, and investment opportunities."
  };

  const attractions = [
    { name: t('tourism.attractions.vicfalls.name') || "Victoria Falls", image: "/images/pages/tourism/victoria_falls.jpg", highlights: [t('tourism.attractions.vicfalls.h1') || "UNESCO World Heritage", t('tourism.attractions.vicfalls.h2') || "Adventure Hub", t('tourism.attractions.vicfalls.h3') || "Wildlife Viewing"], summary: t('tourism.attractions.vicfalls.summary') || "Known locally as Mosi-oa-Tunya (The Smoke That Thunders), Victoria Falls is twice the height of Niagara Falls. Experience white-water rafting, bungee jumping, helicopter flights, and the famous Devil's Pool. The falls are at their most spectacular from February to May during peak flow." },
    { name: t('tourism.attractions.greatzim.name') || "Great Zimbabwe", image: "/images/pages/tourism/great_zimbabwe.jpeg", highlights: [t('tourism.attractions.greatzim.h1') || "UNESCO World Heritage", t('tourism.attractions.greatzim.h2') || "Historical Site", t('tourism.attractions.greatzim.h3') || "Cultural Heritage"], summary: t('tourism.attractions.greatzim.summary') || "Built between the 11th and 15th centuries, Great Zimbabwe was the capital of the Kingdom of Zimbabwe. The massive stone structures were built without mortar, showcasing sophisticated engineering. The site gives the country its name and remains a powerful symbol of African achievement." },
    { name: t('tourism.attractions.kariba.name') || "Kariba Dam", image: "/images/pages/tourism/kariba_dam.webp", highlights: [t('tourism.attractions.kariba.h1') || "Water Sports", t('tourism.attractions.kariba.h2') || "Tiger Fishing", t('tourism.attractions.kariba.h3') || "Scenic Sunset"], summary: t('tourism.attractions.kariba.summary') || "Lake Kariba stretches over 5,500 square kilometers along the Zambezi River. Famous for world-class tiger fishing, houseboat holidays, and stunning sunsets. The lake is home to abundant wildlife including hippos, crocodiles, and elephants along its shores. Matusadona National Park offers excellent game viewing." },
    { name: t('tourism.attractions.rocks.name') || "Balancing Rocks", image: "/images/pages/tourism/balancing_rocks.jpg", highlights: [t('tourism.attractions.rocks.h1') || "National Symbol", t('tourism.attractions.rocks.h2') || "Photography", t('tourism.attractions.rocks.h3') || "Natural Wonder"], summary: t('tourism.attractions.rocks.summary') || "These gravity-defying granite formations appear on Zimbabwe's currency and are found throughout the country, particularly in Matobo National Park. Formed over millions of years through erosion, the rocks create surreal landscapes perfect for photography, rock climbing, and nature walks." }
  ];

  const planningInfo = [
    { icon: MapPin, title: t('tourism.planning.visa.title') || "Visa Requirements", description: t('tourism.planning.visa.desc') || "Essential entry information for international travelers.", details: [t('tourism.planning.visa.d1') || "e-Visa application system available", t('tourism.planning.visa.d2') || "Visa on arrival for many nationalities", t('tourism.planning.visa.d3') || "Valid passport (6 months) required"] },
    { icon: Shield, title: t('tourism.planning.health.title') || "Health & Safety", description: t('tourism.planning.health.desc') || "Stay healthy and safe during your Zimbabwean adventure.", details: [t('tourism.planning.health.d1') || "Yellow fever certificate if applicable", t('tourism.planning.health.d2') || "Malaria prophylaxis recommended", t('tourism.planning.health.d3') || "Comprehensive travel insurance advised"] },
    { icon: CreditCard, title: t('tourism.planning.payment.title') || "Currency & Payments", description: t('tourism.planning.payment.desc') || "Navigating the local financial landscape.", details: [t('tourism.planning.payment.d1') || "Multi-currency system (USD widely accepted)", t('tourism.planning.payment.d2') || "Visa and Mastercard accepted in major hotels", t('tourism.planning.payment.d3') || "Mobile money (EcoCash) widely used"] },
    { icon: Calendar, title: t('tourism.planning.time.title') || "Best Time to Visit", description: t('tourism.planning.time.desc') || "Timing your trip for the best experience.", details: [t('tourism.planning.time.d1') || "May to October for wildlife viewing", t('tourism.planning.time.d2') || "February to May for Victoria Falls", t('tourism.planning.time.d3') || "Pleasant year-round temperate climate"] }
  ];

  const onesaTouristFeatures = [
    { icon: Brain, title: t('tourism.onesa.guide.title') || "Local Insights", description: t('tourism.onesa.guide.desc') || "Understand local etiquette, tipping culture, and social norms." },
    { icon: MapPin, title: t('tourism.onesa.navigate.title') || "Smart Navigation", description: t('tourism.onesa.navigate.desc') || "Find the best routes and hidden spots known only to locals." },
    { icon: Calendar, title: t('tourism.onesa.plan.title') || "Custom Itineraries", description: t('tourism.onesa.plan.desc') || "AI-generated plans based on your interests and travel style." }
  ];

  const sectorSnapshot = [
    {
      icon: TrendingUp,
      title: t("tourism.snapshot.performance.title") || "Sector Recovery and Contribution",
      detail:
        t("tourism.snapshot.performance.detail") ||
        "Tourism receipts continue to recover strongly, with the sector targeting multi-billion-dollar contribution and a growing share of national GDP.",
    },
    {
      icon: Globe2,
      title: t("tourism.snapshot.attractions.title") || "UNESCO and Wildlife Anchors",
      detail:
        t("tourism.snapshot.attractions.detail") ||
        "Victoria Falls, Mana Pools, Great Zimbabwe, and flagship national parks remain the core demand drivers for international visitors.",
    },
    {
      icon: Car,
      title: t("tourism.snapshot.infrastructure.title") || "Access and Infrastructure Upgrades",
      detail:
        t("tourism.snapshot.infrastructure.detail") ||
        "Road and airport rehabilitation is improving access to key tourism corridors and regional destination circuits.",
    },
  ];

  const growthOpportunities = [
    {
      title: t("tourism.opportunities.ecotourism.title") || "Ecotourism and Sustainability",
      detail:
        t("tourism.opportunities.ecotourism.detail") ||
        "Develop eco-lodges and low-impact conservation experiences around premium parks and protected areas.",
    },
    {
      title: t("tourism.opportunities.cbt.title") || "Community-Based Tourism",
      detail:
        t("tourism.opportunities.cbt.detail") ||
        "Scale projects that empower local communities through guided culture tours, performances, and locally owned experiences.",
    },
    {
      title: t("tourism.opportunities.hospitality.title") || "Hospitality and Infrastructure",
      detail:
        t("tourism.opportunities.hospitality.detail") ||
        "Expand quality accommodation and visitor facilities in Harare, Bulawayo, Mutare, and key gateway routes.",
    },
    {
      title: t("tourism.opportunities.gastronomy.title") || "Gastronomy Tourism",
      detail:
        t("tourism.opportunities.gastronomy.detail") ||
        "Build farm-to-table and local cuisine experiences connected to small-scale producers and culinary tourism demand.",
    },
    {
      title: t("tourism.opportunities.adventure.title") || "Adventure Tourism",
      detail:
        t("tourism.opportunities.adventure.detail") ||
        "Grow high-value activities such as rafting, bungee, canoeing, and wilderness expeditions around Victoria Falls and the Zambezi corridor.",
    },
    {
      title: t("tourism.opportunities.regional.title") || "Regional Hub Packaging",
      detail:
        t("tourism.opportunities.regional.detail") ||
        "Position Harare and Bulawayo as gateway hubs for multi-country itineraries including KAZA and cross-border circuits.",
    },
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
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t('tourism.onesa.title') || "Your Local Guide in Your Pocket"}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('tourism.onesa.subtitle') || "Navigating Zimbabwe can be complex. Onesa AI understands local travel dynamics and practical on-the-ground context to keep your trip seamless."}</p>
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
                    {t('tourism.onesa.badge') || "Onesa AI Companion"}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-white leading-tight">{t('tourism.onesa.companion_title') || "From booking flights,accurate weather information or discovering local gems, Onesa AI has you covered"}</h3>
                  <p className="text-sm text-white/50 leading-relaxed font-light">{t('tourism.onesa.companion_subtitle') || "Onesa AI helps you plan your trip and navigate the ins and outs once you're here. From understanding local etiquette to finding hidden gems, Onesa is your perfect travel companion."}</p>
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

              <Link href="/onesa-ai">
                <Button className="bg-zim-gold text-zim-black hover:bg-white hover:scale-105 transition-all px-8 h-12 rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl shadow-zim-gold/20">
                  {t('tourism.onesa.chat') || "Chat with Onesa"}
                </Button>
              </Link>
              </div>

              {/* Right Column: Phone Mockup */}
              <div className="lg:col-span-6 flex justify-center lg:justify-end">
                <div className="relative w-full max-w-[300px] aspect-[9/18.5] rounded-[3rem] p-3 border-[6px] border-white/10 bg-zinc-950 overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                  <div className="relative h-full w-full rounded-[2.2rem] overflow-hidden bg-slate-950">
                    <img src="/images/pages/technology/zim_think.jpg" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[3000ms]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <div className="absolute inset-x-4 bottom-8 space-y-4">
                      <div className="bg-zim-gold p-4 rounded-2xl rounded-br-none shadow-xl w-[90%] ml-auto">
                        <p className="text-zim-black text-[11px] font-bold leading-tight">{t("tourism.onesa.prompt_question") || "\"Onesa, what's the best local spot for traditional Sadza in Harare tonight?\""}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-2xl p-4 rounded-2xl rounded-bl-none border border-white/20 shadow-2xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-zim-gold animate-pulse shadow-[0_0_8px_rgba(212,175,55,1)]" />
                          <span className="text-[9px] font-black text-zim-gold uppercase tracking-[0.2em]">{t("tourism.onesa.name") || "Onesa AI"}</span>
                        </div>
                        <p className="text-white text-[11px] leading-relaxed font-light">{t("tourism.onesa.prompt_response") || "For an authentic Sadza experience in Harare, head to Mbare Musika. The local vendors there serve up delicious, freshly made Sadza with a variety of tasty relishes. It's a favorite among locals and offers a true taste of Zimbabwean cuisine. Just ask for 'Sadza ne Nyama' (Sadza with meat) for a hearty meal!"}</p>
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
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("tourism.attractions_title") || "Must-Visit Destinations"}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t("tourism.attractions_subtitle") || "Iconic landmarks that define the Zimbabwean experience."}</p>
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
              <h2 className="text-2xl font-black text-white tracking-tight mb-3">{t("tourism.other_attractions_title") || "Other Incredible Destinations"}</h2>
              <p className="text-sm text-white/40 max-w-xl mx-auto font-light">{t("tourism.other_attractions_subtitle") || "Beyond the iconic landmarks, Zimbabwe offers diverse landscapes and wildlife experiences across the country."}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Hwange National Park", img: "/images/pages/tourism/dest_hwange.png", desc: t("tourism.other_attractions.hwange.desc") || "Zimbabwe's largest park, famous for its massive elephant herds and diverse wildlife." },
                { name: "Matobo National Park", img: "/images/pages/tourism/dest_matobo.jpg", desc: t("tourism.other_attractions.matobo.desc") || "A UNESCO World Heritage site known for its balancing rocks and spiritual history." },
                { name: "Eastern Highlands", img: "/images/pages/tourism/mutarazi_falls.jpg", desc: t("tourism.other_attractions.eastern_highlands.desc") || "A cool, mountainous region offering lush forests, waterfalls, and misty peaks." },
                { name: "Mana Pools", img: "/images/pages/tourism/dest_mana_pools.jpg", desc: t("tourism.other_attractions.mana_pools.desc") || "A remote UNESCO site famous for its river-fed pools and walking safaris." },
                { name: "Nyanga National Park", img: "/images/pages/tourism/dest_nyanga.jpg", desc: t("tourism.other_attractions.nyanga.desc") || "The 'Little Scotland' of Africa, home to Zimbabwe's highest peak and deepest falls." },
                { name: "Gonarezhou", img: "/images/pages/tourism/dest_gonarezhou.jpg", desc: t("tourism.other_attractions.gonarezhou.desc") || "The 'Place of Elephants,' characterized by the stunning red Chilojo Cliffs." }
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

      {/* Tourism Economy Snapshot */}
      <section id="tourism-snapshot" className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              {t("tourism.snapshot.title") || "Zimbabwe Tourism Snapshot (2026)"}
            </h2>
            <p className="text-sm md:text-base text-white/50 max-w-3xl mx-auto mt-4 font-light leading-relaxed">
              {t("tourism.snapshot.subtitle") ||
                "Tourism is on a strong recovery path, supported by iconic assets, growing demand, and continued infrastructure upgrades."}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sectorSnapshot.map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7">
                <item.icon className="h-6 w-6 text-zim-gold mb-4" />
                <h3 className="text-white font-black mb-2">{item.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Opportunities */}
      <section id="tourism-opportunities" className="pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              {t("tourism.opportunities.title") || "Tourism Investment and Growth Opportunities"}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {growthOpportunities.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
                <h3 className="text-white font-black mb-3">{item.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Official Tourism Authorities */}
      <section id="tourism-authorities" className="pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-6 w-6 text-zim-gold" />
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
                {t("tourism.authorities.title") || "Official Tourism Authorities"}
              </h2>
            </div>
            <p className="text-white/70 text-sm md:text-base leading-relaxed mb-6">
              {t("tourism.authorities.subtitle") ||
                "Use official guidance from Zimbabwe Tourism Authority and Zimbabwe Parks and Wildlife Management Authority for permits, park information, and destination standards."}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer">
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("tourism.authorities.zta") || "Visit Zimbabwe Tourism Authority"}
                </Button>
              </a>
              <a href="https://zimparks.org.zw/" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("tourism.authorities.zimparks") || "Visit ZimParks"}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Planning Info - High-End Dashboard Style */}
      <section id="plan-visit" className="pt-10 pb-24 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("tourism.planning.essential_info") || "Essential Planning Information"}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t("tourism.planning.essential_desc") || "Everything you need to know to ensure a seamless and unforgettable adventure in Zimbabwe."}</p>
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
