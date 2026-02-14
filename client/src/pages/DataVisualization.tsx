import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Users, Globe, Mountain, Plane, Award, Activity, BarChart3, Factory } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ECONOMIC_DATA, SECTOR_DATA } from "@shared/const";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Label } from "recharts";

interface EconomicData {
  remittances: number;
  gdp: number;
  diasporaPopulation: number;
  exportValue: number;
  miningRevenue: number;
  tourismRevenue: number;
  manufacturingRevenue: number;
  agriculturalExports: number;
  growthRate: number;
  year: number;
}

export default function DataVisualization() {
  const { t } = useTranslation();
  
  // Initialize state with default data from shared constants
  const [data, setData] = useState<EconomicData>({
    remittances: ECONOMIC_DATA.diaspora.remittances * 1000,
    gdp: ECONOMIC_DATA.gdp.value * 1000,
    diasporaPopulation: ECONOMIC_DATA.diaspora.population * 1000000,
    exportValue: ECONOMIC_DATA.trade.totalExports * 1000,
    miningRevenue: ECONOMIC_DATA.mining.totalRevenue * 1000,
    tourismRevenue: ECONOMIC_DATA.services.tourismRevenue * 1000,
    manufacturingRevenue: ECONOMIC_DATA.manufacturing?.gdpContribution
      ? ECONOMIC_DATA.manufacturing.gdpContribution * 1000
      : 0,
    agriculturalExports: ECONOMIC_DATA.agriculture
      ? (
          (ECONOMIC_DATA.agriculture.tobaccoExports || 0) +
          (ECONOMIC_DATA.agriculture.horticultureExports || 0)
        ) * 1000
      : 0,
    growthRate: ECONOMIC_DATA.gdp.growth,
    year: 2025
  });

  const [animatedValues, setAnimatedValues] = useState({
    remittances: 0,
    gdp: 0,
    diasporaPopulation: 0,
    exportValue: 0,
    miningRevenue: 0,
    tourismRevenue: 0,
    manufacturingRevenue: 0,
    agriculturalExports: 0,
    growthRate: 0
  });

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Fetch Live Data from Server API
  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const response = await fetch('/api/economic-stats');
        const liveData = await response.json();
        
        setData(prev => ({
          ...prev,
          remittances: liveData.remittances,
          gdp: liveData.gdp,
          diasporaPopulation: liveData.diasporaPopulation,
          exportValue: liveData.exportValue,
          miningRevenue: liveData.miningRevenue ?? prev.miningRevenue,
          tourismRevenue: liveData.tourismRevenue ?? prev.tourismRevenue,
          manufacturingRevenue: liveData.manufacturingRevenue ?? prev.manufacturingRevenue,
          agriculturalExports: liveData.agriculturalExports ?? prev.agriculturalExports,
          growthRate: liveData.growthRate,
        }));
      } catch (error) {
        console.error("Failed to fetch live economic data:", error);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  // Hero carousel timer
  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, []);

  // Counter animation logic
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
        tourismRevenue: Math.floor(data.tourismRevenue * progress),
        manufacturingRevenue: Math.floor(data.manufacturingRevenue * progress),
        agriculturalExports: Math.floor(data.agriculturalExports * progress),
        growthRate: Number((data.growthRate * progress).toFixed(1))
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedValues({
          remittances: data.remittances,
          gdp: data.gdp,
          diasporaPopulation: data.diasporaPopulation,
          exportValue: data.exportValue,
          miningRevenue: data.miningRevenue,
          tourismRevenue: data.tourismRevenue,
          manufacturingRevenue: data.manufacturingRevenue,
          agriculturalExports: data.agriculturalExports,
          growthRate: data.growthRate
        });
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [data]);

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
        { text: t('data.hero.economic_data'), variant: "primary", link: "#indicators" },
        { text: t('data.hero.sector'), variant: "outline", link: "#sectors" }
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

  const metrics = [
    {
      title: t('data.overview.gdp.title'),
      value: `$${(animatedValues.gdp / 1000).toFixed(1)}B`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/5",
      change: `+${data.growthRate}% ${t('data.overview.gdp.subtitle')}`,
    },
    {
      title: t('data.overview.gdp_growth.title'),
      value: `${animatedValues.growthRate}%`,
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-600/5",
      change: "Real-time Feed",
      isLive: true
    },
    {
      title: t('data.overview.remittances.title'),
      value: `$${(animatedValues.remittances / 1000).toFixed(1)}B`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-600/5",
      change: t('data.overview.remittances.subtitle')
    },
    {
      title: t('data.overview.total_exports.title'),
      value: `$${(animatedValues.exportValue / 1000).toFixed(1)}B`,
      icon: Globe,
      color: "text-blue-600",
      bgColor: "bg-blue-600/5",
      change: t('data.overview.total_exports.subtitle')
    },
        {
      title: t('data.overview.manufacturing.title'),
      value: `$${(animatedValues.manufacturingRevenue / 1000).toFixed(1)}B`,
      icon: Factory,
      color: "text-amber-600",
      bgColor: "bg-amber-600/5",
      change: t('data.overview.manufacturing.subtitle')
    },
    {
      title: t('data.overview.mining.title'),
      value: `$${(animatedValues.miningRevenue / 1000).toFixed(1)}B`,
      icon: Mountain,
      color: "text-amber-600",
      bgColor: "bg-amber-600/5",
      change: t('data.overview.mining.subtitle')
    },
    {
      title: t('data.overview.agriculture.title'),
      value: `$${(animatedValues.agriculturalExports / 1000).toFixed(1)}B`,
      icon: Users,
      color: "text-red-600",
      bgColor: "bg-red-600/5",
      change: t('data.overview.agriculture.subtitle')
    },
    {
      title: t('data.overview.tourism.title'),
      value: `$${(animatedValues.tourismRevenue / 1000).toFixed(1)}B`,
      icon: Plane,
      color: "text-purple-600",
      bgColor: "bg-purple-600/5",
      change: t('data.overview.tourism.subtitle')
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
    { sector: t('data.education'), percentage: "28%", amount: "$504M", icon: "📚" }, // "Education"
    { sector: t('data.housing'), percentage: "24%", amount: "$432M", icon: "🏠" }, //Housing & Construction"
    { sector: t('data.health_care'), percentage: "18%", amount: "$324M", icon: "🏥" }, //Healthcare
    { sector: t('data.business_investment'), percentage: "17%", amount: "$306M", icon: "💼" }, //"Business Investment"
    { sector: t('data.food'), percentage: "13%", amount: "$234M", icon: "🛒" } //"Food & Basic Needs"
  ];

  // Add this before the return statement to define gdpGrowthData
  const gdpGrowthData = SECTOR_DATA.gdpGrowth || [];

  // Pie chart data for sectoral GDP growth
  const pieData = (SECTOR_DATA.gdpGrowth || []).map(sector => ({
    name: sector.year, // Use 'year' if 'sector' does not exist
    value: sector.growth
  }));

  // Pie chart colors
  const COLORS = [
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
    "#A020F0", "#FF6384", "#36A2EB", "#FFCE56"
  ];

  // Custom label renderer for PieChart
  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, index
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    index: number;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#333"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
      >
        {`${pieData[index]?.name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
         
{/* Hero Carousel Section - Left Aligned with Left-to-Right Animation */}
        <section className="relative h-[600px] flex items-center overflow-hidden">
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
              <div className="absolute inset-0 bg-gradient-to-r from-zim-black/80 via-zim-black/40 to-transparent" />
            </motion.div>
          </AnimatePresence>
          
          <div className="relative z-10 container text-white px-6 md:px-12">
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={`content-${currentHeroIndex}`}
                // Starts from the left (-100)
                initial={{ x: -100, opacity: 0 }} 
                // Moves to natural position
                animate={{ x: 0, opacity: 1 }}
                // Exits to the right (100)
                exit={{ x: 100, opacity: 0 }} 
                transition={{ duration: 0.6, ease: "easeOut" }}
                // Forced Left Alignment for ALL slides
                className="text-left max-w-3xl flex flex-col items-start" 
              >
                <div className="flex items-center justify-start gap-3 mb-6">
                  {heroSlides[currentHeroIndex]?.badgeIcon && <Award className="h-10 w-10 text-zim-gold" />}
                  <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest border-none">
                    {heroSlides[currentHeroIndex]?.badge}
                  </Badge>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                  {heroSlides[currentHeroIndex]?.title}
                  {heroSlides[currentHeroIndex]?.titleHighlight && (
                    <span className="text-zim-gold italic ml-2">{heroSlides[currentHeroIndex]?.titleHighlight}</span>
                  )}
                </h1>

                <p className="text-xl md:text-2xl mb-4 text-zim-gold leading-relaxed font-medium">
                  {heroSlides[currentHeroIndex]?.subtitle}
                </p>

                {heroSlides[currentHeroIndex]?.description && (
                  <p className="text-lg text-white/90 mb-6 max-w-2xl leading-relaxed">
                    {heroSlides[currentHeroIndex]?.description}
                  </p>
                )}

                {heroSlides[currentHeroIndex]?.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-4 justify-start">
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
          
          {/* Indicators positioned at the bottom left */}
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

      {/* Datavisualization Introduction */}
      <section id="data-info" className="py-0 bg-background relative overflow-hidden">
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
              <BarChart3 className="h-8 w-8 text-zim-gold mx-auto mb-1" />
                
                <h3 className="text-lg md:text-xl font-bold text-white leading-snug px-4">
                  {t('data.objective_subtitle')}
                </h3>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-zim-gold/50" />
                  
                  <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                    {t('data.objective_title')}
                  </p>
                  
                  <div className="h-px w-8 bg-zim-gold/50" />
                </div>
              </div>
            </motion.div>
                    
          </div>
        </div>
      </section>

      {/* Small Key Indicators Section */}
        <section id="indicators" className="py-12">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('data.overview_title')}</h2> 
              <p className="text-sm text-muted-foreground">{t('data.overview_subtitle')}</p>
            </div>
            
            {/* grid-cols-2 for mobile, md:grid-cols-3 for tablets, lg:grid-cols-4 for desktop */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index} className={`${metric.bgColor} border-none shadow-sm hover:shadow-md transition-all p-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-md ${metric.bgColor} ${metric.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                        {metric.title}
                      </span>
                    </div>
                    <div className="relative">
                      <p className="text-lg font-bold tracking-tight">{metric.value}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-semibold ${metric.color}`}>
                          {metric.change}
                        </span>
                        {metric.isLive && (
                          <span className="flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* GDP Growth Trajectory */}
        <section className=" bg-muted/30">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('data.gdp_growth_trajectory')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('data.gdp_growth_history')}
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('data.gdp_growth_rate')}</CardTitle>
                  <CardDescription>{t('data.gdp_data_source')} </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {SECTOR_DATA.gdpGrowth.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-16 text-sm font-semibold">{item.year}</div>
                        <div className="flex-1">
                          <div className="w-full bg-muted rounded-full h-8 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(item.growth / 10) * 100}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                              className="h-full bg-primary rounded-full flex items-center justify-end pr-3 transition-all duration-1000"
                            >
                              <span className="text-sm font-bold text-white">{item.growth}%</span>
                            </motion.div>
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
        <section id="sectors" className="py-10">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('data.sectoral_data_mining_title')}</h2>
                <p className="text-lg text-muted-foreground">
                  {t('data.sectoral_data_mining_subtitle')}
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
                        <p className="text-xs text-muted-foreground">{t('data.sectoral_data_mining_contribution')}</p>
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-sm font-semibold">${mineral.revenue}B</p>
                          <p className="text-[10px] text-muted-foreground">{t('data.sectoral_data_mining_revenue')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

{/* Sectoral Data & Trends Section */}
        <section id="sectors" className="py-16 bg-muted/30 scroll-mt-24">
          <div className="container">
            <div className="text-center mb-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">{t('data.sectoral_data_title')}</h2> 
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                {t('data.sectoral_data_breakdown')} 
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Column: Progress Bars */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold mb-6"> {t('data.sectoral_data_projections')} ({data.year})</h3> 
                {SECTOR_DATA.gdpGrowth.map((sector, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-muted-foreground">{sector.year}</span>
                      <span className="text-zim-green">+{sector.growth}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(sector.growth / 10) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="bg-zim-green h-3 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Donut Chart with Visible Labels */}
              <div className="h-[450px] w-full bg-white p-6 rounded-2xl shadow-xl border border-gray-100 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      // Labels outside the chart with connector lines
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      {/* Central Label inside the donut hole */}
                      <Label 
                        value="GDP 2026" 
                        position="center" 
                        fill="#1a1a1a" 
                        style={{ fontSize: '18px', fontWeight: 'bold' }} 
                      />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px rgba(0,0,0,0.1)' }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-bold text-gray-600 uppercase">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Diaspora Remittances Impact */}
        <section id="remittance-impact" className="py-12 bg-slate-900 text-white relative scroll-mt-24 rounded-2xl mx-4 md:mx-0">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4 bg-secondary text-secondary-foreground">{t('data.diaspora_remittance_impact_badge')}</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('data.diaspora_remittance_impact_title')}</h2>
                <p className="text-lg opacity-90 mb-8">
                  {t('data.diaspora_remittance_impact_subtitle')}
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
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: item.percentage }}
                          className="bg-secondary h-full rounded-full" 
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
                    <CardDescription className="text-white/70">{t('data.diaspora_remittance_value')} </CardDescription>
                  </CardHeader>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-4xl font-bold text-secondary">3.5M</CardTitle>
                    <CardDescription className="text-white/70">{t('data.diaspora_number_value')}</CardDescription>
                  </CardHeader>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-4xl font-bold text-secondary">$500M</CardTitle>
                    <CardDescription className="text-white/70">{t('data.diaspora_investment_potential')}</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </section>

      {/* Global Diaspora Distribution - Reduced Size by 20% */}
        <section className="py-12">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('data.diaspora_distribution')}</h2>
                <p className="text-base text-muted-foreground">{t('data.diaspora_residence')}</p>
              </div>
              <div className="overflow-hidden rounded-lg border shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-3 font-semibold">{t('data.diaspora_residence_country')}</th>
                      <th className="p-3 font-semibold">{t('data.diaspora_population')}</th>
                      <th className="p-3 font-semibold text-right">{t('data.diaspora_percentage')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {regionalBreakdown.map((item, index) => (
                      <tr key={index} className="hover:bg-muted/50 transition-colors">
                        <td className="p-3 flex items-center gap-2">
                          <span className="text-lg">{item.flag}</span>
                          <span className="font-medium">{item.region}</span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{item.population}</td>
                        <td className="p-3 text-right font-bold text-primary">{item.percentage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className=" bg-muted/30">
          <div className="container text-center text-sm text-muted-foreground italic max-w-2xl mx-auto">
            {t('data.data_disclaimer')}
          </div>
        </section>
      </div>
    </Layout>
  );
}