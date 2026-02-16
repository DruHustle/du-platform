import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Users, Building2, Truck, Shield, AlertTriangle, CheckCircle, ArrowRight, Globe, Award, TrendingUp, Ship, Euro, Sprout, Factory, Container } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";

export default function ExportHub() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/eu_symbol.png",
      badge: t('export.hero.badge1'),
      badgeIcon: Award,
      title: t('export.hero.title1'),
      subtitle: t('export.hero.desc1'),
      highlight: t('export.hero.highlight1')
    },
    {
      image: "/images/germany_flag.png",
      badge: t('export.hero.badge2'),
      badgeIcon: Globe,
      title: t('export.hero.title2'),
      subtitle: t('export.hero.desc2'),
      highlight: t('export.hero.highlight2')
    },
    {
      image: "/images/eu_flags.png",
      badge: t('export.hero.badge3'),
      badgeIcon: Euro,
      title: t('export.hero.title3'),
      subtitle: t('export.hero.desc3'),
      highlight: t('export.hero.highlight3')
    },
    {
      image: "/images/export_port1.jpg",
      badge: t('export.hero.badge4'),
      badgeIcon: Container,
      title: t('export.hero.title4'),
      subtitle: t('export.hero.desc4'),
      highlight: t('export.hero.highlight4')
    },
    {
      image: "/images/horticulture.jpg",
      badge: t('export.hero.badge5'),
      badgeIcon: Sprout,
      title: t('export.hero.title5'),
      subtitle: t('export.hero.desc5'),
      highlight: t('export.hero.highlight5')
    },
    {
      image: "/images/manufacturing_factory.jpg",
      badge: t('export.hero.badge6'),
      badgeIcon: Factory,
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

  const introData = {
  icon: Ship, // 
  title: t('export.objective_title'),
  description: t('export.objective_subtitle')
 };

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
      image: "/images/blueberry_export.png",
      requirements: t("export.market_intelligence.blueberries.requirements", { returnObjects: true }) || [],
      buyers: t("export.market_intelligence.blueberries.buyers", { returnObjects: true }) || []
    },
    {
      product: t("export.market_intelligence.honey.product"),
      status: t("export.market_intelligence.honey.status"),
      image:"/images/honey_export.jpg",
      requirements: t("export.market_intelligence.honey.requirements", { returnObjects: true }) || [],
      buyers: [t("export.market_intelligence.honey.buyers")]
    },
    {
      product: t("export.market_intelligence.natural_oils.product"),
      status: t("export.market_intelligence.natural_oils.status"),
      image:"/images/marula_export.png",
      requirements: t("export.market_intelligence.natural_oils.requirements", { returnObjects: true }) || [],
      buyers: [
        t("export.market_intelligence.natural_oils.buyers1"), 
        t("export.market_intelligence.natural_oils.buyers2")
      ]
    }
  ];




  return (
    <Layout>
      {/* Hero Section */}
      <section id="hero" >
        <SubPageHero 
          heroSlides={heroSlides} 
          intro={introData} 
          />
      </section>

     {/* Market Requirements - Reimagined with Glassy UI */}
      <section id="market-requirements" className="py-10 bg-slate-950 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter">
              {t("export.market_requirements_title")}
            </h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
              {t("export.market_requirements_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {germanRequirements.map((item, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="relative h-full overflow-hidden rounded-[2.5rem] border border-white/10 backdrop-blur-3xl bg-white/[0.03] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 hover:bg-white/[0.06]">
                  {/* The Crispy Edge Finish */}
                  <span className="absolute inset-0 rounded-[2.5rem] border border-white/10 pointer-events-none" />
                  
                  <div className="flex items-center gap-5 mb-6">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">{item.category}</h3>
                      <p className="text-xs font-black text-zim-gold uppercase tracking-widest mt-1">
                        {item.price}
                      </p>
                    </div>
                  </div>
                  
                  <ul className="space-y-3">
                    {Array.isArray(item.requirements) && item.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zim-gold shadow-[0_0_8px_rgba(212,175,55,0.8)] flex-shrink-0" />
                        <span className="text-sm text-white/70 font-light leading-relaxed">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Intelligence - High-Density Quadrant Layout */}
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          
          <Tabs defaultValue={marketIntelligence[0].product} className="w-full">
            {/* Compact Tab Navigation */}
            <TabsList className="flex justify-center bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-full h-12 p-1 mb-8 max-w-lg mx-auto shadow-xl relative">
              <span className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
              {marketIntelligence.map((item) => (
                <TabsTrigger 
                  key={item.product} 
                  value={item.product} 
                  className="flex-1 rounded-full px-2 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-zim-gold data-[state=active]:text-zim-black data-[state=active]:shadow-[0_0_15px_rgba(212,175,55,0.3)] text-white/40"
                >
                  {item.product}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {marketIntelligence.map((item) => (
              <TabsContent key={item.product} value={item.product} className="mt-0 outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.1)]"
                >
                  {/* The Crispy Edge Finish */}
                  <span className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none" />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                    
                    {/* LEFT COLUMN: BRANDING & IMAGE STACK */}
                    <div className="md:col-span-3 flex flex-col space-y-4 border-r border-white/5 pr-6">
                      <div className="space-y-1">
                        <Badge className="bg-zim-gold/10 text-zim-gold border-none text-[9px] font-black px-2 py-0.5 uppercase tracking-tighter">
                          {item.status}
                        </Badge>
                        <h3 className="text-xl font-black text-white tracking-tighter leading-none">{item.product}</h3>
                      </div>
                      
                      {/* THE IMAGE LINK (Under the Title) */}
                      <div className="relative group/img overflow-hidden rounded-2xl border border-white/10 aspect-[4/3]">
                        <div 
                          className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover/img:scale-110 saturate-[0.7] group-hover/img:saturate-100"
                          style={{backgroundImage: `url('${item.image}')` }}
                        />
                        {/* Glass overlay shimmer */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-transparent to-white/10 pointer-events-none" />
                      </div>

                      <div className="pt-2">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Market Velocity</p>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-zim-gold" />
                          <span className="text-xs font-bold text-white/90 tracking-tight">Expanding Demand</span>
                        </div>
                      </div>
                    </div>

                    {/* MIDDLE COLUMN: REQUIREMENTS GRID */}
                    <div className="md:col-span-6 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Compliance Protocol</span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.isArray(item.requirements) && item.requirements.map((req, i) => (
                          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
                            <div className="p-1.5 bg-white/5 rounded-lg">
                              <FileText className="h-3.5 w-3.5 text-zim-gold/70" />
                            </div>
                            <span className="text-[11px] text-white/70 leading-snug font-light">{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: DISTRIBUTION CHANNELS */}
                    <div className="md:col-span-3 flex flex-col bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-inner">
                      <span className="text-[10px] font-black text-zim-gold uppercase tracking-[0.2em] block mb-4">Target Channels</span>
                      <div className="flex flex-col gap-3 flex-grow">
                        {Array.isArray(item.buyers) && item.buyers.map((buyer, i) => (
                          <div key={i} className="flex items-center gap-3 text-[11px] py-2 border-b border-white/5 last:border-0 group/buyer cursor-default">
                            <div className="h-1 w-1 rounded-full bg-zim-gold transition-transform group-hover/buyer:scale-150" />
                            <span className="text-white/70 font-medium group-hover/buyer:text-white transition-colors">{buyer}</span>
                          </div>
                        ))}
                      </div>
                      <Button className="w-full mt-6 h-10 bg-white/5 hover:bg-zim-gold border border-white/10 hover:border-zim-gold text-white hover:text-zim-black text-[9px] font-black uppercase tracking-widest transition-all duration-500 rounded-xl">
                        Contact verified buyers
                      </Button>
                    </div>

                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Partner Network - Glass Grid */}
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter">
              {t("export.partner_network_title")}
            </h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
              {t("export.partner_network_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {partners.map((partner, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative h-full flex flex-col"
              >
                <div className="relative flex-grow flex flex-col overflow-hidden rounded-[2.5rem] border border-white/10 backdrop-blur-3xl bg-white/[0.03] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 hover:bg-white/[0.06] hover:-translate-y-2">
                  {/* The Crispy Edge Finish */}
                  <span className="absolute inset-0 rounded-[2.5rem] border border-white/10 pointer-events-none" />
                  
                  <div className="bg-white/5 p-6 rounded-[2rem] w-20 h-20 flex items-center justify-center mx-auto mb-8 border border-white/10 group-hover:bg-zim-gold/10 group-hover:border-zim-gold/30 transition-all duration-500 group-hover:scale-110">
                    <partner.icon className="h-10 w-10 text-zim-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                  </div>
                  
                  <div className="text-center flex-grow flex flex-col items-center">
                    <h3 className="text-xl font-bold text-white mb-4">{partner.type}</h3>
                    <p className="text-sm text-white/50 leading-relaxed font-light mb-8 italic">
                      {partner.description}
                    </p>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="mt-auto bg-white/5 hover:bg-zim-gold border-white/10 hover:border-zim-gold text-white hover:text-zim-black rounded-full px-8 text-[10px] font-black uppercase tracking-widest transition-all duration-300">
                          {t("export.view_examples")}
                          <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 text-white rounded-[2rem] p-8 max-w-md shadow-2xl">
                        <h4 className="text-xl font-black tracking-tight mb-6 flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-zim-gold" />
                          {partner.type} {t("export.partner_examples")}
                        </h4>
                        <div className="flex flex-wrap gap-2.5">
                          {partner.examples.map((example, i) => (
                            <Badge key={i} className="bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors">
                              {example}
                            </Badge>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Regulatory Updates - Horizontal Glass Ticker */}
      <section className="py-10 pb-24 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter">
              {t("export.regulatory_updates_title")}
            </h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
              {t("export.regulatory_updates_subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {regulatoryUpdates.map((update, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex flex-col"
              >
                <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 backdrop-blur-xl bg-white/[0.03] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 hover:bg-white/[0.06]">
                  {/* Internal "Crispy" Edge */}
                  <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-2.5 bg-zim-gold/10 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-zim-gold" />
                    </div>
                    {update.date && (
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                        {update.date}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-4 leading-tight tracking-tight group-hover:text-zim-gold transition-colors">
                    {update.title}
                  </h3>
                  <p className="text-sm text-white/50 font-light leading-relaxed">
                    {update.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

    </Layout>
  );
}