import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Users, Building2, Truck, Shield, AlertTriangle, CheckCircle, ArrowRight, Globe, Award, TrendingUp } from "lucide-react";
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
      requirements: [t('export.german_requirements.food_products.req1'), t('export.german_requirements.food_products.req2'), t('export.german_requirements.food_products.req3'), t('export.german_requirements.food_products.req4')],
      price: t('export.german_requirements.food_products.price'),
      icon: "🍎"
    },
    {
      category: t('export.german_requirements.textiles_leather.category'),
      requirements: [t('export.german_requirements.textiles_leather.req1'), t('export.german_requirements.textiles_leather.req2'), t('export.german_requirements.textiles_leather.req3'), t('export.german_requirements.textiles_leather.req4')],
      price: t('export.german_requirements.textiles_leather.price'),
      icon: "👜"
    },
    {
      category: t('export.german_requirements.arts_crafts.category'),
      requirements: [t('export.german_requirements.arts_crafts.req1'), t('export.german_requirements.arts_crafts.req2'), t('export.german_requirements.arts_crafts.req3'), t('export.german_requirements.arts_crafts.req4')],
      price: t('export.german_requirements.arts_crafts.price'),
      icon: "🎨"
    },
    {
      category: t('export.german_requirements.agricultural_products.category'),
      requirements: [t('export.german_requirements.agricultural_products.req1'), t('export.german_requirements.agricultural_products.req2'), t('export.german_requirements.agricultural_products.req3'), t('export.german_requirements.agricultural_products.req4')],
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
      requirements: [
        t("export.market_intelligence.blueberries.req1"),
        t("export.market_intelligence.blueberries.req2"),
        t("export.market_intelligence.blueberries.req3"),
        t("export.market_intelligence.blueberries.req4")
      ],
      buyers: ["LIDL", "EDEKA", "REWE"]
    },
    {
      product: t("export.market_intelligence.honey.product"),
      status: t("export.market_intelligence.honey.status"),
      requirements: [
        t("export.market_intelligence.honey.req1"),
        t("export.market_intelligence.honey.req2"),
        t("export.market_intelligence.honey.req3"),
        t("export.market_intelligence.honey.req4")
      ],
      buyers: [t("export.market_intelligence.honey.buyers")]
    },
    {
      product: t("export.market_intelligence.natural_oils.product"),
      status: t("export.market_intelligence.natural_oils.status"),
      requirements: [
        t("export.market_intelligence.natural_oils.req1"),
        t("export.market_intelligence.natural_oils.req2"),
        t("export.market_intelligence.natural_oils.req3"),
        t("export.market_intelligence.natural_oils.req4")
      ],
      buyers: [t("export.market_intelligence.natural_oils.buyers1"), t("export.market_intelligence.natural_oils.buyers2")]
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
                  {heroSlides[currentHeroIndex]?.badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex]?.title}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-white/90 leading-relaxed font-medium max-w-3xl">
                {heroSlides[currentHeroIndex]?.subtitle}
              </p>
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="h-6 w-6 text-zim-green" />
                <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex]?.highlight}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#market-requirements" className="inline-block">
                  <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-zim-black text-lg px-10 h-14 rounded-full font-bold group">
                    {t("export.explore_market_requirements")}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </a>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-zim-gold hover:bg-zim-gold/90 text-zim-black text-lg px-10 h-14 rounded-full font-bold group">
                      {t("export.contact_us")}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl p-0">
              <ContactForm 
                title={t("export.contact_form_title")}
                module="export"
              />
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Market Requirements */}
      <section id="market-requirements" className="section-padding bg-muted/30 scroll-mt-24">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-primary mb-4">{t("export.market_requirements_badge")}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-zim-black mb-4">{t("export.market_requirements_title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("export.market_requirements_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {germanRequirements.map((item, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-zim-green/10 to-zim-gold/10 p-6">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{item.icon}</span>
                    <div>
                      <CardTitle className="text-2xl font-bold text-zim-black">{item.category}</CardTitle>
                      <CardDescription className="text-lg font-semibold text-zim-green">{item.price}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3 text-gray-700">
                    {item.requirements.map((req, i) => (
                      <li key={i} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-zim-green mr-3 mt-1 flex-shrink-0" />
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

      {/* Market Intelligence Section */}
      <section className="section-padding bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-primary mb-4">{t("export.product_intelligence_badge")}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-zim-black mb-4">{t("export.product_intelligence_title")}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t("export.product_intelligence_subtitle")}
            </p>
          </div>

          <Tabs defaultValue={marketIntelligence[0].product} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 rounded-full h-14 p-2 mb-8">
              {marketIntelligence.map((item) => (
                <TabsTrigger key={item.product} value={item.product} className="h-full rounded-full text-lg font-bold data-[state=active]:bg-zim-gold data-[state=active]:text-zim-black data-[state=active]:shadow-md">
                  {item.product}
                </TabsTrigger>
              ))}
            </TabsList>
            {marketIntelligence.map((item) => (
              <TabsContent key={item.product} value={item.product}>
                <Card className="bg-gradient-to-br from-zim-black to-zinc-900 text-white rounded-xl shadow-2xl overflow-hidden">
                  <div className="grid md:grid-cols-2 items-center">
                    <div className="p-8 md:p-12">
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-4xl font-bold text-white">{item.product}</h3>
                        <Badge 
                          className={`px-4 py-1 text-sm font-bold rounded-full ${item.status === t("export.market_intelligence.blueberries.status") ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                          {item.status === t("export.market_intelligence.blueberries.status") ? <CheckCircle className="h-4 w-4 mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-lg text-muted-foreground mb-6">{t("export.market_intelligence_requirements")}</p>
                      <ul className="space-y-3 text-gray-300 mb-8">
                        {item.requirements.map((req, i) => (
                          <li key={i} className="flex items-start">
                            <FileText className="h-5 w-5 text-zim-gold mr-3 mt-1 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-lg text-muted-foreground mb-4">{t("export.market_intelligence_buyers")}</p>
                      <div className="flex flex-wrap gap-3">
                        {item.buyers.map((buyer, i) => (
                          <Badge key={i} variant="secondary" className="px-4 py-2 text-base bg-zinc-700 text-white">{buyer}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="hidden md:block h-full w-full bg-cover bg-center" style={{backgroundImage: `url('/images/${item.product.toLowerCase().replace(/ /g, '_')}.jpg')`}}>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Partner Network Section */}
      <section className="section-padding bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-primary mb-4">{t("export.partner_network_badge")}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-zim-black mb-4">{t("export.partner_network_title")}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t("export.partner_network_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {partners.map((partner, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg text-center p-8 flex flex-col items-center">
                <div className="bg-zim-gold/10 p-4 rounded-full mb-6">
                  <partner.icon className="h-12 w-12 text-zim-gold" />
                </div>
                <CardTitle className="text-2xl font-bold text-zim-black mb-3">{partner.type}</CardTitle>
                <CardDescription className="text-gray-600 flex-grow mb-4">{partner.description}</CardDescription>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" className="text-zim-green font-bold text-lg mt-auto">{t("export.view_examples")}<ArrowRight className="ml-2 h-5 w-5" /></Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-zim-gold/10 p-3 rounded-full">
                          <partner.icon className="h-8 w-8 text-zim-gold" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-zim-black">{partner.type}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg text-muted-foreground mb-6">{t("export.partner_examples")}</p>
                      <ul className="space-y-2">
                        {partner.examples.map((example, i) => (
                          <li key={i} className="text-lg text-gray-800 font-medium bg-gray-100 px-4 py-2 rounded-md">{example}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </DialogContent>
                </Dialog>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Regulatory Updates Section */}
      <section className="section-padding bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-primary mb-4">{t("export.regulatory_updates_badge")}</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-zim-black mb-4">{t("export.regulatory_updates_title")}</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t("export.regulatory_updates_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {regulatoryUpdates.map((update, index) => (
              <Card key={index} className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold text-zim-black">{update.title}</CardTitle>
                    {update.status === 'positive' ? 
                      <CheckCircle className="h-8 w-8 text-green-500" /> : 
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                    }
                  </div>
                  {update.date && <CardDescription className="text-md font-medium text-gray-500 pt-2">{update.date}</CardDescription>}
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-gray-700 text-lg">{update.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-zim-black text-white">
        <div className="container text-center">
          <Award className="h-16 w-16 text-zim-gold mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-bold mb-4">{t("export.cta_title")}</h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">{t("export.cta_subtitle")}</p>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-zim-gold hover:bg-zim-gold/90 text-zim-black text-lg px-10 h-14 rounded-full font-bold group">
                {t("export.cta_button")}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0">
              <ContactForm 
                title={t("export.contact_form_title")}
                module="export"
              />
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </Layout>
  );
}
