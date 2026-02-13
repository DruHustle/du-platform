import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Users, Globe, Mountain, Plane, Award, ArrowRight } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ECONOMIC_DATA, SECTOR_DATA } from "@shared/const";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import ContactForm from "@/components/ContactForm";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface EconomicData {
  remittances: number;
  gdp: number;
  diasporaPopulation: number;
  exportValue: number;
  miningRevenue: number;
  tourismRevenue: number;
  year: number;
}

export default function DataVisualization() {
  const { t } = useTranslation();
  const [data] = useState<EconomicData>({
    remittances: ECONOMIC_DATA.diaspora.remittances * 1000, // Convert to Million USD
    gdp: ECONOMIC_DATA.gdp.value * 1000, // Convert to Million USD
    diasporaPopulation: ECONOMIC_DATA.diaspora.population * 1000000,
    exportValue: ECONOMIC_DATA.trade.totalExports * 1000,
    miningRevenue: ECONOMIC_DATA.mining.totalRevenue * 1000,
    tourismRevenue: ECONOMIC_DATA.services.tourismRevenue * 1000,
    year: 2025
  });

  const [animatedValues, setAnimatedValues] = useState({
    remittances: 0,
    gdp: 0,
    diasporaPopulation: 0,
    exportValue: 0,
    miningRevenue: 0,
    tourismRevenue: 0
  });

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const heroSlides = useMemo(() => [
    {
      image: "/images/infrastructure_investment.png",
      badge: t('data.hero.badge1'),
      badgeIcon: true,
      title: t('data.hero.title1'),
      titleHighlight: t('data.hero.highlight1'),
      subtitle: t('data.hero.subtitle1'),
      description: t('data.hero.desc1'),
      buttons: [
        { text: t('nav.data'), variant: "primary", link: "#indicators" },
        { text: t('export.market_intelligence_btn'), variant: "outline", link: "#sectors" }
      ]
    },
    {
      image: "/images/remittances_impact.png",
      badge: t('data.hero.badge2'),
      badgeIcon: true,
      title: t('data.hero.title2'),
      titleHighlight: t('data.hero.highlight2'),
      subtitle: t('data.hero.subtitle2'),
      description: t('data.hero.desc2'),
      buttons: []
    },
    {
      image: "/images/diaspora_investment.jpg",
      badge: t('data.hero.badge3'),
      badgeIcon: true,
      title: t('data.hero.title3'),
      titleHighlight: t('data.hero.highlight3'),
      subtitle: t('data.hero.subtitle3'),
      description: "",
      buttons: []
    },
    {
      image: "/images/export_hub_bg.jpg",
      badge: t('data.hero.badge4'),
      badgeIcon: true,
      title: t('data.hero.title4'),
      titleHighlight: t('data.hero.highlight4'),
      subtitle: t('data.hero.subtitle4'),
      description: "",
      buttons: []
    },
    {
      image: "/images/rbz_building.png",
      badge: t('data.hero.badge5'),
      badgeIcon: true,
      title: t('data.hero.title5'),
      titleHighlight: t('data.hero.highlight5'),
      subtitle: t('data.hero.subtitle5'),
      description: "",
      buttons: []
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  // Animate counter on mount
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setAnimatedValues({
        remittances: Math.floor(data.remittances * progress),
        gdp: Math.floor(data.gdp * progress),
        diasporaPopulation: Math.floor(data.diasporaPopulation * progress),
        exportValue: Math.floor(data.exportValue * progress),
        miningRevenue: Math.floor(data.miningRevenue * progress),
        tourismRevenue: Math.floor(data.tourismRevenue * progress)
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedValues({
          remittances: data.remittances,
          gdp: data.gdp,
          diasporaPopulation: data.diasporaPopulation,
          exportValue: data.exportValue,
          miningRevenue: data.miningRevenue,
          tourismRevenue: data.tourismRevenue
        });
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [data]);

  const metrics = [
    {
      title: t("data.overview.gdp_growth.title"),
      value: `$${(animatedValues.gdp / 1000).toFixed(1)}B`,
      description: t("data.overview.gdp_growth.description"),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      change: t("data.overview.gdp_growth.change", { growth: ECONOMIC_DATA.gdp.growth }),
    },
    {
      title: t("data.overview.remittances.title"),
      value: `$${(animatedValues.remittances / 1000).toFixed(1)}B`,
      description: t("data.overview.remittances.description"),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-600/10",
      change: t("data.overview.remittances.change"),
    },
    {
      title: t("data.overview.exports.title"),
      value: `$${(animatedValues.exportValue / 1000).toFixed(1)}B`,
      description: t("data.overview.exports.description"),
      icon: Globe,
      color: "text-blue-600",
      bgColor: "bg-blue-600/10",
      change: t("data.overview.exports.change"),
    },
    {
      title: t("data.overview.mining_revenue.title"),
      value: `$${(animatedValues.miningRevenue / 1000).toFixed(1)}B`,
      description: t("data.overview.mining_revenue.description"),
      icon: Mountain,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
      change: t("data.overview.mining_revenue.change"),
    },
    {
      title: t("data.overview.global_diaspora.title"),
      value: `${(animatedValues.diasporaPopulation / 1000000).toFixed(1)}M`,
      description: t("data.overview.global_diaspora.description"),
      icon: Users,
      color: "text-red-600",
      bgColor: "bg-red-600/10",
      change: t("data.overview.global_diaspora.change"),
    },
    {
      title: t("data.overview.tourism_revenue.title"),
      value: `$${(animatedValues.tourismRevenue / 1000).toFixed(1)}B`,
      description: t("data.overview.tourism_revenue.description"),
      icon: Plane,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
      change: t("data.overview.tourism_revenue.change")
    }
  ];

  const regionalBreakdown = [
    { region: t("data.regional_breakdown.south_africa.region"), population: t("data.regional_breakdown.south_africa.population"), percentage: "43%", flag: "🇿🇦" },
    { region: t("data.regional_breakdown.united_kingdom.region"), population: t("data.regional_breakdown.united_kingdom.population"), percentage: "22%", flag: "🇬🇧" },
    { region: t("data.regional_breakdown.botswana.region"), population: t("data.regional_breakdown.botswana.population"), percentage: "14%", flag: "🇧🇼" },
    { region: t("data.regional_breakdown.united_states.region"), population: t("data.regional_breakdown.united_states.population"), percentage: "9%", flag: "🇺🇸" },
    { region: t("data.regional_breakdown.australia.region"), population: t("data.regional_breakdown.australia.population"), percentage: "3%", flag: "🇦🇺" },
    { region: t("data.regional_breakdown.canada.region"), population: t("data.regional_breakdown.canada.population"), percentage: "2%", flag: "🇨🇦" },
    { region: t("data.regional_breakdown.germany.region"), population: t("data.regional_breakdown.germany.population"), percentage: "1%", flag: "🇩🇪" },
    { region: t("data.regional_breakdown.other_countries.region"), population: t("data.regional_breakdown.other_countries.population"), percentage: "6%", flag: "🌍" }
  ];

  const remittanceImpact = [
    { sector: t("data.remittance_impact.education.sector"), percentage: "28%", amount: "$504M", icon: "📚" },
    { sector: t("data.remittance_impact.housing_construction.sector"), percentage: "24%", amount: "$432M", icon: "🏠" },
    { sector: t("data.remittance_impact.healthcare.sector"), percentage: "18%", amount: "$324M", icon: "🏥" },
    { sector: t("data.remittance_impact.business_investment.sector"), percentage: "17%", amount: "$306M", icon: "💼" },
    { sector: t("data.remittance_impact.food_basic_needs.sector"), percentage: "13%", amount: "$234M", icon: "🛒" }
  ];

  const gdpGrowthData = SECTOR_DATA.gdpGrowth;

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
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
              <div className="absolute inset-0 bg-gradient-to-b from-zim-black/60 via-zim-black/40 to-zim-black/80" />
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
                className={currentHeroIndex === 0 ? "text-center flex flex-col items-center" : "text-left max-w-3xl"}
              >
                <div className={currentHeroIndex === 0 ? "flex items-center justify-center gap-3 mb-8" : "mb-6"}>
                  {heroSlides[currentHeroIndex]?.badgeIcon && <Award className="h-10 w-10 text-zim-gold" />}
                  <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                    {heroSlides[currentHeroIndex]?.badge}
                  </Badge>
                </div>
                <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                  {heroSlides[currentHeroIndex]?.title}
                  {heroSlides[currentHeroIndex]?.titleHighlight && (
                    <span className="text-zim-gold italic">{heroSlides[currentHeroIndex]?.titleHighlight}</span>
                  )}
                </h1>
                <p className={`text-xl md:text-2xl mb-4 ${currentHeroIndex === 0 ? 'max-w-3xl mx-auto text-white/90' : 'text-zim-gold'} leading-relaxed font-medium`}>
                  {heroSlides[currentHeroIndex]?.subtitle}
                </p>
                {heroSlides[currentHeroIndex]?.description && (
                  <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                    {heroSlides[currentHeroIndex]?.description}
                  </p>
                )}
                <div className="flex gap-4 justify-center">
                  {heroSlides[currentHeroIndex]?.buttons.map((button, btnIdx) => (
                    <Button key={btnIdx} size="lg" variant={button.variant === "primary" ? "default" : (button.variant as any)}>
                      {button.text}
                    </Button>
                  ))}
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

        {/* Economic Overview Section */}
        <section id="indicators" className="py-20 scroll-mt-24">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                {t("data.economic_overview_badge")}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("data.data_overview_title")}</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("data.data_overview_subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader>
                      <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${metric.bgColor}`}>
                        <Icon className={`h-8 w-8 ${metric.color}`} />
                      </div>
                      <CardTitle className="text-3xl font-bold">{metric.value}</CardTitle>
                      <CardDescription className="text-lg">{metric.title}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{metric.description}</p>
                      <Badge variant="secondary" className="text-xs">{metric.change}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sectoral Data & Trends Section */}
        <section id="sectors" className="py-20 bg-muted/30 scroll-mt-24">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                {t("data.sectoral_data_badge")}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("data.sectoral_data_title")}</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("data.sectoral_data_subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6">GDP Growth by Sector ({data.year})</h3>
                <div className="space-y-4">
                  {gdpGrowthData.map((sector, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-right text-sm font-medium text-muted-foreground">{(sector as any).sector || (sector as any).name || "Sector"}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-zim-green h-4 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${sector.growth}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-left text-sm font-bold text-zim-green">{sector.growth}%</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <img 
                  src="/images/gdp_growth_chart.png" 
                  alt="GDP Growth by Sector Chart" 
                  className="rounded-lg shadow-xl border border-gray-200"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Diaspora Economic Impact Section */}
        <section id="diaspora-impact" className="py-20 scroll-mt-24">
          <div className="container">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                {t("data.diaspora_impact_badge")}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("data.diaspora_impact_title")}</h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("data.diaspora_impact_subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h3 className="text-3xl font-bold mb-6">{t("data.regional_breakdown_title")}</h3>
                <p className="text-muted-foreground mb-8">{t("data.regional_breakdown_subtitle")}</p>
                <div className="space-y-3">
                  {regionalBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm">
                      <span className="text-lg font-medium flex items-center gap-2">{item.flag} {item.region}</span>
                      <span className="text-muted-foreground">{item.population} ({item.percentage})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-6">{t("data.remittance_impact_title")}</h3>
                <p className="text-muted-foreground mb-8">{t("data.remittance_impact_subtitle")}</p>
                <div className="space-y-3">
                  {remittanceImpact.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm">
                      <span className="text-lg font-medium flex items-center gap-2">{item.icon} {item.sector}</span>
                      <span className="text-muted-foreground">{item.percentage} ({item.amount})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-4xl font-bold mb-4">{t("data.cta_title")}</h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">{t("data.cta_subtitle")}</p>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button size="lg" variant="secondary" className="font-bold text-lg px-10 h-14 shadow-xl group">
                  {t("data.cta_button")}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
              <ContactForm 
                title={t("data.cta_button")}
                module="investment"
              />
              </DialogContent>
            </Dialog>
          </div>
        </section>
      </div>
    </Layout>
  );
}
