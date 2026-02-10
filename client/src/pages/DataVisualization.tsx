import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Users, Globe, Mountain, Plane, Award } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ECONOMIC_DATA, SECTOR_DATA } from "@shared/const";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

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

  const heroSlides = useMemo(() => [
    {
      image: "/images/infrastructure_investment.webp",
      badge: t('data.hero.badge1'),
      badgeIcon: true,
      title: t('data.hero.title1'),
      titleHighlight: t('data.hero.highlight1'),
      subtitle: t('data.hero.subtitle1'),
      description: t('data.hero.desc1'),
      buttons: [
        { text: t('nav.data'), variant: "primary", link: "#indicators" },
        { text: t('export.market_intelligence'), variant: "outline", link: "#sectors" }
      ]
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % 6);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, []);

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
      title: "GDP (2025 Projection)",
      value: `$${(animatedValues.gdp / 1000).toFixed(1)}B`,
      description: "Zimbabwe's Gross Domestic Product",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      change: `+${ECONOMIC_DATA.gdp.growth}% growth rate`
    },
    {
      title: "Diaspora Remittances",
      value: `$${(animatedValues.remittances / 1000).toFixed(1)}B`,
      description: "Annual remittances from Zimbabwean diaspora",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-600/10",
      change: "Largest forex source"
    },
    {
      title: "Total Exports",
      value: `$${(animatedValues.exportValue / 1000).toFixed(1)}B`,
      description: "Total export value (2025)",
      icon: Globe,
      color: "text-blue-600",
      bgColor: "bg-blue-600/10",
      change: "Growing export base"
    },
    {
      title: "Mining Revenue",
      value: `$${(animatedValues.miningRevenue / 1000).toFixed(1)}B`,
      description: "Total mining sector revenue",
      icon: Mountain,
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
      change: "Gold, Lithium, Platinum"
    },
    {
      title: "Global Diaspora",
      value: `${(animatedValues.diasporaPopulation / 1000000).toFixed(1)}M`,
      description: "Zimbabweans living abroad worldwide",
      icon: Users,
      color: "text-red-600",
      bgColor: "bg-red-600/10",
      change: "Across 100+ countries"
    },
    {
      title: "Tourism Revenue",
      value: `$${(animatedValues.tourismRevenue / 1000).toFixed(1)}B`,
      description: "Annual tourism sector revenue",
      icon: Plane,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10",
      change: "Forbes #1 Destination 2025"
    }
  ];

  const regionalBreakdown = [
    { region: "South Africa", population: "1.5 - 2.0 Million", percentage: "43%", flag: "🇿🇦" },
    { region: "United Kingdom", population: "500K - 1.0 Million", percentage: "22%", flag: "🇬🇧" },
    { region: "Botswana", population: "500K+", percentage: "14%", flag: "🇧🇼" },
    { region: "United States", population: "300K - 500K", percentage: "9%", flag: "🇺🇸" },
    { region: "Australia", population: "50K - 100K", percentage: "3%", flag: "🇦🇺" },
    { region: "Canada", population: "50K - 100K", percentage: "2%", flag: "🇨🇦" },
    { region: "Germany", population: "30K - 50K", percentage: "1%", flag: "🇩🇪" },
    { region: "Other Countries", population: "200K+", percentage: "6%", flag: "🌍" }
  ];

  const remittanceImpact = [
    { sector: "Education", percentage: "28%", amount: "$504M", icon: "📚" },
    { sector: "Housing & Construction", percentage: "24%", amount: "$432M", icon: "🏠" },
    { sector: "Healthcare", percentage: "18%", amount: "$324M", icon: "🏥" },
    { sector: "Business Investment", percentage: "17%", amount: "$306M", icon: "💼" },
    { sector: "Food & Basic Needs", percentage: "13%", amount: "$234M", icon: "🛒" }
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
                  <p className="text-lg text-white/90 mb-6 max-w-2xl leading-relaxed">
                    {heroSlides[currentHeroIndex]?.description}
                  </p>
                )}
                {heroSlides[currentHeroIndex]?.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-4 justify-center">
                    {heroSlides[currentHeroIndex]?.buttons.map((button, idx) => (
                      <Button 
                        key={idx}
                        size="lg" 
                        variant={button.variant === "outline" ? "outline" : "default"}
                        className={button.variant === "outline" 
                          ? "text-white border-white hover:bg-white/10 text-lg px-10 h-14 rounded-full font-bold"
                          : "bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-lg px-10 h-14 rounded-full font-bold"
                        }
                        asChild
                      >
                        <a href={button.link}>{button.text}</a>
                      </Button>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Carousel Indicators */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
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

        {/* Key Metrics */}
        <section id="indicators" className="py-16">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Economic Indicators</h2>
              <p className="text-lg text-muted-foreground">
                Zimbabwe's economic performance at a glance
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index} className={`${metric.bgColor} border-l-4 ${metric.color.replace('text-', 'border-l-')} hover:shadow-lg transition-shadow`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {metric.title}
                        </CardTitle>
                        <Icon className={`h-5 w-5 ${metric.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-3xl font-bold">{metric.value}</p>
                        <p className="text-xs text-muted-foreground">{metric.description}</p>
                        <p className={`text-sm font-medium ${metric.color}`}>{metric.change}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* GDP Growth Chart */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">GDP Growth Trajectory</h2>
                <p className="text-lg text-muted-foreground">
                  Zimbabwe's economic growth from 2021 to 2025 projection
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Annual GDP Growth Rate (%)</CardTitle>
                  <CardDescription>Source: World Bank, IMF, ZIMSTAT</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {gdpGrowthData.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-16 text-sm font-semibold">{item.year}</div>
                        <div className="flex-1">
                          <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full flex items-center justify-end pr-3 transition-all duration-1000"
                              style={{ width: `${(item.growth / 10) * 100}%` }}
                            >
                              <span className="text-sm font-bold text-white">{item.growth}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Mining Sector Breakdown */}
        <section id="sectors" className="py-16">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Mining Sector Breakdown</h2>
                <p className="text-lg text-muted-foreground">
                  Zimbabwe's mineral wealth contributing $5.56B to the economy
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {SECTOR_DATA.mining.map((mineral, index) => (
                  <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{mineral.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold text-primary">{mineral.value}%</p>
                        <p className="text-xs text-muted-foreground">Contribution</p>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm font-semibold">${mineral.revenue}B</p>
                          <p className="text-[10px] text-muted-foreground">Revenue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Diaspora Remittances Impact */}
        <section className="py-16 bg-primary text-white">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-secondary text-secondary-foreground">Social Impact</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Diaspora Remittance Allocation</h2>
                <p className="text-lg opacity-90 mb-8">
                  Remittances are more than just financial transfers; they are vital lifelines that drive development across key social and economic sectors in Zimbabwe.
                </p>
                <div className="space-y-6">
                  {remittanceImpact.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span>{item.icon}</span> {item.sector}
                        </span>
                        <span>{item.percentage} ({item.amount})</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-secondary h-full rounded-full" 
                          style={{ width: item.percentage }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white/10 border-white/20 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-4xl font-bold text-secondary">$1.8B</CardTitle>
                    <CardDescription className="text-white/70">Annual Remittances</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-4xl font-bold text-secondary">3.5M</CardTitle>
                    <CardDescription className="text-white/70">Global Diaspora</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-4xl font-bold text-secondary">$500M</CardTitle>
                    <CardDescription className="text-white/70">Annual Investment Potential</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Global Diaspora Distribution */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Global Diaspora Distribution</h2>
                <p className="text-lg text-muted-foreground">
                  Where the Zimbabwean diaspora resides across the globe
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-4 font-semibold">Region/Country</th>
                      <th className="p-4 font-semibold">Estimated Population</th>
                      <th className="p-4 font-semibold text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {regionalBreakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4 flex items-center gap-3">
                          <span className="text-xl">{item.flag}</span>
                          <span className="font-medium">{item.region}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">{item.population}</td>
                        <td className="p-4 text-right font-bold text-primary">{item.percentage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources Disclaimer */}
        <section className="py-12 bg-muted/30">
          <div className="container text-center">
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto italic">
              * The data presented in this dashboard are projections and estimates based on 2024-2025 economic reports from the Reserve Bank of Zimbabwe (RBZ), ZIMSTAT, World Bank, and IMF. Real-time metrics are updated periodically as new official data becomes available.
            </p>
          </div>
        </section>
      </div>
    </Layout>
  );
}
