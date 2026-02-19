import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Package, TrendingUp, Award, Globe, ExternalLink, Users, FileCheck, Truck, AlertCircle, CheckCircle2, ArrowRight, Handshake } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";

export default function Trade() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isFlowDiagramOpen, setIsFlowDiagramOpen] = useState(false);

  const heroSlides = useMemo(() => [
    {
      image: "/images/pages/trade/export_port1.jpg",
      badge: t("trade.hero.badge1") || "ZimTrade Export Support",
      badgeIcon: Users,
      title: t("trade.hero.title1") || "Export from Zimbabwe with Confidence",
      subtitle: t("trade.hero.subtitle1") || "Use ZimTrade market intelligence, buyer linkages, and compliance support to enter priority markets.",
      highlight: t("trade.hero.highlight1") || "Market Readiness"
    },
    {
      image: "/images/pages/shared/horticulture.jpg",
      badge: t("trade.hero.badge2") || "EU Market Access",
      badgeIcon: Package,
      title: t("trade.hero.title2") || "iEPA Duty-Free Entry",
      subtitle: t("trade.hero.subtitle2") || "Eligible Zimbabwean products can access the EU under preferential terms when origin rules are met.",
      highlight: t("trade.hero.highlight2") || "Duty-Free & Quota-Free"
    },
    {
      image: "/images/pages/trade/manufacturing_factory.jpg",
      badge: t("trade.hero.badge3") || "Compliance First",
      badgeIcon: TrendingUp,
      title: t("trade.hero.title3") || "Meet EU Product Rules",
      subtitle: t("trade.hero.subtitle3") || "Align with SPS, food safety, and traceability requirements before shipment.",
      highlight: t("trade.hero.highlight3") || "Standards Compliance"
    },
    {
      image: "/images/pages/trade/export_port1.jpg",
      badge: t("trade.hero.badge4") || "REX Origin System",
      badgeIcon: FileCheck,
      title: t("trade.hero.title4") || "Self-Certify Origin Correctly",
      subtitle: t("trade.hero.subtitle4") || "For consignments above EUR 6,000, use REX registration and statement on origin requirements.",
      highlight: t("trade.hero.highlight4") || "Correct Documentation"
    },
    {
      image: "/images/pages/export/eu_flags.png",
      badge: t("trade.hero.badge5") || "Strategic Export Planning",
      badgeIcon: Globe,
      title: t("trade.hero.title5") || "Use Access2Markets + ZimTrade",
      subtitle: t("trade.hero.subtitle5") || "Validate duties, technical measures, and buyer requirements by HS code before closing deals.",
      highlight: t("trade.hero.highlight5") || "Data-Driven Exports"
    },
    {
      image: "/images/pages/export/eu_symbol.png",
      badge: t("trade.hero.badge6") || "Regulatory Readiness",
      badgeIcon: FileCheck,
      title: t("trade.hero.title6") || "Meet Documentation Standards",
      subtitle: t("trade.hero.subtitle6") || "Build complete shipment files with invoices, packing lists, transport documents, and origin statements.",
      highlight: t("trade.hero.highlight6") || "Clean Documentation"
    },
    {
      image: "/images/pages/shared/leather_products.jpg",
      badge: t("trade.hero.badge7") || "Value Addition",
      badgeIcon: Award,
      title: t("trade.hero.title7") || "Scale Higher-Value Products",
      subtitle: t("trade.hero.subtitle7") || "Move beyond raw exports by improving packaging, branding, and product finishing for premium buyers.",
      highlight: t("trade.hero.highlight7") || "Better Margins"
    },
    {
      image: "/images/pages/shared/minerals_mining.png",
      badge: t("trade.hero.badge8") || "Sector Expansion",
      badgeIcon: Truck,
      title: t("trade.hero.title8") || "Diversify Export Portfolio",
      subtitle: t("trade.hero.subtitle8") || "Balance commodity exports with processed goods and sector-specific compliance planning.",
      highlight: t("trade.hero.highlight8") || "Risk Balanced Growth"
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const introData = {
  icon: Handshake, // 
  title: t('trade.objective_title') || "Zimbabwe Trade Execution",
  description:  t('trade.objective_subtitle') || "Practical export guidance for 2026: market access, compliance, shipping, and diaspora-led buyer linkages."
 };

  const exportSectors = [
    {
      name: t("trade.sectors.horticulture.name") || "Horticulture",
      description: t("trade.sectors.horticulture.description") || "Fresh produce and processed foods with strong EU and regional demand when SPS standards are met",
      image: "/images/pages/shared/horticulture.jpg",
      opportunities: t("trade.sectors.horticulture.opportunities", { returnObjects: true }) as string[],
      icon: Package
    },
    {
      name: t("trade.sectors.leather_products.name") || "Leather Products",
      description: t("trade.sectors.leather_products.description") || "Value-added manufacturing exports including footwear and lifestyle products for diaspora and EU channels",
      image: "/images/pages/shared/leather_products.jpg",
      opportunities: t("trade.sectors.leather_products.opportunities", { returnObjects: true }) as string[],
      icon: Award
    },
    {
      name: t("trade.sectors.arts_crafts.name") || "Arts & Crafts",
      description: t("trade.sectors.arts_crafts.description") || "Authentic artisan exports that perform well in niche retail and diaspora-curated marketplaces",
      image: "/images/pages/shop/crafts_stone_sculptures1.png",
      opportunities: t("trade.sectors.arts_crafts.opportunities", { returnObjects: true }) as string[],
      icon: Globe
    },
    {
      name: t("trade.sectors.minerals_mining.name") || "Minerals & Mining",
      description: t("trade.sectors.minerals_mining.description") || "Strategic minerals and value-added products with increasing demand in industrial and energy value chains",
      image: "/images/pages/shared/minerals_mining.png",
      opportunities: t("trade.sectors.minerals_mining.opportunities", { returnObjects: true }) as string[],
      icon: TrendingUp
    }
  ];

  const programs = [
    {
      title: t("trade.programs.eagles_nest.title") || "Eagles Nest",
      description: t("trade.programs.eagles_nest.description") || "Youth export incubator program developing the next generation of Zimbabwean exporters",
      target: t("trade.programs.eagles_nest.target") || "Young entrepreneurs (18-35)",
      benefits: t("trade.programs.eagles_nest.benefits", { returnObjects: true }) as string[]
    },
    {
      title: t("trade.programs.next_she_exporter.title") || "Next She Exporter",
      description: t("trade.programs.next_she_exporter.description") || "Empowering female-owned businesses with export knowledge, skills, and market connections",
      target: t("trade.programs.next_she_exporter.target") || "Women-owned businesses",
      benefits: t("trade.programs.next_she_exporter.benefits", { returnObjects: true }) as string[]
    },
    {
      title: t("trade.programs.shop_at_zim.title") || "Shop At Zim",
      description: t("trade.programs.shop_at_zim.description") || "B2B e-commerce platform connecting Zimbabwean suppliers with international buyers",
      target: t("trade.programs.shop_at_zim.target") || "Export-ready businesses",
      benefits: t("trade.programs.shop_at_zim.benefits", { returnObjects: true }) as string[]
    }
  ];

  const diasporaRole = [
    {
      title: t("trade.diaspora_roles.market_intelligence.title") || "Market Intelligence",
      description: t("trade.diaspora_roles.market_intelligence.description") || "Share insights about consumer preferences, trends, and opportunities in your host country",
      icon: Globe,
      emoji: "🌍",
    },
    {
      title: t("trade.diaspora_roles.buyer_connections.title") || "Buyer Connections",
      description: t("trade.diaspora_roles.buyer_connections.description") || "Introduce Zimbabwean exporters to retailers, distributors, and importers in your network",
      icon: Users,
      emoji: "🤝",
    },
    {
      title: t("trade.diaspora_roles.quality_feedback.title") || "Quality Feedback",
      description: t("trade.diaspora_roles.quality_feedback.description") || "Provide feedback on product quality, packaging, and market readiness",
      icon: Award,
      emoji: "✅",
    },
    {
      title: t("trade.diaspora_roles.brand_ambassadors.title") || "Brand Ambassadors",
      description: t("trade.diaspora_roles.brand_ambassadors.description") || "Promote Zimbabwean products and brands in international markets",
      icon: TrendingUp,
      emoji: "📢",
    }
  ];

  const exportFlowSteps = [
    {
      phase: t("trade.export_flow.product_approval.phase") || "Product Approval",
      description: t("trade.export_flow.product_approval.description") || "Start with market access and product classification",
      steps: (t("trade.export_flow.product_approval.steps", { returnObjects: true }) as string[]) || [
        "Classify your product with the correct HS code.",
        "Check the EU Access2Markets portal for duties, taxes, and measures.",
        "Confirm eligibility for iEPA preferential access before pricing contracts.",
        "For restricted product categories, obtain sector-specific approvals first.",
      ],
      icon: AlertCircle,
      color: "border-yellow-500"
    },
    {
      phase: t("trade.export_flow.registration_compliance.phase") || "Registration & Compliance",
      description: t("trade.export_flow.registration_compliance.description") || "Core registrations for Zimbabwe exporters",
      steps: (t("trade.export_flow.registration_compliance.steps", { returnObjects: true }) as string[]) || [
        "Register the business and tax profile with ZIMRA.",
        "Apply for Registered Exporter (REX) status for origin self-certification.",
        "Consignments above EUR 6,000 require statement on origin by a registered exporter.",
        "Consignments at or below EUR 6,000 can be self-certified without REX.",
      ],
      icon: FileCheck,
      color: "border-blue-500"
    },
    {
      phase: t("trade.export_flow.certification_quality.phase") || "Certification & Quality",
      description: t("trade.export_flow.certification_quality.description") || "Meet destination standards and risk rules",
      steps: (t("trade.export_flow.certification_quality.steps", { returnObjects: true }) as string[]) || [
        "Comply with SPS requirements for food and plant products.",
        "Use GLOBALG.A.P. or HACCP where required by buyers and retailers.",
        "Prepare traceability documentation for EUDR-affected supply chains.",
        "Track CBAM developments for carbon-intensive products and contracts.",
      ],
      icon: CheckCircle2,
      color: "border-green-500"
    },
    {
      phase: t("trade.export_flow.logistics_documentation.phase") || "Logistics & Documentation",
      description: t("trade.export_flow.logistics_documentation.description") || "Dispatch, customs, and payment controls",
      steps: (t("trade.export_flow.logistics_documentation.steps", { returnObjects: true }) as string[]) || [
        "Prepare commercial invoice, packing list, and bill of lading/air waybill.",
        "Include correct origin declarations and shipping marks.",
        "Align payment terms with exchange-control and banking requirements.",
        "Keep complete records for audits, claims, and repeat shipments.",
      ],
      icon: Truck,
      color: "border-purple-500"
    }
  ];

  const marketIntelResources = [
    {
      title: t("trade.market_resources.trade_zimbabwe.title") || "Trade Zimbabwe Portal",
      description: t("trade.market_resources.trade_zimbabwe.description") || "Official ZimTrade trade information portal with exporter support, market information, and publication access.",
      href: "https://tradezimbabwe.com/",
      badge: t("trade.market_resources.trade_zimbabwe.badge") || "Official Portal",
    },
    {
      title: t("trade.market_resources.cbi.title") || "CBI Market Information",
      description: t("trade.market_resources.cbi.description") || "Access practical EU market intelligence, buyer requirements, and product compliance guidance curated by ZimTrade.",
      href: "https://tradezimbabwe.com/cbi-market-information/",
      badge: t("trade.market_resources.cbi.badge") || "Market Intelligence",
    },
    {
      title: t("trade.market_resources.zim_ebic.title") || "ZIM-EBIC",
      description: t("trade.market_resources.zim_ebic.description") || "Use the Zimbabwe-EU Business Information Centre for trade regulations, market briefs, and support tools for EU-facing exporters.",
      href: "https://tradezimbabwe.com/zim-ebic/",
      badge: t("trade.market_resources.zim_ebic.badge") || "EU Business Support",
    },
    {
      title: t("trade.market_resources.directory.title") || "Trade Directory 2023",
      description: t("trade.market_resources.directory.description") || "Find exporter profiles and business contacts from Trade Zimbabwe's 2023 directory used for marketplace discovery.",
      href: "https://tradezimbabwe.com/wp-content/uploads/2023/06/TradeDirectory_2023_WEB.pdf",
      badge: t("trade.market_resources.directory.badge") || "Business Directory",
    },
    {
      title: t("trade.market_resources.library.title") || "Virtual Library",
      description: t("trade.market_resources.library.description") || "Browse trade directories, market briefs, newsletters, and exporter guides for market-entry planning.",
      href: "https://tradezimbabwe.com/virtual-library/",
      badge: t("trade.market_resources.library.badge") || "Publications",
    },
    {
      title: t("trade.market_resources.contacts.title") || "Useful Contacts",
      description: t("trade.market_resources.contacts.description") || "Access Trade Zimbabwe office and trade-support contact points for follow-up on market and export enquiries.",
      href: "https://tradezimbabwe.com/useful-contacts/",
      badge: t("trade.market_resources.contacts.badge") || "Contact Points",
    },
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

     {/* Export Process Flow Section - Glassy UI Upgrade */}
      <section id="export-roadmap" className="py-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Package className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">{t("trade.export_roadmap_title") || "Zimbabwe Export Roadmap (2026)"}</h3>
              </div>
              <p className="text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">{t("trade.export_roadmap_subtitle") || "A practical path for exporters using ZimTrade support, ZIMRA/REX processes, and EU compliance requirements."}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {exportFlowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 20 }} 
                    whileInView={{ opacity: 1, y: 0 }} 
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 transition-all duration-500 hover:bg-slate-950/60">
                      {/* Phase Number & Icon */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:bg-zim-gold/10 transition-colors">
                          <Icon className="h-5 w-5 text-zim-gold" />
                        </div>
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Phase 0{index + 1}</span>
                      </div>

                      <h3 className="text-lg font-black text-white tracking-tight mb-3 group-hover:text-zim-gold transition-colors">{step.phase}</h3>
                      <p className="text-xs text-white/50 mb-6 leading-relaxed font-light">{step.description}</p>
                      
                      <ul className="space-y-3">
                        {step.steps.map((detail, dIdx) => (
                          <li key={dIdx} className="flex items-start gap-3">
                            <CheckCircle2 className="h-3.5 w-3.5 text-zim-gold opacity-60 mt-0.5 shrink-0" />
                            <span className="text-[11px] text-white/70 font-medium leading-snug">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Globe className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">Trade Zimbabwe Market Information</h3>
              </div>
              <p className="text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">
                Use these official resources to validate market requirements and discover exporter business profiles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketIntelResources.map((resource) => (
                    <Card key={resource.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] text-white">
                  <CardHeader className="space-y-3">
                    <Badge className="w-fit bg-zim-gold/10 text-zim-gold border border-zim-gold/20 text-[10px] font-black uppercase tracking-widest">
                      {resource.badge}
                    </Badge>
                    <CardTitle className="text-xl font-black tracking-tight">{resource.title}</CardTitle>
                    <CardDescription className="text-white/70 text-sm leading-relaxed">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={resource.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-zim-gold font-black uppercase tracking-widest text-[11px] hover:text-white transition-colors"
                    >
                      {t("trade.market_resources.open_resource") || "Open Resource"} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Export Sectors Section - Cinematic Glass Grid */}
      <section id="export-sectors" className="py-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Award className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">{t("trade.export_sectors_title") || "Key Export Sectors"}</h3>
              </div>
              <p className="text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">
                {t("trade.export_sectors_subtitle") || "Discover the primary sectors driving Zimbabwe's export economy."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {exportSectors.map((sector, index) => {
                const Icon = sector.icon;
                return (
                  <motion.div key={index} whileHover={{ y: -5 }} className="group relative rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02]  shadow-2xl transition-all duration-500">
                    <div className="relative h-48 overflow-hidden">
                      <img src={sector.image} alt={sector.name} className="w-full h-full object-cover saturate-[0.8] group-hover:saturate-100 group-hover:scale-110 transition-all duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                      <div className="absolute bottom-4 left-6">
                         <h3 className="text-lg font-black text-white tracking-tight">{sector.name}</h3>
                      </div>
                    </div>
                    
                    <div className="p-8 space-y-6">
                      <p className="text-xs text-white/50 leading-relaxed font-light line-clamp-2">{sector.description}</p>
                      
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-zim-gold uppercase tracking-widest">{t('trade.export_sectors_badge') || "Sectors"}</h4>
                        <ul className="space-y-2">
                          {sector.opportunities.map((opp, oppIdx) => (
                            <li key={oppIdx} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-white/80">
                              <div className="h-1 w-1 rounded-full bg-zim-gold shadow-[0_0_8px_rgba(212,175,55,1)]" />
                              <span>{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ZimTrade Programs Section - High-Density Dashboard */}
      <section id="zimtrade-programs" className="py-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Users className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">{t("trade.zimtrade_programs_title") || "ZimTrade Export Development Programs"}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {programs.map((program, index) => (
                <div key={index} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                  
                  <h3 className="text-xl font-black text-white mb-4 tracking-tight">{program.title}</h3>
                  <p className="text-sm text-white/40 mb-8 font-light leading-relaxed">{program.description}</p>
                  
                  <div className="space-y-8">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Target Audience</h4>
                      <p className="text-[13px] text-white/80 font-medium">{program.target}</p>
                    </div>
                    
                    <ul className="space-y-3">
                      {program.benefits.map((benefit, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-3">
                          <CheckCircle2 className="h-4 w-4 text-zim-gold opacity-60 shrink-0" />
                          <span className="text-[11px] text-white/70 font-black uppercase tracking-widest leading-tight">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Diaspora Role Section - Floating Glass Icons */}
      <section id="diaspora-role" className="pb-24 pt-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Handshake className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">{t("trade.diaspora_role_title") || "Your Role in Export Growth"}</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {diasporaRole.map((role, index) => {
                return (
                  <div key={index} className="text-center p-7 rounded-[2rem] border border-white/10 bg-white/[0.02] transition-all duration-500 hover:bg-slate-950/60 group">
                    <div className="mx-auto h-20 w-20 p-4 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                      <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{role.emoji}</span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight mb-3">{role.title}</h3>
                    <p className="text-xs text-white/40 leading-relaxed font-light">{role.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


    </Layout>
  );
}
