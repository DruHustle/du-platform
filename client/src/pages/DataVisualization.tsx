import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Users, Globe, Mountain, Plane, Award, Activity, BarChart3, Factory, Coins, Wallet, Handshake, Currency, BarChart } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ECONOMIC_DATA, SECTOR_DATA } from "@shared/const";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Label } from "recharts";
import SubPageHero from "@/components/SubPageHero";

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
      badgeIcon: Coins,
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
      badgeIcon: Wallet,
      title: t('data.hero.title2'),
      titleHighlight: t('data.hero.highlight2'),
      subtitle: t('data.hero.subtitle2'),
      description: t('data.hero.desc2'),
      buttons: []
    },
    {
      image: "/images/diaspora_investment.jpg",
      badge: t('data.hero.badge3'),
      badgeIcon: TrendingUp,
      title: t('data.hero.title3'),
      titleHighlight: t('data.hero.highlight3'),
      subtitle: t('data.hero.subtitle3'),
      description: "",
      buttons: []
    },
    {
      image: "/images/export_hub_bg.jpg",
      badge: t('data.hero.badge4'),
      badgeIcon: Handshake,
      title: t('data.hero.title4'),
      titleHighlight: t('data.hero.highlight4'),
      subtitle: t('data.hero.subtitle4'),
      description: "",
      buttons: []
    },
    {
      image: "/images/rbz_building.png",
      badge: t('data.hero.badge5'),
      badgeIcon: Currency,
      title: t('data.hero.title5'),
      titleHighlight: t('data.hero.highlight5'),
      subtitle: t('data.hero.subtitle5'),
      description: "",
      buttons: []
    }
  ], [t]);

  const introData = {
  icon: BarChart3, // 
  title:   t('data.objective_title'),
  description:   t('data.objective_subtitle')
};

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

      {/* Hero Section */}
      <section id="hero" >
        <SubPageHero 
          heroSlides={heroSlides} 
          intro={introData} 
          />
      </section>

     {/* Key Indicators - Glassy Dashboard Grid */}
      <section id="indicators" className="pt-10 pb-12 bg-slate-950 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t('data.overview_title')}</h2>
            <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('data.overview_subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <motion.div 
                  key={index}
                  whileHover={{ y: -5 }}
                  className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500`}
                >
                  <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl bg-white/5 ${metric.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest truncate">
                      {metric.title}
                    </span>
                  </div>
                  <div className="relative">
                    <p className="text-2xl font-black text-white tracking-tighter">{metric.value}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold ${metric.color}`}>
                        {metric.change}
                      </span>
                      {metric.isLive && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GDP Growth Trajectory - Animated Ice Bars */}
      
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t('data.gdp_growth_trajectory')}</h2>
              <p className="text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('data.gdp_growth_history')}</p>
            </div>

            <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-white/[0.02] backdrop-blur-3xl p-10 md:p-16 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
              <span className="absolute inset-0 rounded-[3rem] border border-white/5 pointer-events-none" />
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h3 className="text-xl font-bold text-white">{t('data.gdp_growth_rate')}</h3>
                  <p className="text-xs text-white/30 uppercase tracking-widest mt-1">{t('data.gdp_data_source')}</p>
                </div>
                <TrendingUp className="text-zim-gold h-6 w-6 opacity-50" />
              </div>
              
              <div className="space-y-6">
                {SECTOR_DATA.gdpGrowth.map((item, index) => (
                  <div key={index} className="flex items-center gap-6 group">
                    <div className="w-16 text-[11px] font-black text-white/40 uppercase tracking-widest">{item.year}</div>
                    <div className="flex-1">
                      <div className="w-full bg-white/5 rounded-full h-10 overflow-hidden border border-white/5 relative">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${(item.growth / 10) * 100}%` }}
                          transition={{ duration: 1.5, ease: "circOut", delay: index * 0.1 }}
                          className="h-full bg-gradient-to-r from-zim-gold/40 to-zim-gold rounded-full flex items-center justify-end pr-4 transition-all"
                        >
                          <span className="text-[11px] font-black text-zim-black">{item.growth}%</span>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mining Sector - Detailed Glass Tiles */}
      <section id="sectors" className="py-10 bg-slate-950 relative">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t('data.sectoral_data_mining_title')}</h2>
              <p className="text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('data.sectoral_data_mining_subtitle')}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {SECTOR_DATA.mining.map((mineral, index) => (
                <motion.div 
                  key={index} 
                  whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.06)' }}
                  className="relative text-center p-8 rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl transition-all duration-500 group"
                >
                  <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black text-white/40 uppercase tracking-widest">{mineral.name}</h3>
                    <p className="text-3xl font-black text-zim-gold tracking-tighter group-hover:scale-110 transition-transform">{mineral.value}%</p>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{t('data.sectoral_data_mining_contribution')}</p>
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-lg font-black text-white">${mineral.revenue}B</p>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{t('data.sectoral_data_mining_revenue')}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GDP Composition - Glass Donut Terminal */}
      
      <section id="sectors" className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t('data.sectoral_data_title')}</h2> 
            <p className="text-base text-white/50 max-w-3xl mx-auto font-light leading-relaxed">{t('data.sectoral_data_breakdown')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            {/* Projections List */}
            <div className="space-y-8">
              <h3 className="text-[12px] font-black text-zim-gold uppercase tracking-[0.4em] mb-10 border-l-2 border-zim-gold/30 pl-4">
                {t('data.sectoral_data_projections')} ({data.year})
              </h3> 
              {SECTOR_DATA.gdpGrowth.map((sector, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                    <span className="text-white/40">{sector.year}</span>
                    <span className="text-zim-gold">+{sector.growth}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(sector.growth / 10) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="bg-zim-gold h-full rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Cinematic Donut Chart */}
            <div className="relative p-1 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent">
              <div className="h-[500px] w-full bg-slate-950/40 backdrop-blur-3xl p-10 rounded-[2.9rem] relative overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={120}
                      paddingAngle={8}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none stroke-slate-900 stroke-2" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} 
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">GDP</p>
                  <p className="text-2xl font-black text-white">2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Remittances - High-End Financial Panel */}
      <section id="remittance-impact" className="py-10 bg-slate-950 relative overflow-hidden px-6">
        <div className="container max-w-6xl mx-auto relative z-10 py-20 px-10 md:px-16 rounded-[4rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-[0_40px_80px_rgba(0,0,0,0.5)]">
          <span className="absolute inset-0 rounded-[4rem] border border-white/5 pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8">
              <Badge className="bg-zim-gold/10 text-zim-gold border-zim-gold/20 text-[10px] font-black uppercase tracking-widest px-4 py-1.5">
                {t('data.diaspora_remittance_impact_badge')}
              </Badge>
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                {t('data.diaspora_remittance_impact_title')}
              </h2>
              <p className="text-base text-white/50 font-light leading-relaxed">
                {t('data.diaspora_remittance_impact_subtitle')}
              </p>
              
              <div className="space-y-6 pt-6">
                {remittanceImpact.map((item, index) => (
                  <div key={index} className="space-y-3 group">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-3 text-white/60">
                        <span className="p-1.5 bg-white/5 rounded-lg group-hover:text-zim-gold transition-colors">{item.icon}</span> {item.sector}
                      </span>
                      <span className="text-white">{item.percentage} <span className="text-white/30 ml-2 font-light">({item.amount})</span></span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: item.percentage }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className="bg-zim-gold h-full rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { label: t('data.diaspora_remittance_value'), val: "$1.8B", highlight: true },
                { label: t('data.diaspora_number_value'), val: "3.5M" },
                { label: t('data.diaspora_investment_potential'), val: "$500M", span: true }
              ].map((stat, i) => (
                <div key={i} className={`p-8 rounded-[2.5rem] border border-white/10 bg-white/5 transition-all hover:bg-white/10 ${stat.span ? 'col-span-2' : ''}`}>
                  <p className="text-4xl font-black text-zim-gold tracking-tighter mb-2">{stat.val}</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-snug">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
{/* Global Diaspora Distribution - Animated Glass Table */}
      <section className="pt-10 pb-24 bg-slate-950 relative overflow-hidden">
        {/* Subtle bottom-right glow for table depth */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-zim-gold/[0.02] blur-[120px] rounded-full pointer-events-none" />

        <div className="container px-6 mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="text-3xl font-black text-white tracking-tighter"
              >
                {t('data.diaspora_distribution')}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-white/50 font-light"
              >
                {t('data.diaspora_residence')}
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-2xl relative"
            >
              {/* Internal Crispy Edge */}
              <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />

              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5">
                    <th className="p-6 text-[10px] font-black text-white/40 uppercase tracking-widest">{t('data.diaspora_residence_country')}</th>
                    <th className="p-6 text-[10px] font-black text-white/40 uppercase tracking-widest">{t('data.diaspora_population')}</th>
                    <th className="p-6 text-right text-[10px] font-black text-white/40 uppercase tracking-widest">{t('data.diaspora_percentage')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {regionalBreakdown.map((item, index) => (
                    <motion.tr 
                      key={index} 
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ 
                        delay: index * 0.05, 
                        duration: 0.5,
                        ease: [0.16, 1, 0.3, 1] // Custom "Out-Quart" ease
                      }}
                      className="transition-colors hover:bg-white/5 group cursor-default"
                    >
                      <td className="p-6 flex items-center gap-4">
                        <span className="text-2xl drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 duration-500">{item.flag}</span>
                        <span className="text-sm font-bold text-white/80 group-hover:text-zim-gold transition-colors">{item.region}</span>
                      </td>
                      <td className="p-6 text-xs text-white/40 font-medium tracking-wide">{item.population}</td>
                      <td className="p-6 text-right font-black text-zim-gold tabular-nums tracking-tight">{item.percentage}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Professional Data Disclaimer - Glass Etched Style */}
      <section id="disclaimer" className="pb-24 bg-slate-950"> 
        <div className="container px-6 mx-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="max-w-2xl mx-auto p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center"
          >
            <p className="text-[11px] text-white italic font-light leading-relaxed tracking-wide">
              {t('data.disclaimer')}
            </p>
          </motion.div>
        </div>
      </section>



      
    </Layout>
  );
}