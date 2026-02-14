import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Users, Building2, Truck, Shield, AlertTriangle, CheckCircle, ArrowRight, Globe, Award, TrendingUp, Ship } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function ExportHub() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
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
    },
    {
      image: "/images/eu_flags.png",
      badge: t('export.hero.badge3'),
      title: t('export.hero.title3'),
      subtitle: t('export.hero.desc3'),
      highlight: t('export.hero.highlight3')
    },
    {
      image: "/images/export_port1.jpg",
      badge: t('export.hero.badge4'),
      title: t('export.hero.title4'),
      subtitle: t('export.hero.desc4'),
      highlight: t('export.hero.highlight4')
    },
    {
      image: "/images/horticulture.jpg",
      badge: t('export.hero.badge5'),
      title: t('export.hero.title5'),
      subtitle: t('export.hero.desc5'),
      highlight: t('export.hero.highlight5')
    },
    {
      image: "/images/manufacturing_factory.jpg",
      badge: t('export.hero.badge6'),
      title: t('export.hero.title6'),
      subtitle: t('export.hero.desc6'),
      highlight: t('export.hero.highlight6')
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

const germanRequirements = [
    {
      category: t('export.german_requirements.food_products.category'),
      requirements: t('export.german_requirements.food_products.requirements', { returnObjects: true }) || [],
      price: t('export.german_requirements.food_products.price'),
      icon: "🍎"
    },
    {
      category: t('export.german_requirements.textiles_leather.category'),
      requirements: t('export.german_requirements.textiles_leather.requirements', { returnObjects: true }) || [],
      price: t('export.german_requirements.textiles_leather.price'),
      icon: "👜"
    },
    {
      category: t('export.german_requirements.arts_crafts.category'),
      requirements: t('export.german_requirements.arts_crafts.requirements', { returnObjects: true }) || [],
      price: t('export.german_requirements.arts_crafts.price'),
      icon: "🎨"
    },
    {
      category: t('export.german_requirements.agricultural_products.category'),
      requirements: t('export.german_requirements.agricultural_products.requirements', { returnObjects: true }) || [],
      price: t('export.german_requirements.agricultural_products.price'),
      icon: "🌾"
    }
  ];

  const partners = [
    {
      type: t("export.partners.retailers.type"),
      icon: Building2,
      examples: ["REWE Group", "EDEKA", "Metro AG", "Kaufland", "Aldi Süd"],
      description: t("export.partners.retailers.description")
    },
    {
      type: t("export.partners.educational_institutions.type"),
      icon: Users,
      examples: ["German-African Business Association", "IHK (Chambers of Commerce)", "Trade Schools", "Universities"],
      description: t("export.partners.educational_institutions.description")
    },
    {
      type: t("export.partners.business_partners.type"),
      icon: Building2,
      examples: ["Import/Export Agencies", "Trade Consultants", "Market Entry Specialists", "Distribution Partners"],
      description: t("export.partners.business_partners.description")
    },
    {
      type: t("export.partners.logistics_partners.type"),
      icon: Truck,
      examples: ["DHL Global Forwarding", "Kuehne + Nagel", "DB Schenker", "Freight Forwarders"],
      description: t("export.partners.logistics_partners.description")
    },
    {
      type: t("export.partners.regulatory_partners.type"),
      icon: Shield,
      examples: ["German Customs (Zoll)", "Certification Bodies", "Quality Assurance Agencies", "Trade Compliance Consultants"],
      description: t("export.partners.regulatory_partners.description")
    },
    {
      type: t("export.partners.financial_services.type"),
      icon: Building2,
      examples: ["Deutsche Bank", "Commerzbank", "KfW Development Bank", "Export Credit Agencies", "Trade Finance Providers"],
      description: t("export.partners.financial_services.description")
    }
  ];

  const regulatoryUpdates = [
    {
      title: t("export.regulatory_updates.eu_sanctions_easing.title"),
      date: t("export.regulatory_updates.eu_sanctions_easing.date"),
      description: t("export.regulatory_updates.eu_sanctions_easing.description"),
      status: "positive"
    },
    {
      title: t("export.regulatory_updates.arms_embargo_expiration.title"),
      date: t("export.regulatory_updates.arms_embargo_expiration.date"),
      description: t("export.regulatory_updates.arms_embargo_expiration.description"),
      status: "positive"
    },
    {
      title: t("export.regulatory_updates.eu_esa_epa_benefits.title"),
      description: t("export.regulatory_updates.eu_esa_epa_benefits.description"),
      status: "positive"
    }
  ];

const marketIntelligence = [
    {
      product: t("export.market_intelligence.blueberries.product"),
      status: t("export.market_intelligence.blueberries.status"),
      requirements: t("export.market_intelligence.blueberries.requirements", { returnObjects: true }) || [],
      buyers: t("export.market_intelligence.blueberries.buyers", { returnObjects: true }) || []
    },
    {
      product: t("export.market_intelligence.honey.product"),
      status: t("export.market_intelligence.honey.status"),
      requirements: t("export.market_intelligence.honey.requirements", { returnObjects: true }) || [],
      buyers: [t("export.market_intelligence.honey.buyers")]
    },
    {
      product: t("export.market_intelligence.natural_oils.product"),
      status: t("export.market_intelligence.natural_oils.status"),
      requirements: t("export.market_intelligence.natural_oils.requirements", { returnObjects: true }) || [],
      buyers: [
        t("export.market_intelligence.natural_oils.buyers1"), 
        t("export.market_intelligence.natural_oils.buyers2")
      ]
    }
  ];


  return (
    <Layout>
    {/* Hero Carousel Section  */}
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
              initial={{ scale: 1 }}
              animate={{ scale: 1.05 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${heroSlides[currentHeroIndex]?.image}')` }}
            />
            {/* Re-introduced a subtle gradient for text readability without a full overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-zim-black/60 to-transparent" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container mx-auto px-6 md:px-12 py-12 text-white">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ x: -20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl" 
            >
              {/* Updated Icon Size and Badge Style */}
              <div className="flex items-center gap-3 mb-6 slide-up justify-start">
                <Globe className="h-8 w-8 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex]?.badge}
                </Badge>
              </div>
              
              {/* Updated Heading Sizes to match template scale */}
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight slide-up">
                {heroSlides[currentHeroIndex]?.title}
              </h1>
              
              {/* Updated Paragraph spacing and font weight */}
              <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed font-medium max-w-3xl slide-up">
                {heroSlides[currentHeroIndex]?.subtitle}
              </p>

              {/* Added the "Highlight" section for consistency if applicable */}
              {heroSlides[currentHeroIndex]?.highlight && (
                <div className="flex items-center gap-3 mb-8 slide-up">
                  <Award className="h-7 w-7 text-zim-green" />
                  <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex]?.highlight}</span>
                </div>
              )}

              {/* Updated Buttons to match template size and hover effects */}
              <div className="flex flex-col sm:flex-row gap-4 justify-start slide-up">
                <a href="#market-requirements" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-zim-black text-lg px-10 h-14 rounded-full font-bold group w-full">
                    {t("export.explore_market_requirements")}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-zim-gold hover:bg-zim-gold/90 text-zim-black text-lg px-10 h-14 rounded-full font-bold group w-full sm:w-auto">
                      {t("export.contact_us")}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
                    <ContactForm title={t("export.contact_form_title")} module="export" />
                  </DialogContent>
                </Dialog>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators - Positioned left */}
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

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Export Introduction */}
      <section id="export-info" className="py-0 bg-background relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="relative py-6 px-8 md:px-16 rounded-[2rem] overflow-hidden text-center group shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zim-green via-zim-black to-zim-red opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-[url('/images/carbon-fibre.png')] opacity-10" />
              
              <div className="relative z-10 max-w-3xl mx-auto space-y-3">
               <Ship className="h-8 w-8 text-zim-gold mx-auto mb-1" />
                
                <h3 className="text-lg md:text-xl font-bold text-white leading-snug px-4">
                  {t('export.objective_subtitle')}
                </h3>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-zim-gold/50" />
                  
                  <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                    {t('export.objective_title')}
                  </p>
                  
                  <div className="h-px w-8 bg-zim-gold/50" />
                </div>
              </div>
            </motion.div>
                    
          </div>
        </div>
      </section>

      {/* Market Requirements - Reduced Header Sizing */}
      <section id="market-requirements" className="py-12 bg-muted/30 scroll-mt-24">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t("export.market_requirements_title")}</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              {t("export.market_requirements_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {germanRequirements.map((item, index) => (
              <Card key={index} className="border-2 bg-white hover:bg-slate-50/50 transition-all duration-300">
                <CardHeader className="pb-2 pt-5">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{item.icon}</span>
                    <div>
                      <CardTitle className="text-lg font-bold">{item.category}</CardTitle>
                      <CardDescription className="text-sm font-bold text-zim-green">{item.price}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-5">
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {Array.isArray(item.requirements) && item.requirements.map((req, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-zim-green mr-2 mt-0.5 flex-shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Market Intelligence - Tightened Tabs and Description */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t("export.product_intelligence_title")}</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              {t("export.product_intelligence_subtitle")}
            </p>
          </div>

          <Tabs defaultValue={marketIntelligence[0].product} className="w-full">
            <TabsList className="flex justify-center bg-muted/50 rounded-full h-11 p-1 mb-6 max-w-md mx-auto">
              {marketIntelligence.map((item) => (
                <TabsTrigger key={item.product} value={item.product} className="rounded-full text-xs font-bold data-[state=active]:bg-zim-gold data-[state=active]:text-zim-black">
                  {item.product}
                </TabsTrigger>
              ))}
            </TabsList>
            {marketIntelligence.map((item) => (
              <TabsContent key={item.product} value={item.product}>
                <Card className="bg-slate-900 text-white rounded-2xl overflow-hidden border-none">
                  <div className="grid md:grid-cols-2 items-center">
                    <div className="p-6 md:p-10">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold">{item.product}</h3>
                        <Badge className="text-[10px] bg-green-500/20 text-green-300 border-none">
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/60 mb-4">{t("export.market_intelligence_requirements")}</p>
                      <ul className="space-y-2 text-sm text-white/80 mb-6">
                        {Array.isArray(item.requirements) && item.requirements.map((req, i) => (
                          <li key={i} className="flex items-start">
                            <FileText className="h-4 w-4 text-zim-gold mr-2 mt-0.5" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(item.buyers) && item.buyers.map((buyer, i) => (
                          <Badge key={i} variant="secondary" className="bg-white/10 text-white text-[10px]">{buyer}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="hidden md:block h-64 bg-cover bg-center" style={{backgroundImage: `url('/images/${item.product.toLowerCase().replace(/ /g, '_')}.jpg')`}} />
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Partner Network - Matched to Modules grid */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t("export.partner_network_title")}</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t("export.partner_network_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner, index) => (
              <Card key={index} className="border-2 bg-white group hover:shadow-xl transition-all duration-500 h-full flex flex-col">
                <CardHeader className="text-center pt-8">
                  <div className="bg-zim-gold/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:bg-zim-gold transition-colors">
                    <partner.icon className="h-8 w-8 text-zim-gold group-hover:text-zim-black" />
                  </div>
                  <CardTitle className="text-lg font-bold">{partner.type}</CardTitle>
                </CardHeader>
                <CardContent className="text-center flex-grow">
                  <CardDescription className="text-sm leading-snug mb-4">{partner.description}</CardDescription>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link" className="text-primary font-bold text-sm h-auto p-0">{t("export.view_examples")}<ArrowRight className="ml-1 h-3 w-3" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <div className="p-4">
                        <h4 className="font-bold mb-4">{partner.type} {t("export.partner_examples")}</h4>
                        <div className="flex flex-wrap gap-2">
                          {partner.examples.map((example, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{example}</Badge>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Regulatory Updates - Consistent Card Sizing */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t("export.regulatory_updates_title")}</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{t("export.regulatory_updates_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {regulatoryUpdates.map((update, index) => (
              <Card key={index} className="border-2 flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <CardTitle className="text-base font-bold leading-tight">{update.title}</CardTitle>
                    <CheckCircle className="h-5 w-5 text-zim-green flex-shrink-0" />
                  </div>
                  {update.date && <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">{update.date}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{update.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

    </Layout>
  );
}