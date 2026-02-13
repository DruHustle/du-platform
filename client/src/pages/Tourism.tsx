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
      name: "Victoria Falls",
      description: "One of the Seven Natural Wonders of the World, the world's largest sheet of falling water",
      image: "/images/victoria_falls.jpg",
      highlights: ["UNESCO World Heritage", "Adventure Hub", "Wildlife Viewing"],
      summary: "Known locally as Mosi-oa-Tunya (The Smoke That Thunders), Victoria Falls is twice the height of Niagara Falls. Experience white-water rafting, bungee jumping, helicopter flights, and the famous Devil's Pool. The falls are at their most spectacular from February to May during peak flow."
    },
    {
      name: "Great Zimbabwe",
      description: "Ancient stone ruins showcasing medieval African civilization and architectural excellence",
      image: "/images/great_zimbabwe.jpeg",
      highlights: ["UNESCO World Heritage", "Historical Site", "Cultural Heritage"],
      summary: "Built between the 11th and 15th centuries, Great Zimbabwe was the capital of the Kingdom of Zimbabwe. The massive stone structures were built without mortar, showcasing sophisticated engineering. The site gives the country its name and remains a powerful symbol of African achievement."
    },
    {
      name: "Kariba Dam",
      description: "One of the world's largest man-made lakes, perfect for houseboating and fishing",
      image: "/images/kariba_dam.webp",
      highlights: ["Water Sports", "Tiger Fishing", "Scenic Sunset"],
      summary: "Lake Kariba stretches over 5,500 square kilometers along the Zambezi River. Famous for world-class tiger fishing, houseboat holidays, and stunning sunsets. The lake is home to abundant wildlife including hippos, crocodiles, and elephants along its shores. Matusadona National Park offers excellent game viewing."
    },
    {
      name: "Balancing Rocks",
      description: "Iconic natural rock formations that symbolize Zimbabwe's unique geological heritage",
      image: "/images/balancing_rocks.jpg",
      highlights: ["National Symbol", "Photography", "Natural Wonder"],
      summary: "These gravity-defying granite formations appear on Zimbabwe's currency and are found throughout the country, particularly in Matobo National Park. Formed over millions of years through erosion, the rocks create surreal landscapes perfect for photography, rock climbing, and nature walks."
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
      {/* Hero Carousel Section */}
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
            <div className="absolute inset-0 bg-gradient-to-b from-zim-black/60 via-zim-black/40 to-zim-black/80" />
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
              className={currentHeroIndex === 0 ? "text-center flex flex-col items-center" : "text-left max-w-3xl"}
            >
              <div className={currentHeroIndex === 0 ? "flex items-center justify-center gap-3 mb-8" : "mb-6"}>
                {heroSlides[currentHeroIndex]?.badgeIcon && <Award className="h-10 w-10 text-zim-gold" />}
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex]?.badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex]?.title}
                {heroSlides[currentHeroIndex]?.titleHighlight && (
                  <span className="text-zim-gold italic">{heroSlides[currentHeroIndex]?.titleHighlight}</span>
                )}
              </h1>
              <p className={`text-xl md:text-2xl mb-4 ${currentHeroIndex === 0 ? 'max-w-3xl mx-auto text-white/90' : 'text-zim-gold'} leading-relaxed font-medium`}>
                {heroSlides[currentHeroIndex]?.subtitle}
              </p>
              {heroSlides[currentHeroIndex]?.description && (
                <p className="text-lg text-white/90 mb-6 max-w-2xl leading-relaxed">
                  {heroSlides[currentHeroIndex]?.description}
                </p>
              )}
              {heroSlides[currentHeroIndex]?.buttons.length > 0 && (
                <div className="flex flex-wrap gap-4 justify-center">
                  {heroSlides[currentHeroIndex]?.buttons.map((button, idx) => (
                    <Button 
                      key={idx}
                      size="lg" 
                      variant={button.variant === "outline" ? "outline" : "default"}
                      className={button.variant === "outline" 
                        ? "text-white border-white hover:bg-white/10 text-lg px-10 h-14 rounded-full font-bold"
                        : "bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-lg px-10 h-14 rounded-full font-bold"
                      }
                    >
                      {button.text}
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Carousel Indicators */}
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
       <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>




      {/* Zimbabwe Shop Section */}
     <section className="pt-0 pb-0 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-zim-green/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-zim-gold/5 rounded-full blur-3xl -ml-20 -mb-20" />
        <div className="container relative z-10">
          <ZimbabweShopInfo />
        </div>
      </section>

      {/* Onesa AI Tourist Companion Section */}
      <section className="my-10 container max-w-5xl px-4">

          <div className="text-center mb-8 space-y-4">
            <Badge variant="outline" className="border-zim-red text-zim-red uppercase tracking-widest px-4">Travel Guide</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">{t('tourism.onesa.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('tourism.onesa.subtitle')}
            </p>
          </div>

        <div className="bg-zim-black text-white relative overflow-hidden rounded-[2.5rem] border border-white/10 py-12 px-6 md:px-12 shadow-2xl">
          
          {/* Large, Visible Watermark Brain */}
          <div className="absolute top-1/2 -translate-y-1/2 right-[10%] opacity-[0.15] pointer-events-none transform -rotate-6 group-hover:rotate-0 transition-all duration-[3000ms] z-0">
            <Brain 
              className="h-[500px] w-[500px] text-zim-gold" 
              strokeWidth={0.5} 
            />
          </div>

          {/* Secondary Glow for Brain Visibility */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-zim-gold/5 blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              
              {/* Left Content (6/12) */}
              <motion.div
                className="lg:col-span-6"
                initial={{ opacity: 0, x: -15 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                {/* Scaled up Badge & Icon Container */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="p-2 bg-zim-gold/10 rounded-xl border border-zim-gold/20 shadow-sm">
                    <Sparkles className="h-5 w-5 text-zim-gold" />
                  </div>
                  <Badge variant="outline" className="border-zim-gold/40 text-zim-gold px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {t('tourism.onesa.badge')}
                  </Badge>
                </div>
                
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight">
                  {t('tourism.onesa.title')}
                </h3>
                
                <p className="text-sm text-white/60 mb-8 leading-relaxed max-w-md">
                  {t('tourism.onesa.subtitle')}
                </p>

                {/* Compact Feature List */}
                <div className="space-y-3 mb-8">
                  {onesaTouristFeatures.map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                      <div key={idx} className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-sm p-3 rounded-xl border border-white/5 hover:bg-white/[0.08] transition-all group/item">
                        <div className="p-2 bg-zim-black rounded-lg border border-white/10 group-hover/item:border-zim-gold/50 transition-colors">
                          <Icon className="h-4 w-4 text-zim-gold" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{feature.title}</h4>
                          <p className="text-[11px] text-white/40 leading-none">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button className="bg-zim-gold text-zim-black hover:bg-white transition-all px-6 h-9 rounded-full font-bold text-xs shadow-lg shadow-zim-gold/10">
                  {t('tourism.onesa.cta')}
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
                <div className="relative w-full max-w-[300px] aspect-[9/16] rounded-[3rem] p-3 border-[6px] border-white/10 bg-zinc-900 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] group">
                  <div className="relative h-full w-full rounded-[2.2rem] overflow-hidden bg-zim-black">
                    <img 
                      src="/images/tech/zim_think.jpg" 
                      alt="Onesa AI Guide" 
                      className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-[2000ms]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zim-black via-zim-black/10 to-transparent" />
                    
                    <div className="absolute inset-x-4 bottom-8 space-y-4">
                      <div className="bg-zim-gold p-3 rounded-2xl rounded-br-none shadow-lg w-[85%] ml-auto transform -rotate-1">
                        <p className="text-zim-black text-[11px] font-bold leading-tight">
                          "Onesa, what's the best local spot for Sadza?"
                        </p>
                      </div>

                      <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl rounded-bl-none border border-white/20 shadow-2xl transform rotate-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-zim-green animate-pulse" />
                          <span className="text-[9px] font-black text-zim-gold uppercase tracking-widest">Onesa AI</span>
                        </div>
                        <p className="text-white text-[11px] leading-snug font-medium">
                          "I recommend **Gava's** in Belgravia. The open-fire cooking gives it the most authentic taste in Harare!"
                        </p>
                      </div>
                    </div>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full border border-white/10 shadow-inner" />
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </div>
      </section>

      {/* Key Attractions */}
      <section id="attractions" className="pt-0 pb-20 md:pb-32 px-4 bg-muted/30 scroll-mt-24">
        <div className="container">
          <div className="text-center mb-8 space-y-4">
            <Badge variant="outline" className="border-zim-red text-zim-red uppercase tracking-widest px-4">Destinations</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">Must-Visit Attractions</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From ancient ruins to natural wonders, Zimbabwe offers experiences that will stay with you forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 perspective-1000">
            {attractions.map((attraction, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="card-professional overflow-hidden border-none shadow-xl transition-all duration-500 ease-out 
                  hover:shadow-2xl 
                  group-hover:-translate-y-4 
                  group-hover:rotate-x-2 
                  group-hover:rotate-y-[-2deg] 
                  bg-white">
                  <div className="relative h-80 overflow-hidden rounded-t-xl">
                    <img 
                      src={attraction.image} 
                      alt={attraction.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zim-black/90 via-zim-black/20 to-transparent opacity-80" />
                    <div className="absolute bottom-6 left-6 right-6 transition-transform duration-500 group-hover:translate-z-10">
                       <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-md">{attraction.name}</h3>
                       <div className="flex flex-wrap gap-2">
                        {attraction.highlights.map((highlight, idx) => (
                          <span key={idx} className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white px-2 py-1 rounded shadow-sm">
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-4">
                      {attraction.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attraction.highlights.map((highlight, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">{highlight}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>



          {/* Explore More Destinations */}
          <div id="explore-destinations" className="pt-12 pb-20 md:pb-32 px-4 bg-muted/30 scroll-mt-24">
            <div className="text-center mb-8 space-y-4">
              <Badge variant="outline" className="border-zim-gold text-zim-gold uppercase tracking-widest px-4">Explore More</Badge>
              <h2 className="text-4xl md:text-5xl font-bold">Other Incredible Destinations</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Beyond the iconic landmarks, Zimbabwe offers diverse landscapes and wildlife experiences across the country.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img src="/images/dest_hwange.png" alt="Hwange National Park" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold mb-3 text-zim-green">Hwange National Park</h4>
                  <p className="text-muted-foreground mb-4">
                    Zimbabwe's largest national park, home to over 100 mammal species and 400 bird species. Famous for its large elephant herds and year-round game viewing.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Wildlife Safari</Badge>
                    <Badge variant="secondary" className="text-xs">Big Five</Badge>
                    <Badge variant="secondary" className="text-xs">Game Drives</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img src="/images/dest_matobo.jpg" alt="Matobo National Park" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold mb-3 text-zim-green">Matobo National Park</h4>
                  <p className="text-muted-foreground mb-4">
                    Ancient granite formations and sacred sites with rock art dating back thousands of years. Home to black and white rhinos, and the burial site of Cecil Rhodes.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Rock Art</Badge>
                    <Badge variant="secondary" className="text-xs">Rhino Tracking</Badge>
                    <Badge variant="secondary" className="text-xs">History</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img src="/images/dest_eastern_highlands.jpg" alt="Eastern Highlands" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold mb-3 text-zim-green">Eastern Highlands</h4>
                  <p className="text-muted-foreground mb-4">
                    Misty mountains, lush forests, and cascading waterfalls. Perfect for hiking, birdwatching, and experiencing Zimbabwe's cooler climate and scenic beauty.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Hiking Trails</Badge>
                    <Badge variant="secondary" className="text-xs">Waterfalls</Badge>
                    <Badge variant="secondary" className="text-xs">Birdwatching</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img src="/images/dest_mana_pools.jpg" alt="Mana Pools National Park" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold mb-3 text-zim-green">Mana Pools National Park</h4>
                  <p className="text-muted-foreground mb-4">
                    UNESCO World Heritage Site on the Zambezi River. Renowned for walking safaris, canoeing adventures, and exceptional wildlife encounters in pristine wilderness.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Walking Safari</Badge>
                    <Badge variant="secondary" className="text-xs">Canoeing</Badge>
                    <Badge variant="secondary" className="text-xs">UNESCO Site</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img src="/images/dest_nyanga.jpg" alt="Nyanga National Park" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold mb-3 text-zim-green">Nyanga National Park</h4>
                  <p className="text-muted-foreground mb-4">
                    Zimbabwe's oldest national park featuring Mutarazi Falls (Africa's second highest), mountain scenery, trout fishing, and the famous Nyanga Skywalk.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Mountain Views</Badge>
                    <Badge variant="secondary" className="text-xs">Trout Fishing</Badge>
                    <Badge variant="secondary" className="text-xs">Skywalk</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow">
                <div className="relative h-48 overflow-hidden">
                  <img src="/images/dest_gonarezhou.jpg" alt="Gonarezhou National Park" className="w-full h-full object-cover" />
                </div>
                <CardContent className="p-6">
                  <h4 className="text-xl font-bold mb-3 text-zim-green">Gonarezhou National Park</h4>
                  <p className="text-muted-foreground mb-4">
                    "Place of Elephants" - a remote wilderness area with dramatic Chilojo Cliffs, diverse ecosystems, and part of the Great Limpopo Transfrontier Park.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Remote Safari</Badge>
                    <Badge variant="secondary" className="text-xs">Elephants</Badge>
                    <Badge variant="secondary" className="text-xs">Chilojo Cliffs</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>


     {/* Planning Your Visit */}
      <section id="plan-visit" className="section-padding bg-primary text-primary-foreground relative overflow-hidden scroll-mt-24">
       
        <div className="absolute inset-0 bg-[url('/images/cubes.png')] opacity-5" />
        
        <div className="container relative z-10">
          <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="border-yellow-400 text-yellow-400 uppercase tracking-widest px-4">Travel Guide</Badge>

            <h2 className="text-4xl md:text-5xl font-bold">Essential Planning Information</h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
             Everything you need to know to ensure a seamless and unforgettable adventure in Zimbabwe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {planningInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <motion.div
                  key={index}
                  whileHover={{ y: -10 }}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 p-8 rounded-[2rem] flex flex-col justify-between"
                >
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {/* Icons now use the secondary color (likely the gold/yellow) to pop against green */}
                          <Icon className="h-6 w-6 text-secondary" />
                          <h3 className="text-2xl font-bold text-white">
                            {info.title}
                          </h3>
                        </div>
                        <p className="opacity-80 text-sm leading-relaxed">
                          {info.description}
                        </p>
                      </div>
                    </div>

                    <ul className="space-y-4">
                      {info.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-white text-sm">
                          <CheckCircle2 className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

        {/* Contact Section */}
        <section className="py-16">
          <div className="container">
            <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Ready to Start Your Adventure?</CardTitle>
                <CardDescription className="text-base">
                  Our travel experts are ready to help you plan the perfect Zimbabwean experience tailored to your interests and needs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="text-lg px-8">
                      Connect with an Expert
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <ContactForm
                      title="Travel Inquiry"
                      description="Fill out the form below and our travel specialists will contact you."
                      module= "tourism"
                    />
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </section>


      {/* External Links */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore More Tourism Information
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              For detailed destination guides, booking information, and comprehensive tourism resources, visit the official Zimbabwe Tourism Authority website.
            </p>
            <a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Visit Zimbabwe Tourism Authority <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

    </Layout>
  );
}
