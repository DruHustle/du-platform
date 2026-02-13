import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Package, TrendingUp, Award, Globe, ExternalLink, Users, FileCheck, Truck, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Trade() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isFlowDiagramOpen, setIsFlowDiagramOpen] = useState(false);

  const heroSlides = useMemo(() => [
    {
      image: "/images/african_trade.jpg",
      badge: t("trade.hero.badge1"),
      title: t("trade.hero.title1"),
      subtitle: t("trade.hero.subtitle1"),
      highlight: t("trade.hero.highlight1")
    },
    {
      image: "/images/horticulture.jpg",
      badge: t("trade.hero.badge2"),
      title: t("trade.hero.title2"),
      subtitle: t("trade.hero.subtitle2"),
      highlight: t("trade.hero.highlight2")
    },
    {
      image: "/images/manufacturing_factory.jpg",
      badge: t("trade.hero.badge3"),
      title: t("trade.hero.title3"),
      subtitle: t("trade.hero.subtitle3"),
      highlight: t("trade.hero.highlight3")
    },
    {
      image: "/images/export_port1.jpg",
      badge: t("trade.hero.badge4"),
      title: t("trade.hero.title4"),
      subtitle: t("trade.hero.subtitle4"),
      highlight: t("trade.hero.highlight4")
    },
    {
      image: "/images/eu_flags.png",
      badge: t("trade.hero.badge5"),
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

      {/* Export Process Flow Section */}
      <section id="export-roadmap" className="py-20 bg-gradient-to-b from-muted/30 to-background scroll-mt-24">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              {t("trade.export_roadmap_badge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("trade.export_roadmap_title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("trade.export_roadmap_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {exportFlowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className={`relative p-6 border-t-4 ${step.color} shadow-lg hover:shadow-xl transition-shadow duration-300`}>
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-muted flex items-center justify-center mr-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold">{step.phase}</CardTitle>
                  </div>
                  <CardDescription className="mb-4">{step.description}</CardDescription>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {step.steps.map((detail, dIdx) => (
                      <li key={dIdx} className="flex items-start">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-1" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Export Sectors Section */}
      <section id="export-sectors" className="py-20 bg-background scroll-mt-24">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              {t("trade.export_sectors_badge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("trade.export_sectors_title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("trade.export_sectors_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {exportSectors.map((sector, index) => {
              const Icon = sector.icon;
              return (
                <Card key={index} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <img src={sector.image} alt={sector.name} className="w-full h-48 object-cover" />
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl font-bold">{sector.name}</CardTitle>
                      <Icon className="h-6 w-6 text-zim-gold" />
                    </div>
                    <CardDescription>{sector.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-2">Opportunities:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {sector.opportunities.map((opp, oppIdx) => (
                        <li key={oppIdx} className="flex items-center">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ZimTrade Programs Section */}
      <section id="zimtrade-programs" className="py-20 bg-muted/30 scroll-mt-24">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              {t("trade.zimtrade_programs_badge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("trade.zimtrade_programs_title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("trade.zimtrade_programs_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {programs.map((program, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold mb-2">{program.title}</CardTitle>
                  <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <h4 className="font-semibold">Target Audience:</h4>
                    <p className="text-muted-foreground">{program.target}</p>
                  </div>
                  <h4 className="font-semibold mb-2">Benefits:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {program.benefits.map((benefit, bIdx) => (
                      <li key={bIdx} className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Diaspora Role Section */}
      <section id="diaspora-role" className="py-20 bg-background scroll-mt-24">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              {t("trade.diaspora_role_badge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("trade.diaspora_role_title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("trade.diaspora_role_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {diasporaRole.map((role, index) => {
              const Icon = role.icon;
              return (
                <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader>
                    <div className="mx-auto h-16 w-16 bg-zim-gold/20 rounded-full flex items-center justify-center mb-4">
                      <Icon className="h-8 w-8 text-zim-gold" />
                    </div>
                    <CardTitle>{role.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{role.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-4">{t("trade.cta_title")}</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">{t("trade.cta_subtitle")}</p>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" className="font-bold text-lg px-10 h-14 shadow-xl group">
                {t("trade.cta_button")}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
              <ContactForm 
                title={t("trade.contact_form_title")}
                module="trade"
              />
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </Layout>
  );
}
