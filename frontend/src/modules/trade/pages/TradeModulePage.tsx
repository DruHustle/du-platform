import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Package, TrendingUp, Award, Globe, Users, FileCheck, Truck, AlertCircle, CheckCircle2, ArrowRight, Handshake, FileText } from "lucide-react";
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
      image: "/images/pages/trade/export_port_01.jpg",
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
      image: "/images/pages/trade/export_port_01.jpg",
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
  description:  t('trade.objective_subtitle') || "Execute export growth with a practical playbook for market access, regulatory compliance, shipping controls, and diaspora-enabled buyer connections."
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
      image: "/images/pages/shop/crafts_stone_sculptures_01.png",
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

  const diasporaRole = [
    {
      title: t("trade.diaspora_roles.market_intelligence.title") || "Market Intelligence",
      description: t("trade.diaspora_roles.market_intelligence.description") || "We provide practical insight on buyer behavior, demand shifts, and product opportunities across target export markets.",
      icon: Globe,
      emoji: "🌍",
    },
    {
      title: t("trade.diaspora_roles.buyer_connections.title") || "Buyer Connections",
      description: t("trade.diaspora_roles.buyer_connections.description") || "We connect Zimbabwean exporters to relevant retailers, distributors, and importers through curated trade relationships.",
      icon: Users,
      emoji: "🤝",
    },
    {
      title: t("trade.diaspora_roles.quality_feedback.title") || "Quality Feedback",
      description: t("trade.diaspora_roles.quality_feedback.description") || "We help improve export readiness with structured feedback on product quality, packaging, and market fit.",
      icon: Award,
      emoji: "✅",
    },
    {
      title: t("trade.diaspora_roles.brand_ambassadors.title") || "Brand Ambassadors",
      description: t("trade.diaspora_roles.brand_ambassadors.description") || "We promote Zimbabwean products and brands in international markets through coordinated visibility and outreach.",
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

  const exportMarketIntelligence = [
    {
      product: "Blueberries",
      status: "High Demand",
      image: "/images/pages/export/blueberry_export.png",
      requirements: [
        "GLOBALG.A.P. farm assurance",
        "Residue and pesticide controls",
        "Cold-chain continuity",
        "Traceability records by lot",
      ],
      buyers: ["Retail chains", "Fresh produce importers", "Wholesale distributors"],
    },
    {
      product: "Honey",
      status: "Growing Niche",
      image: "/images/pages/wikimedia/small-honey-jar.jpg",
      requirements: [
        "Food safety controls (HACCP)",
        "Residue monitoring evidence",
        "Clear labeling and origin declarations",
        "Batch-level traceability",
      ],
      buyers: ["Organic shops", "Specialty food stores", "Health and wellness retailers"],
    },
    {
      product: "Natural Oils (Marula)",
      status: "Emerging Segment",
      image: "/images/pages/export/marula_export.png",
      requirements: [
        "Quality and purity specifications",
        "Stable packaging for long transit",
        "Safety documentation for cosmetics use",
        "Consistent supplier traceability",
      ],
      buyers: ["Cosmetics manufacturers", "Wellness brands", "Natural products distributors"],
    },
  ];

  const exportDocumentationBlocks = [
    {
      title: "REX and Preferential Tariffs",
      tag: "Tariff Access",
      items: [
        "Use iEPA preferences where rules-of-origin are met.",
        "For consignments above EUR 6,000, use REX-based statement on origin.",
        "Maintain audit-ready origin evidence for customs checks.",
      ],
    },
    {
      title: "ZIMRA and Export Documentation",
      tag: "Pre-shipment",
      items: [
        "Prepare commercial invoice, packing list, and transport documents.",
        "Include accurate HS code and product descriptions.",
        "Secure sector-specific permits where required.",
      ],
    },
    {
      title: "SPS and Product Safety",
      tag: "SPS Critical",
      items: [
        "Apply food and plant SPS controls before dispatch.",
        "Use certification pathways expected by buyers (for example GLOBALG.A.P. and HACCP).",
        "Keep traceability records complete and accessible.",
      ],
    },
    {
      title: "Importer Readiness",
      tag: "Border Clearance",
      items: [
        "Confirm importer EORI and customs instructions in advance.",
        "Align contract terms with payment and logistics milestones.",
        "Archive full shipment records for post-clearance audits.",
      ],
    },
  ];

  const exportComplianceChecklist = [
    "Confirm product HS code and applicable market measures before quotation.",
    "Validate REX and statement-on-origin requirements by consignment value.",
    "Complete SPS and labeling checks before goods leave origin.",
    "Ensure logistics documents are complete and internally consistent.",
    "Track CBAM and EUDR implications where product scope applies.",
    "Keep complete digital records for customs and buyer audits.",
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

      {/* Diaspora Role Section - Floating Glass Icons */}
      <section id="diaspora-role" className="p-5 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Handshake className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">{t("trade.diaspora_role_title") || "Our Role in Export Growth"}</h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("trade.diaspora_role_subtitle") || "Diaspora Unlocked provides practical market support to help Zimbabwean exporters validate, enter, and scale in international markets."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {diasporaRole.map((role, index) => {
                return (
                  <div key={index} className="text-center p-5 rounded-[2rem] border border-white/10 bg-white/[0.02] transition-all duration-500 hover:bg-slate-950/60 group">
                    <div className="mx-auto h-14 w-14 p-2.5 bg-white/5 rounded-xl flex items-center justify-center mb-4">
                      <span className="text-3xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{role.emoji}</span>
                    </div>
                    <h3 className="text-base font-black text-white tracking-tight mb-2">{role.title}</h3>
                    <p className="text-[11px] text-white/70 leading-relaxed font-light">{role.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Export intelligence moved from Exports into Trade */}
      <section id="trade-export-intelligence" className="p-5 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-5 mx-auto">
          <Tabs defaultValue={exportMarketIntelligence[0].product} className="w-full">
            <TabsList className="flex justify-center bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-full h-12 p-1 mb-8 max-w-lg mx-auto shadow-xl relative">
              <span className="absolute inset-0 rounded-full border border-white/5 pointer-events-none" />
              {exportMarketIntelligence.map((item) => (
                <TabsTrigger
                  key={item.product}
                  value={item.product}
                  className="flex-1 rounded-full px-2 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-zim-gold data-[state=active]:text-zim-black data-[state=active]:shadow-[0_0_15px_rgba(212,175,55,0.3)] text-white/70"
                >
                  {item.product}
                </TabsTrigger>
              ))}
            </TabsList>

            {exportMarketIntelligence.map((item) => (
              <TabsContent key={item.product} value={item.product} className="mt-0 outline-none">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative p-8 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group"
                >
                  <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
                    <div className="md:col-span-3 flex flex-col space-y-4 border-r border-white/5 pr-6">
                      <div className="space-y-1">
                        <Badge className="bg-zim-gold/10 text-zim-gold border-none text-[9px] font-black px-2 py-0.5 uppercase tracking-tighter">
                          {item.status}
                        </Badge>
                        <h3 className="text-lg font-black text-white tracking-tight leading-none">{item.product}</h3>
                      </div>

                      <div className="relative group/img overflow-hidden rounded-2xl border border-white/10 aspect-[4/3]">
                        <div
                          className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover/img:scale-110 saturate-[0.7] group-hover/img:saturate-100"
                          style={{ backgroundImage: `url('${item.image}')` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-transparent to-white/10 pointer-events-none" />
                      </div>

                      <div className="pt-2">
                        <p className="text-[9px] font-black text-white/70 uppercase tracking-widest mb-1">
                          Demand Outlook
                        </p>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-zim-gold" />
                          <span className="text-xs font-bold text-white/90 tracking-tight">
                            Sustained EU Demand
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-6 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">
                          Compliance Requirements
                        </span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.requirements.map((req) => (
                          <div key={req} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10 hover:bg-slate-950/60 hover:border-white/10 transition-all duration-300">
                            <div className="p-1.5 bg-white/5 rounded-lg">
                              <FileText className="h-3.5 w-3.5 text-zim-gold/70" />
                            </div>
                            <span className="text-[11px] text-white/70 leading-snug font-light">{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-3 flex flex-col bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-inner">
                      <span className="text-[10px] font-black text-zim-gold uppercase tracking-[0.2em] block mb-4">
                        Buyer Channels
                      </span>
                      <div className="flex flex-col gap-3 flex-grow">
                        {item.buyers.map((buyer) => (
                          <div key={buyer} className="flex items-center gap-3 text-[11px] py-2 border-b border-white/5 last:border-0 group/buyer cursor-default">
                            <div className="h-1 w-1 rounded-full bg-zim-gold transition-transform group-hover/buyer:scale-150" />
                            <span className="text-white/70 font-medium group-hover/buyer:text-white transition-colors">{buyer}</span>
                          </div>
                        ))}
                      </div>
                      <Button asChild className="w-full mt-6 h-10 bg-white/5 hover:bg-zim-gold border border-white/10 hover:border-zim-gold text-white hover:text-zim-black text-[9px] font-black uppercase tracking-widest transition-all duration-500 rounded-xl">
                        <Link href="/regulations#export-certification-and-labeling">Contact Verified Buyers</Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Export Sectors Section - Cinematic Glass Grid */}
      <section id="export-sectors" className="p-5 bg-slate-950 relative overflow-hidden scroll-mt-24">
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
                      <p className="text-xs text-white/70 leading-relaxed font-light line-clamp-2">{sector.description}</p>
                      
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

     {/* Export Process Flow Section - Glassy UI Upgrade */}
      <section id="export-roadmap" className="p-5 bg-slate-950 relative overflow-hidden scroll-mt-24">
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
                        <span className="text-[10px] font-black text-white/70 uppercase tracking-widest italic">Phase 0{index + 1}</span>
                      </div>

                      <h3 className="text-lg font-black text-white tracking-tight mb-3 group-hover:text-zim-gold transition-colors">{step.phase}</h3>
                      <p className="text-xs text-white/70 mb-6 leading-relaxed font-light">{step.description}</p>
                      
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


     {/* Export Documentation and compliance */}
      <section id="trade-export-documentation" className="py-5 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <FileCheck className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">Export Documentation and Compliance</h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                Core controls previously shown on Exports are now consolidated in Trade.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exportDocumentationBlocks.map((block) => (
                <div key={block.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6">
                  <Badge className="mb-3 bg-zim-gold/10 text-zim-gold border border-zim-gold/20 text-[10px] font-black uppercase tracking-widest">
                    {block.tag}
                  </Badge>
                  <h4 className="text-white text-lg font-black tracking-tight mb-3">{block.title}</h4>
                  <ul className="space-y-2">
                    {block.items.map((item) => (
                      <li key={item} className="text-sm text-white/75 leading-relaxed">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Crirical Export Checklist*/}
      <section id="trade-export-checklist" className="pt-5 pb-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <CheckCircle2 className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">Critical Export Checklist</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exportComplianceChecklist.map((point) => (
                <div key={point} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/75">
                  {point}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                <Link href="/regulations#export-controls">Open Full Compliance Guide</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
