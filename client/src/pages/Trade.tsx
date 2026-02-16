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
      image: "/images/african_trade.jpg",
      badge: t("trade.hero.badge1"),
      badgeIcon: Users,
      title: t("trade.hero.title1"),
      subtitle: t("trade.hero.subtitle1"),
      highlight: t("trade.hero.highlight1")
    },
    {
      image: "/images/horticulture.jpg",
      badge: t("trade.hero.badge2"),
      badgeIcon: Package,
      title: t("trade.hero.title2"),
      subtitle: t("trade.hero.subtitle2"),
      highlight: t("trade.hero.highlight2")
    },
    {
      image: "/images/manufacturing_factory.jpg",
      badge: t("trade.hero.badge3"),
      badgeIcon: TrendingUp,
      title: t("trade.hero.title3"),
      subtitle: t("trade.hero.subtitle3"),
      highlight: t("trade.hero.highlight3")
    },
    {
      image: "/images/export_port1.jpg",
      badge: t("trade.hero.badge4"),
      badgeIcon: FileCheck,
      title: t("trade.hero.title4"),
      subtitle: t("trade.hero.subtitle4"),
      highlight: t("trade.hero.highlight4")
    },
    {
      image: "/images/eu_flags.png",
      badge: t("trade.hero.badge5"),
      badgeIcon: Globe,
      title: t("trade.hero.title5"),
      subtitle: t("trade.hero.subtitle5"),
      highlight: t("trade.hero.highlight5")
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
  title: t('trade.objective_title'),
  description:  t('trade.objective_subtitle')
 };

  const exportSectors = [
    {
      name: t("trade.sectors.horticulture.name"),
      description: t("trade.sectors.horticulture.description"),
      image: "/images/horticulture.jpg",
      opportunities: t("trade.sectors.horticulture.opportunities", { returnObjects: true }) as string[],
      icon: Package
    },
    {
      name: t("trade.sectors.leather_products.name"),
      description: t("trade.sectors.leather_products.description"),
      image: "/images/leather_products.jpg",
      opportunities: t("trade.sectors.leather_products.opportunities", { returnObjects: true }) as string[],
      icon: Award
    },
    {
      name: t("trade.sectors.arts_crafts.name"),
      description: t("trade.sectors.arts_crafts.description"),
      image: "/images/arts_crafts.jpg",
      opportunities: t("trade.sectors.arts_crafts.opportunities", { returnObjects: true }) as string[],
      icon: Globe
    },
    {
      name: t("trade.sectors.minerals_mining.name"),
      description: t("trade.sectors.minerals_mining.description"),
      image: "/images/minerals_mining.png",
      opportunities: t("trade.sectors.minerals_mining.opportunities", { returnObjects: true }) as string[],
      icon: TrendingUp
    }
  ];

  const programs = [
    {
      title: t("trade.programs.eagles_nest.title"),
      description: t("trade.programs.eagles_nest.description"),
      target: t("trade.programs.eagles_nest.target"),
      benefits: t("trade.programs.eagles_nest.benefits", { returnObjects: true }) as string[]
    },
    {
      title: t("trade.programs.next_she_exporter.title"),
      description: t("trade.programs.next_she_exporter.description"),
      target: t("trade.programs.next_she_exporter.target"),
      benefits: t("trade.programs.next_she_exporter.benefits", { returnObjects: true }) as string[]
    },
    {
      title: t("trade.programs.shop_at_zim.title"),
      description: t("trade.programs.shop_at_zim.description"),
      target: t("trade.programs.shop_at_zim.target"),
      benefits: t("trade.programs.shop_at_zim.benefits", { returnObjects: true }) as string[]
    }
  ];

  const diasporaRole = [
    {
      title: t("trade.diaspora_roles.market_intelligence.title"),
      description: t("trade.diaspora_roles.market_intelligence.description"),
      icon: Globe
    },
    {
      title: t("trade.diaspora_roles.buyer_connections.title"),
      description: t("trade.diaspora_roles.buyer_connections.description"),
      icon: Users
    },
    {
      title: t("trade.diaspora_roles.quality_feedback.title"),
      description: t("trade.diaspora_roles.quality_feedback.description"),
      icon: Award
    },
    {
      title: t("trade.diaspora_roles.brand_ambassadors.title"),
      description: t("trade.diaspora_roles.brand_ambassadors.description"),
      icon: TrendingUp
    }
  ];

  const exportFlowSteps = [
    {
      phase: t("trade.export_flow.product_approval.phase"),
      description: t("trade.export_flow.product_approval.description"),
      steps: t("trade.export_flow.product_approval.steps", { returnObjects: true }) as string[],
      icon: AlertCircle,
      color: "border-yellow-500"
    },
    {
      phase: t("trade.export_flow.registration_compliance.phase"),
      description: t("trade.export_flow.registration_compliance.description"),
      steps: t("trade.export_flow.registration_compliance.steps", { returnObjects: true }) as string[],
      icon: FileCheck,
      color: "border-blue-500"
    },
    {
      phase: t("trade.export_flow.certification_quality.phase"),
      description: t("trade.export_flow.certification_quality.description"),
      steps: t("trade.export_flow.certification_quality.steps", { returnObjects: true }) as string[],
      icon: CheckCircle2,
      color: "border-green-500"
    },
    {
      phase: t("trade.export_flow.logistics_documentation.phase"),
      description: t("trade.export_flow.logistics_documentation.description"),
      steps: t("trade.export_flow.logistics_documentation.steps", { returnObjects: true }) as string[],
      icon: Truck,
      color: "border-purple-500"
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

     {/* Export Process Flow Section - Glassy UI Upgrade */}
      <section id="export-roadmap" className="py-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("trade.export_roadmap_title")}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-3xl mx-auto font-light leading-relaxed">{t("trade.export_roadmap_subtitle")}</p>
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
                  <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 hover:bg-white/[0.06]">
                    {/* The Crispy Edge Finish */}
                    <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
                    
                    {/* Phase Number & Icon */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:bg-zim-gold/10 transition-colors">
                        <Icon className="h-5 w-5 text-zim-gold" />
                      </div>
                      <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Phase 0{index + 1}</span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-zim-gold transition-colors">{step.phase}</h3>
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
      </section>

      {/* Export Sectors Section - Cinematic Glass Grid */}
      <section id="export-sectors" className="py-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("trade.export_sectors_title")}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {exportSectors.map((sector, index) => {
              const Icon = sector.icon;
              return (
                <motion.div key={index} whileHover={{ y: -5 }} className="group relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-2xl transition-all duration-500">
                  <div className="relative h-48 overflow-hidden">
                    <img src={sector.image} alt={sector.name} className="w-full h-full object-cover saturate-[0.8] group-hover:saturate-100 group-hover:scale-110 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-4 left-6">
                       <h3 className="text-xl font-bold text-white tracking-tight">{sector.name}</h3>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <p className="text-xs text-white/50 leading-relaxed font-light line-clamp-2">{sector.description}</p>
                    
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-zim-gold uppercase tracking-widest">{t('trade.opportunities_label') || "Opportunities"}</h4>
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
      </section>

      {/* ZimTrade Programs Section - High-Density Dashboard */}
      <section id="zimtrade-programs" className="py-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
             <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("trade.zimtrade_programs_title")}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {programs.map((program, index) => (
              <div key={index} className="relative p-10 rounded-[3rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] group">
                <span className="absolute inset-0 rounded-[3rem] border border-white/5 pointer-events-none" />
                
                <h3 className="text-2xl font-black text-white mb-4 tracking-tight group-hover:text-zim-gold transition-colors">{program.title}</h3>
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
      </section>

      {/* Diaspora Role Section - Floating Glass Icons */}
      <section id="diaspora-role" className="pb-24 pt-10 bg-slate-950 relative overflow-hidden scroll-mt-24">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("trade.diaspora_role_title")}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {diasporaRole.map((role, index) => {
              const Icon = role.icon;
              return (
                <div key={index} className="text-center p-8 rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 hover:bg-white/[0.08] group">
                  <div className="mx-auto h-20 w-20 bg-zim-gold/10 rounded-3xl border border-zim-gold/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-zim-gold/20 transition-all">
                    <Icon className="h-10 w-10 text-zim-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-3">{role.title}</h3>
                  <p className="text-xs text-white/40 leading-relaxed font-light">{role.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>


    </Layout>
  );
}
