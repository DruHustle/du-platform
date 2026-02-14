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
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${heroSlides[currentHeroIndex]?.image}')` }}
            />
            {/* Subtle lateral gradient for text legibility while maintaining the "No Overlay" feel */}
            <div className="absolute inset-0 bg-gradient-to-r from-zim-black/70 via-zim-black/30 to-transparent" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container mx-auto px-6 md:px-12 py-12">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl text-left"
            >
              {/* Updated Icon & Badge to match Template 1 */}
              <div className="flex items-center gap-3 mb-6 slide-up justify-start">
                <Globe className="h-8 w-8 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex]?.badge}
                </Badge>
              </div>
              
              {/* Heading Scale: Text-5xl to 7xl */}
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight text-white slide-up">
                {heroSlides[currentHeroIndex]?.title}
              </h1>
              
              {/* Subtitle Scale: Text-xl to 2xl */}
              <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed font-medium max-w-3xl slide-up">
                {heroSlides[currentHeroIndex]?.subtitle}
              </p>

              {/* Highlight Line with Consistent Iconography */}
              <div className="flex items-center gap-3 mb-8 slide-up">
                <TrendingUp className="h-7 w-7 text-zim-gold" />
                <span className="text-2xl font-bold text-zim-gold drop-shadow-md">
                  {heroSlides[currentHeroIndex]?.highlight}
                </span>
              </div>
              
              {/* Optional: Add buttons here if needed to maintain absolute consistency across all sections */}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators - Left Aligned */}
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

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

     {/* Trade Introduction */}
      <section id="trade-info" className="py-0 bg-background relative overflow-hidden">
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
              <Handshake className="h-8 w-8 text-zim-gold mx-auto mb-1" />
                
                <h3 className="text-lg md:text-xl font-bold text-white leading-snug px-4">
                  {t('trade.objective_subtitle')}
                </h3>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-zim-gold/50" />
                  
                  <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                    {t('trade.objective_title')}
                  </p>
                  
                  <div className="h-px w-8 bg-zim-gold/50" />
                </div>
              </div>
            </motion.div>
                    
          </div>
        </div>
      </section>

      {/* Export Process Flow Section */}
      <section id="export-roadmap" className="py-10 bg-gradient-to-b from-muted/30 to-background scroll-mt-24">
        <div className="container">
          <div className="text-center mb-10">
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
      <section id="export-sectors" className="py-10 bg-background scroll-mt-24">
        <div className="container">
          <div className="text-center mb-10">
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
      <section id="zimtrade-programs" className="py-10 bg-muted/30 scroll-mt-24">
        <div className="container">
          <div className="text-center mb-10">
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
      <section id="diaspora-role" className=" bg-background scroll-mt-24">
        <div className="container">
          <div className="text-center mb-10">
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


            {/* Contact CTA */}
            <section className="py-12">
              <div className="container">
                <Card className="max-w-2xl mx-auto text-center border-2 border-primary/20 bg-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{t("trade.cta_title")}</CardTitle>
                    <CardDescription className="text-sm">
                        {t("trade.cta_subtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                      <DialogTrigger asChild>
                        <Button size="default" className="font-bold px-8 shadow-lg">
                          {t("trade.cta_button")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0">
                        <ContactForm title={t("trade.contact_form_title")} module="trade" />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </section>
      
            {/* Footer Links CTA */}
            <section className="py-8 bg-primary text-primary-foreground">
              <div className="container text-center">
                  <h2 className="text-xl md:text-2xl font-bold mb-2">{t("trade.explore_title")}</h2>
                  <p className="text-sm mb-6 max-w-2xl mx-auto opacity-90">
                    {t("trade.explore_subtitle")} 
                  </p>
                  <a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer">
                    <Button size="default" variant="secondary" className="font-bold px-8 shadow-lg">
                      {t("trade.explore_site")} <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
              </div>
            </section>

    </Layout>
  );
}
