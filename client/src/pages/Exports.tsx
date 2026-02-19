import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Users, Building2, Shield, AlertTriangle, CheckCircle, ArrowRight, Globe, Award, TrendingUp, Ship, Euro, Sprout, Factory, Container } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";

export default function Exports() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/pages/export/eu_symbol.png",
      badge: t('export.hero.badge1') || "EU Market Access",
      badgeIcon: Award,
      title: t('export.hero.title1') || "Unlock European Markets",
      subtitle: t('export.hero.desc1') || "Navigate EU regulations and certifications with ease to export your Zimbabwean products.",
      highlight: t('export.hero.highlight1') || "Simplified Compliance"
    },
    {
      image: "/images/pages/export/eu_flags.png",
      badge: t('export.hero.badge3') || "Trade Agreements",
      badgeIcon: Euro,
      title: t('export.hero.title3') || "Leverage EPA & ESA",
      subtitle: t('export.hero.desc3') || "Benefit from Economic Partnership Agreements for duty-free and quota-free access.",
      highlight: t('export.hero.highlight3') || "Preferential Access"
    },
    {
      image: "/images/pages/export/blueberry_export.png",
      badge: t("export.hero.badge7") || "Market Intelligence",
      badgeIcon: TrendingUp,
      title: t("export.hero.title7") || "High-Demand Product Windows",
      subtitle: t("export.hero.desc7") || "Track demand and standards for high-value crops and specialty products in target EU markets.",
      highlight: t("export.hero.highlight7") || "Buyer-Aligned Supply"
    },
    {
      image: "/images/pages/shared/horticulture.jpg",
      badge: t('export.hero.badge5') || "Horticulture Focus",
      badgeIcon: Sprout,
      title: t('export.hero.title5') || "Green Gold Exports",
      subtitle: t('export.hero.desc5') || "Specialized support for fresh produce, flowers, and organic products.",
      highlight: t('export.hero.highlight5') || "High-Value Crops"
    },
    {
      image: "/images/pages/wikimedia/small-honey-jar.jpg",
      badge: t("export.hero.badge8") || "Compliance Advantage",
      badgeIcon: CheckCircle,
      title: t("export.hero.title8") || "Certification-Ready Exports",
      subtitle: t("export.hero.desc8") || "Use traceability, quality controls, and food-safety systems to secure repeat EU buyer contracts.",
      highlight: t("export.hero.highlight8") || "Trust and Quality"
    },
    {
      image: "/images/pages/export/marula_export.png",
      badge: t("export.hero.badge9") || "Niche Growth",
      badgeIcon: Sprout,
      title: t("export.hero.title9") || "Natural Oils and Botanicals",
      subtitle: t("export.hero.desc9") || "Develop premium natural products for cosmetics and wellness categories with strong EU demand.",
      highlight: t("export.hero.highlight9") || "Emerging Segments"
    },
    {
      image: "/images/pages/trade/manufacturing_factory.jpg",
      badge: t('export.hero.badge6') || "Manufacturing Boost",
      badgeIcon: Factory,
      title: t('export.hero.title6') || "Industrial Exports",
      subtitle: t('export.hero.desc6') || "Guidance for manufactured goods, textiles, and processed foods.",
      highlight: t('export.hero.highlight6') || "Value-Added Products"
    },
    {
      image: "/images/pages/trade/export_port1.jpg",
      badge: t('export.hero.badge4') || "Global Reach",
      badgeIcon: Container,
      title: t('export.hero.title4') || "Expand Your Horizons",
      subtitle: t('export.hero.desc4') || "Connect with a global network of buyers and distributors.",
      highlight: t('export.hero.highlight4') || "Worldwide Opportunities"
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const introData = {
    icon: Ship,
    title: t("export.objective_title") || "Export to the EU with Confidence",
    description:
      t("export.objective_subtitle") ||
      "Zimbabwe exporters can access the EU under iEPA duty-free and quota-free terms. This page focuses on REX registration, origin documentation, SPS compliance, and current EU regulatory changes.",
  };

const germanRequirements = [
    {
      category: t("export.registration.rex.category") || "REX and Preferential Tariffs",
      requirements: [
        t("export.registration.rex.r1") || "Exports to the EU are governed by the interim EPA (iEPA), giving Zimbabwe duty-free and quota-free market access.",
        t("export.registration.rex.r2") || "Since July 1, 2021, exporters must use the EU Registered Exporter (REX) self-certification system.",
        t("export.registration.rex.r3") || "Register as an exporter through ZIMRA to issue valid Statements on Origin under REX.",
      ],
      price: t("export.registration.rex.tag") || "Tariff Access",
      icon: "🧾",
    },
    {
      category: t("export.registration.origin.category") || "Statement on Origin Rules",
      requirements: [
        t("export.registration.origin.r1") || "Consignments above EUR 6,000 require a Statement on Origin from a registered REX exporter.",
        t("export.registration.origin.r2") || "Consignments at or below EUR 6,000 can be self-certified by any exporter (without REX registration).",
        t("export.registration.origin.r3") || "Keep origin documentation audit-ready for customs checks in both Zimbabwe and the EU.",
      ],
      price: t("export.registration.origin.tag") || "Origin Compliance",
      icon: "✅",
    },
    {
      category: t("export.registration.zimra.category") || "ZIMRA and Export Documentation",
      requirements: [
        t("export.registration.zimra.r1") || "Typical ZIMRA registration pack includes application letter, certificate of incorporation, CR6/CR14, and valid ITF263 tax clearance.",
        t("export.registration.zimra.r2") || "Obtain an export license where required by sector ministries (for example Agriculture for plants).",
        t("export.registration.zimra.r3") || "Core shipping file must include commercial invoice (with HS code), packing list, and bill of lading/air waybill.",
      ],
      price: t("export.registration.zimra.tag") || "Pre-shipment",
      icon: "📦",
    },
    {
      category: t("export.registration.sps.category") || "EU Product and Safety Standards",
      requirements: [
        t("export.registration.sps.r1") || "Food and plant exports must meet strict SPS requirements, including traceability and health controls.",
        t("export.registration.sps.r2") || "Market trust often depends on certifications such as GLOBALG.A.P. and HACCP.",
        t("export.registration.sps.r3") || "For honey, compliance work includes a National Residue Monitoring Plan (NRMP) aligned to EU requirements.",
      ],
      price: t("export.registration.sps.tag") || "SPS Critical",
      icon: "🌿",
    },
  ];

  const partners = [
    {
      type: t("export.partners.retailers.type") || "Retailers & Supermarkets",
      icon: "🏬",
      examples: ["REWE Group", "EDEKA", "Metro AG", "Kaufland", "Aldi Süd"],
      description: t("export.partners.retailers.description") || "Direct access to major German retail chains and independent stores."
    },
    {
      type: t("export.partners.educational_institutions.type") || "Educational Institutions",
      icon: "🎓",
      examples: ["German-African Business Association", "IHK (Chambers of Commerce)", "Trade Schools", "Universities"],
      description: t("export.partners.educational_institutions.description") || "Partnerships for skill development, research, and cultural exchange."
    },
    {
      type: t("export.partners.business_partners.type") || "Business Development Partners",
      icon: "🤝",
      examples: ["Import/Export Agencies", "Trade Consultants", "Market Entry Specialists", "Distribution Partners"],
      description: t("export.partners.business_partners.description") || "Specialists in market entry, business matching, and investment facilitation."
    },
    {
      type: t("export.partners.logistics_partners.type") || "Logistics & Freight Forwarders",
      icon: "🚚",
      examples: ["DHL Global Forwarding", "Kuehne + Nagel", "DB Schenker", "Freight Forwarders"],
      description: t("export.partners.logistics_partners.description") || "Reliable and efficient transport solutions for seamless export operations."
    },
    {
      type: t("export.partners.regulatory_partners.type") || "Regulatory & Certification Bodies",
      icon: "🛡️",
      examples: ["German Customs (Zoll)", "Certification Bodies", "Quality Assurance Agencies", "Trade Compliance Consultants"],
      description: t("export.partners.regulatory_partners.description") || "Guidance and support for navigating complex German and EU regulations."
    },
    {
      type: t("export.partners.financial_services.type") || "Financial Services & Trade Finance",
      icon: "💶",
      examples: ["Deutsche Bank", "Commerzbank", "KfW Development Bank", "Export Credit Agencies", "Trade Finance Providers"],
      description: t("export.partners.financial_services.description") || "Access to trade finance, export credit, and banking solutions."
    }
  ];



  const regulatoryUpdates = [
    {
      title: t("export.regulatory_updates.eu_sanctions_easing.title") || "EU Deforestation Regulation (EUDR)",
      date: t("export.regulatory_updates.eu_sanctions_easing.date") || "Full application delayed to December 2026",
      description:
        t("export.regulatory_updates.eu_sanctions_easing.description") ||
        "If you export covered products, you must prove supply chains are deforestation-free and traceable before full enforcement.",
      status: "watch",
    },
    {
      title: t("export.regulatory_updates.arms_embargo_expiration.title") || "Carbon Border Adjustment Mechanism (CBAM)",
      date: t("export.regulatory_updates.arms_embargo_expiration.date") || "Permanent phase expected January 2026",
      description:
        t("export.regulatory_updates.arms_embargo_expiration.description") ||
        "CBAM is in transition for carbon-intensive goods (iron, steel, cement, fertilizers, aluminum). Financial obligations are expected in the permanent phase.",
      status: "watch",
    },
    {
      title: t("export.regulatory_updates.eu_esa_epa_benefits.title") || "SPS Readiness for Agro and Food Exports",
      date: t("export.regulatory_updates.sps_priority_date") || "Ongoing compliance priority",
      description:
        t("export.regulatory_updates.eu_esa_epa_benefits.description") ||
        "Food and plant exporters should treat SPS controls as a gate requirement. For sensitive products such as honey, maintain evidence of residue controls and competent authority oversight.",
      status: "positive",
    },
  ];
  const complianceChecklist = [
    t("export.compliance_checklist.c1") || "Confirm your product HS code and check EU duties/technical measures in Access2Markets.",
    t("export.compliance_checklist.c2") || "Register for REX with ZIMRA if exporting consignments above EUR 6,000 under iEPA preferences.",
    t("export.compliance_checklist.c3") || "Issue a valid Statement on Origin for each shipment.",
    t("export.compliance_checklist.c4") || "Prepare invoice, packing list, transport document, and sector-specific export licenses.",
    t("export.compliance_checklist.c5") || "Complete SPS, labeling, and traceability controls required for your product class.",
    t("export.compliance_checklist.c6") || "For carbon-intensive goods, assess CBAM exposure and reporting obligations ahead of 2026.",
  ];

  const strategicResources = [
    {
      title: t("export.strategic_resources.trade_zimbabwe.title") || "Trade Zimbabwe Portal",
      description: t("export.strategic_resources.trade_zimbabwe.description") || "Official ZimTrade portal for exporter support services, market information, and trade publications.",
      link: "https://tradezimbabwe.com/",
      cta: t("export.strategic_resources.trade_zimbabwe.cta") || "Open Trade Zimbabwe",
    },
    {
      title: t("export.strategic_resources.access2markets.title") || "EU Access2Markets Portal",
      description: t("export.strategic_resources.access2markets.description") || "Check duties, taxes, rules of origin, and technical requirements by exact HS code.",
      link: "https://trade.ec.europa.eu/access-to-markets/en/home",
      cta: t("export.strategic_resources.access2markets.cta") || "Open Access2Markets",
    },
    {
      title: t("export.strategic_resources.virtual_library.title") || "Trade Zimbabwe Virtual Library",
      description: t("export.strategic_resources.virtual_library.description") || "Access trade directories, country briefs, market studies, and exporter-focused guidance documents.",
      link: "https://tradezimbabwe.com/virtual-library/",
      cta: t("export.strategic_resources.virtual_library.cta") || "Open Virtual Library",
    },
  ];

const marketIntelligence = [
    {
      product: t("export.market_intelligence.blueberries.product") || "Blueberries",
      status: t("export.market_intelligence.blueberries.status") || "High Demand",
      image: "/images/pages/export/blueberry_export.png",
      requirements: t("export.market_intelligence.blueberries.requirements", { returnObjects: true }) || [],
      buyers: t("export.market_intelligence.blueberries.buyers", { returnObjects: true }) || []
    },
    {
      product: t("export.market_intelligence.honey.product") || "Honey",
      status: t("export.market_intelligence.honey.status") || "Growing Niche",
      image:"/images/pages/wikimedia/small-honey-jar.jpg",
      requirements: t("export.market_intelligence.honey.requirements", { returnObjects: true }) || [],
      buyers: [t("export.market_intelligence.honey.buyers") || "Specialty food stores, organic markets"]
    },
    {
      product: t("export.market_intelligence.natural_oils.product") || "Natural Oils (Marula)",
      status: t("export.market_intelligence.natural_oils.status") || "Emerging Market",
      image:"/images/pages/export/marula_export.png",
      requirements: t("export.market_intelligence.natural_oils.requirements", { returnObjects: true }) || [],
      buyers: [
        t("export.market_intelligence.natural_oils.buyers1") || "Cosmetic manufacturers", 
        t("export.market_intelligence.natural_oils.buyers2") || "Wellness brands"
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
          <div className="relative p-8 md:p-10 !rounded-[2rem] !overflow-hidden !border !border-white/10 !bg-white/[0.02] !shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
            <span className="absolute inset-0 rounded-[2rem] !border !border-white/10 pointer-events-none" />
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <FileText className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">
                  {t("export.registration.title") || "Key Registration and Documentation"}
                </h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("export.registration.subtitle") || "Core steps required to claim preferential access and clear EU import controls."}
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
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02]">
                    <div className="p-8">
                      <div className="flex items-center gap-5 mb-6">
                        <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-zim-gold/10 transition-colors">
                        <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{item.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white tracking-tight">{item.category}</h3>
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
                  </div>
                </motion.div>
              ))}
            </div>
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
                  className="relative p-8 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group"
                >
                  {/* The Crispy Edge Finish */}
                  <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                    
                    {/* LEFT COLUMN: BRANDING & IMAGE STACK */}
                    <div className="md:col-span-3 flex flex-col space-y-4 border-r border-white/5 pr-6">
                      <div className="space-y-1">
                        <Badge className="bg-zim-gold/10 text-zim-gold border-none text-[9px] font-black px-2 py-0.5 uppercase tracking-tighter">
                          {item.status}
                        </Badge>
                        <h3 className="text-lg font-black text-white tracking-tight leading-none">{item.product}</h3>
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
                          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-slate-950/60 hover:border-white/10 transition-all duration-300">
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
                      <Link href="/regulations#export-certification-and-labeling">
                        <Button className="w-full mt-6 h-10 bg-white/5 hover:bg-zim-gold border border-white/10 hover:border-zim-gold text-white hover:text-zim-black text-[9px] font-black uppercase tracking-widest transition-all duration-500 rounded-xl">
                          Contact verified buyers
                        </Button>
                      </Link>
                    </div>

                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Strategic Resources */}
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Building2 className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">Strategic Support Resources</h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                Official tools and institutions you should use before shipment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {strategicResources.map((resource) => (
                <div key={resource.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                  <h3 className="text-lg font-black text-white tracking-tight">{resource.title}</h3>
                  <p className="text-sm text-white/60 mt-3 leading-relaxed">{resource.description}</p>
                  <a href={resource.link} target="_blank" rel="noreferrer">
                    <Button className="mt-6 w-full bg-zim-gold text-zim-black hover:bg-white text-[10px] font-black uppercase tracking-widest">
                      {resource.cta}
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partner Network - Glass Grid */}
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-[500px] bg-[radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Users className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">
                  {t("export.partner_network_title") || "Verified Partner Network"}
                </h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("export.partner_network_subtitle") || "Connect with trusted German retailers, distributors, and logistics providers."}
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
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02]">
                    <div className="p-8">
                    <div className="p-4 bg-white/5 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-8 group-hover:bg-zim-gold/10 transition-colors">
                      <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{partner.icon}</span>
                    </div>
                    
                    <div className="text-center flex-grow flex flex-col items-center">
                      <h3 className="text-lg font-black text-white tracking-tight mb-4">{partner.type}</h3>
                      <p className="text-sm text-white/50 leading-relaxed font-light mb-8 italic">
                        {partner.description}
                      </p>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="mt-auto bg-zim-gold text-zim-black hover:bg-white rounded-full px-8 text-[10px] font-black uppercase tracking-widest transition-all duration-300">
                            {t("export.view_examples") || "View Examples"}
                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 text-white rounded-[2rem] p-8 max-w-md shadow-2xl">
                          <h4 className="text-xl font-black tracking-tight mb-6 flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-zim-gold" />
                            {partner.type} {t("export.partner_examples") || "Examples of Partners:"}
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
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Export Compliance Checklist */}
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="mb-8 text-center">
              <div>
                <div className="flex items-center justify-center gap-3 mb-5">
                  <Shield className="h-6 w-6 text-zim-gold" />
                  <h3 className="text-xl font-black text-white tracking-tight">
                  {"Critical Regulations and Compliance Checklist"}
                  </h3>
                </div>
                <p className="text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">
                  {"A practical baseline for SPS, origin documentation, and incoming EU climate/deforestation controls."}
                </p>
              </div>
              <div className="mt-6">
                <Link href="/regulations#export-controls">
                  <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                    {t("export.compliance_checklist.view_full_regulations") || "View Full Regulations"}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {complianceChecklist.map((point) => (
                <div key={point} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-white/75 text-sm">
                  {point}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Regulatory Updates - Horizontal Glass Ticker */}
      <section className="py-10 pb-24 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <AlertTriangle className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">
                  {t("export.regulatory_updates_title") || "Regulatory Updates"}
                </h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("export.regulatory_updates_subtitle") || "Stay informed about the latest changes in international trade regulations and policies affecting Zimbabwean exports."}
              </p>
              <div className="mt-6">
                <Link href="/regulations#export-controls">
                  <Button className="bg-zim-gold text-zim-black hover:bg-white text-[10px] font-black uppercase tracking-widest rounded-full px-6">
                    {t("export.regulatory_updates_open_full_compliance_guide") || "Open Full Compliance Guide"}
                  </Button>
                </Link>
              </div>
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
                  <div className="relative p-8 h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group hover:bg-slate-950/60">
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
                    
                    <h3 className="text-lg font-black text-white tracking-tight mb-4 leading-tight group-hover:text-zim-gold transition-colors">
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
        </div>
      </section>

    </Layout>
  );
}
