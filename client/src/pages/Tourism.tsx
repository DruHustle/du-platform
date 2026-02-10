import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Calendar, Shield, CreditCard, ExternalLink, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import ZimbabweShopInfo from "@/components/ZimbabweShopInfo";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Tourism() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = [
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
    }
  ];

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
      title: "Visa Requirements",
      description: "Most visitors can obtain visa on arrival. E-visa system available for advance applications.",
      details: ["Tourist visa: $30-75", "Valid passport required", "6 months validity recommended"]
    },
    {
      icon: Shield,
      title: "Health & Safety",
      description: "Zimbabwe is generally safe for tourists. Standard travel precautions recommended.",
      details: ["Yellow fever (if applicable)", "Malaria prophylaxis", "Travel insurance advised"]
    },
    {
      icon: CreditCard,
      title: "Payment Systems",
      description: "Multi-currency economy with USD widely accepted. Mobile money popular.",
      details: ["USD, ZAR, EUR accepted", "EcoCash mobile money", "Cards in major hotels"]
    },
    {
      icon: Calendar,
      title: "Best Time to Visit",
      description: "Year-round destination with dry season (May-October) being most popular.",
      details: ["May-Oct: Dry season", "Nov-Apr: Green season", "Falls best: Feb-May"]
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
                <Award className="h-8 w-8 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex].badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex].title}
                <span className="text-zim-gold">{heroSlides[currentHeroIndex].titleHighlight}</span>
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-white/90 leading-relaxed font-medium max-w-3xl">
                {heroSlides[currentHeroIndex].subtitle}
              </p>
              {heroSlides[currentHeroIndex].description && (
                <p className="text-lg mb-8 text-white/80 max-w-2xl">
                  {heroSlides[currentHeroIndex].description}
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                {heroSlides[currentHeroIndex].buttons.length > 0 ? (
                  heroSlides[currentHeroIndex].buttons.map((btn, idx) => (
                    <Button 
                      key={idx}
                      size="lg" 
                      variant={btn.variant as any}
                      className={btn.variant === "primary" ? "bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-lg px-10 h-14 rounded-full font-bold" : "text-white border-white hover:bg-white/10 text-lg px-10 h-14 rounded-full font-bold"}
                    >
                      {btn.text}
                    </Button>
                  ))
                ) : (
                  <Button size="lg" className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-lg px-10 h-14 rounded-full font-bold group">
                    Learn More
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}
              </div>
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

      {/* Attractions Grid */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background" id="attractions">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              Explore Zimbabwe
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('tourism.attractions_title')}</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {t('tourism.attractions_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {attractions.map((attraction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden border-2 hover:border-zim-gold/50 group transition-all duration-500 hover:shadow-2xl h-full">
                  <div className="relative h-80 overflow-hidden">
                    <img 
                      src={attraction.image} 
                      alt={attraction.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-3xl font-bold mb-2">{attraction.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {attraction.highlights.map((h, i) => (
                          <Badge key={i} variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-none">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-primary">{attraction.description}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground leading-relaxed">
                      {attraction.summary}
                    </p>
                    <Button variant="outline" className="w-full group/btn font-bold">
                      View Destination Guide
                      <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Zimbabwe Shop Info Section */}
      <section className="py-24 bg-zim-black text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zim-green via-zim-gold to-zim-red" />
        <div className="container relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              Coming Soon
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-6">🇿🇼 The Zimbabwe Shop</h2>
            <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
              Bringing the best of Zimbabwe to the European diaspora. Authenticity, quality, and heritage delivered to your doorstep.
            </p>
          </div>
          <ZimbabweShopInfo />
        </div>
      </section>

      {/* Travel Planning Section */}
      <section className="py-20 bg-background" id="plan">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('tourism.plan_visit_title')}</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              {t('tourism.plan_visit_desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {planningInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="border-2 hover:border-zim-gold transition-colors duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">{info.title}</CardTitle>
                    <CardDescription className="text-base">{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {info.details.map((detail, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-zim-green" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-primary text-white hover:bg-primary/90 px-12 h-16 rounded-full font-bold text-lg shadow-xl">
                  Connect with a Travel Specialist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <ContactForm 
                  title={t('tourism.contact_title')}
                  description={t('tourism.contact_desc')}
                  module="tourism"
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 border-t bg-muted/20">
        <div className="container">
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <img src="/images/zimtrade_logo.png" alt="ZimTrade" className="h-12 object-contain" />
            <img src="/images/zida_logo.png" alt="ZIDA" className="h-12 object-contain" />
            <img src="/images/zimbabwe_tourism_authority.png" alt="ZTA" className="h-16 object-contain" />
          </div>
        </div>
      </section>
    </Layout>
  );
}
