import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import InvestmentCalculator from "@/components/InvestmentCalculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, Shield, DollarSign, ExternalLink, CheckCircle, Building, Leaf, Cpu, Factory, Award, Brain, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Investment() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/rbz_building.png",
      badge: t('investment.hero.badge1'),
      title: t('investment.hero.title1'),
      subtitle: t('investment.hero.subtitle1'),
      highlight: t('investment.hero.highlight1')
    },
    {
      image: "/images/masuwe_sez.png",
      badge: t('investment.hero.badge2'),
      title: t('investment.hero.title2'),
      subtitle: t('investment.hero.subtitle2'),
      highlight: t('investment.hero.highlight2')
    },
    {
      image: "/images/vfex_logo.png",
      badge: t('investment.hero.badge3'),
      title: t('investment.hero.title3'),
      subtitle: t('investment.hero.subtitle3'),
      highlight: t('investment.hero.highlight3')
    },
    {
      image: "/images/horticulture.jpg",
      badge: t('investment.hero.badge4'),
      title: t('investment.hero.title4'),
      subtitle: t('investment.hero.subtitle4'),
      highlight: t('investment.hero.highlight4')
    },
    {
      image: "/images/minerals_mining.png",
      badge: t('investment.hero.badge5'),
      title: t('investment.hero.title5'),
      subtitle: t('investment.hero.subtitle5'),
      highlight: t('investment.hero.highlight5')
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const projects = [
    {
      title: t('investment.projects.masuwe.title'),
      description: t('investment.projects.masuwe.description'),
      category: t('investment.projects.masuwe.category'),
      sector: "tourism",
      targetAmount: "$1.2B",
      raised: "$0",
      progress: 0,
      investors: 12,
      minInvestment: "$100,000",
      expectedReturn: "15-25% annually",
      timeline: "10-15 years",
      status: t('investment.projects.active'),
      risk: "moderate",
      verified: true,
      highlights: [
        t('investment.projects.masuwe.highlights.0'),
        t('investment.projects.masuwe.highlights.1'),
        t('investment.projects.masuwe.highlights.2'),
        t('investment.projects.masuwe.highlights.3')
      ]
    },
    {
      title: t('investment.projects.leather.title'),
      description: t('investment.projects.leather.description'),
      category: t('investment.projects.leather.category'),
      sector: "manufacturing",
      targetAmount: "$250,000",
      raised: "$187,500",
      progress: 75,
      investors: 342,
      minInvestment: "$500",
      expectedReturn: "12-15% annually",
      timeline: "3-5 years",
      status: t('investment.projects.active'),
      risk: "moderate",
      verified: true,
      highlights: [
        t('investment.projects.leather.highlights.0'),
        t('investment.projects.leather.highlights.1'),
        t('investment.projects.leather.highlights.2'),
        t('investment.projects.leather.highlights.3')
      ]
    },
    {
      title: t('investment.projects.horticulture.title'),
      description: t('investment.projects.horticulture.description'),
      category: t('investment.projects.horticulture.category'),
      sector: "agriculture",
      targetAmount: "$150,000",
      raised: "$98,000",
      progress: 65,
      investors: 218,
      minInvestment: "$300",
      expectedReturn: "10-12% annually",
      timeline: "2-4 years",
      status: t('investment.projects.active'),
      risk: "conservative",
      verified: true,
      highlights: [
        t('investment.projects.horticulture.highlights.0'),
        t('investment.projects.horticulture.highlights.1'),
        t('investment.projects.horticulture.highlights.2'),
        t('investment.projects.horticulture.highlights.3')
      ]
    },
    {
      title: t('investment.projects.lodge.title'),
      description: t('investment.projects.lodge.description'),
      category: t('investment.projects.lodge.category'),
      sector: "tourism",
      targetAmount: "$500,000",
      raised: "$125,000",
      progress: 25,
      investors: 156,
      minInvestment: "$1,000",
      expectedReturn: "15-18% annually",
      timeline: "5-7 years",
      status: t('investment.projects.active'),
      risk: "aggressive",
      verified: false,
      highlights: [
        t('investment.projects.lodge.highlights.0'),
        t('investment.projects.lodge.highlights.1'),
        t('investment.projects.lodge.highlights.2'),
        t('investment.projects.lodge.highlights.3')
      ]
    },
    {
      title: t('investment.projects.solar.title'),
      description: t('investment.projects.solar.description'),
      category: t('investment.projects.solar.category'),
      sector: "infrastructure",
      targetAmount: "$400,000",
      raised: "$280,000",
      progress: 70,
      investors: 412,
      minInvestment: "$250",
      expectedReturn: "8-10% annually",
      timeline: "4-6 years",
      status: t('investment.projects.active'),
      risk: "conservative",
      verified: true,
      highlights: [
        t('investment.projects.solar.highlights.0'),
        t('investment.projects.solar.highlights.1'),
        t('investment.projects.solar.highlights.2'),
        t('investment.projects.solar.highlights.3')
      ]
    },
    {
      title: t('investment.projects.agritech.title'),
      description: t('investment.projects.agritech.description'),
      category: t('investment.projects.agritech.category'),
      sector: "tech",
      targetAmount: "$300,000",
      raised: "$195,000",
      progress: 65,
      investors: 289,
      minInvestment: "$500",
      expectedReturn: "18-22% annually",
      timeline: "3-5 years",
      status: t('investment.projects.active'),
      risk: "aggressive",
      verified: false,
      highlights: [
        t('investment.projects.agritech.highlights.0'),
        t('investment.projects.agritech.highlights.1'),
        t('investment.projects.agritech.highlights.2'),
        t('investment.projects.agritech.highlights.3')
      ]
    }
  ];

  const benefits = [
    {
      icon: Users,
      title: t('investment.benefits.diaspora_network.title'),
      description: t('investment.benefits.diaspora_network.desc')
    },
    {
      icon: TrendingUp,
      title: t('investment.benefits.performance_tracking.title'),
      description: t('investment.benefits.performance_tracking.desc')
    },
    {
      icon: DollarSign,
      title: t('investment.benefits.flexible_investment.title'),
      description: t('investment.benefits.flexible_investment.desc')
    },
    {
      icon: Brain,
      title: t('investment.benefits.onesa_ai.title'),
      description: t('investment.benefits.onesa_ai.desc')
    }
  ];

  const hdcAssociations = t('investment.hdc_associations', { returnObjects: true }) as string[];

  const filteredProjects = projects.filter(project => {
    const sectorMatch = activeFilter === "all" || project.sector === activeFilter;
    const riskMatch = riskFilter === "all" || project.risk === riskFilter;
    return sectorMatch && riskMatch;
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "conservative": return "bg-green-100 text-green-800 border-green-300";
      case "moderate": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "aggressive": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout>
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
                <DollarSign className="h-8 w-8 text-zim-gold" />
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
                <Award className="h-7 w-7 text-zim-green" />
                <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex]?.highlight}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/#investment-projects">
                  <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-zim-black text-lg px-10 h-14 rounded-full font-bold group w-full sm:w-auto">
                    {t('investment.explore_opportunities')}
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-zim-gold hover:bg-zim-gold/90 text-zim-black text-lg px-10 h-14 rounded-full font-bold group w-full sm:w-auto">
                      {t('contact')}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
                    <ContactForm 
                      title={t('investment.contact_form_title')}
                      module="investment"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      <section id="investment-projects" className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t('investment.investment_sectors_title')}</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">{t('investment.investment_sectors_subtitle')}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 mb-12">
            <div className="w-full md:w-1/4">
              <h3 className="font-semibold mb-4">{t('investment.project_filters.sector')}</h3>
              <div className="flex flex-wrap md:flex-col gap-2">
                <Button variant={activeFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('all')} className="justify-start">{t('investment.project_filters.all')}</Button>
                <Button variant={activeFilter === 'tourism' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('tourism')} className="justify-start">{t('investment.project_filters.tourism')}</Button>
                <Button variant={activeFilter === 'agriculture' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('agriculture')} className="justify-start">{t('investment.project_filters.agriculture')}</Button>
                <Button variant={activeFilter === 'manufacturing' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('manufacturing')} className="justify-start">{t('investment.project_filters.manufacturing')}</Button>
                <Button variant={activeFilter === 'tech' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('tech')} className="justify-start">{t('investment.project_filters.tech')}</Button>
                <Button variant={activeFilter === 'infrastructure' ? 'secondary' : 'ghost'} onClick={() => setActiveFilter('infrastructure')} className="justify-start">{t('investment.project_filters.infrastructure')}</Button>
              </div>
              <h3 className="font-semibold mb-4 mt-8">{t('investment.project_filters.risk_level')}</h3>
              <div className="flex flex-wrap md:flex-col gap-2">
                <Button variant={riskFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setRiskFilter('all')} className="justify-start">{t('investment.project_filters.all')}</Button>
                <Button variant={riskFilter === 'conservative' ? 'secondary' : 'ghost'} onClick={() => setRiskFilter('conservative')} className="justify-start">{t('investment.project_filters.conservative')}</Button>
                <Button variant={riskFilter === 'moderate' ? 'secondary' : 'ghost'} onClick={() => setRiskFilter('moderate')} className="justify-start">{t('investment.project_filters.moderate')}</Button>
                <Button variant={riskFilter === 'aggressive' ? 'secondary' : 'ghost'} onClick={() => setRiskFilter('aggressive')} className="justify-start">{t('investment.project_filters.aggressive')}</Button>
              </div>
            </div>

            <div className="w-full md:w-3/4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {filteredProjects.map((project, index) => (
                  <Card key={index} className="flex flex-col justify-between bg-muted/20 border-border/30 hover:border-primary/50 transition-all shadow-sm hover:shadow-lg">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl font-bold pr-4">{project.title}</CardTitle>
                        {project.verified && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 flex-shrink-0">{t('investment.project_card.verified')}</Badge>
                        )}
                      </div>
                      <CardDescription>{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="mb-4">
                        <Progress value={project.progress} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground mt-2">
                          <span>{t('investment.project_card.raised', { amount: project.raised })}</span>
                          <span>{t('investment.project_card.target_amount', { amount: project.targetAmount })}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-muted-foreground">{t('investment.project_card.investors', { count: project.investors })}</p>
                          <p className="font-semibold">{t('investment.project_card.min_investment', { amount: project.minInvestment })}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('investment.project_card.expected_return')}</p>
                          <p className="font-semibold">{project.expectedReturn}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('investment.project_card.timeline')}</p>
                          <p className="font-semibold">{project.timeline}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t('investment.project_card.risk')}</p>
                          <Badge className={`${getRiskColor(project.risk)} text-xs`}>{project.risk}</Badge>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">{t('investment.project_card.highlights')}</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {project.highlights.map((highlight, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-zim-green flex-shrink-0 mt-0.5" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                    <div className="p-6 pt-0">
                      <Button className="w-full bg-primary hover:bg-primary/90">{t('investment.project_card.view_details')}</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-muted/40">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t('investment.benefits_title')}</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto">{t('investment.benefits_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center border-border/30 shadow-sm hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <benefit.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container">
          <Tabs defaultValue="calculator" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:w-1/2 mx-auto h-12">
              <TabsTrigger value="calculator" className="h-10">{t('nav.investment_calculator')}</TabsTrigger>
              <TabsTrigger value="hdc" className="h-10">{t('investment.hdc_title')}</TabsTrigger>
            </TabsList>
            <TabsContent value="calculator" className="mt-8">
              <InvestmentCalculator />
            </TabsContent>
            <TabsContent value="hdc" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>{t('investment.hdc_title')}</CardTitle>
                  <CardDescription>{t('investment.hdc_subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {hdcAssociations.map((item, index) => (
                      <li key={index} className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg">
                        <Award className="h-5 w-5 text-zim-gold" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-4">{t('investment.cta_title')}</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">{t('investment.cta_subtitle')}</p>
          <Link href="/#investment-projects">
            <Button size="lg" variant="secondary" className="font-bold text-lg px-10 h-14 shadow-xl group">
              {t('investment.cta_button')}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}
