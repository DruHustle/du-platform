import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Users, Globe, Mountain, Plane, Award, Activity, BarChart3, Factory, Coins, Wallet, Handshake, Currency, BarChart } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { ECONOMIC_DATA, SECTOR_DATA } from "@shared/const";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
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

interface SectorGrowthData {
  name: string;
  growth: number;
  share: number;
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
  const [activeSectorIndex, setActiveSectorIndex] = useState(0);
  const [sectorGrowthData, setSectorGrowthData] = useState<SectorGrowthData[]>([
    { name: "Services", growth: 6.4, share: 52.1 },
    { name: "Manufacturing", growth: 4.2, share: 15.3 },
    { name: "Mining", growth: 8.2, share: 12.0 },
    { name: "Agriculture", growth: 4.5, share: 11.0 },
    { name: "Tourism", growth: 6.1, share: 9.6 },
  ]);

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

        if (Array.isArray(liveData.sectorData) && liveData.sectorData.length > 0) {
          setSectorGrowthData((prev) =>
            prev.map((item) => {
              const liveMatch = liveData.sectorData.find(
                (entry: { name: string; growth: number }) =>
                  entry.name.toLowerCase() === item.name.toLowerCase()
              );
              return liveMatch ? { ...item, growth: liveMatch.growth } : item;
            })
          );
        }
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
      image: "/images/pages/data/infrastructure_investment.png",
      badge: t('data.hero.badge1') || "Economic Insights",
      badgeIcon: Coins,
      title: t('data.hero.title1') || "Driving Growth Through ",
      titleHighlight: t('data.hero.highlight1') || "Data",
      subtitle: t('data.hero.subtitle1') || "Unlocking Zimbabwe's economic potential with comprehensive data visualization and analysis.",
      description: t('data.hero.desc1') || "Explore key economic indicators, sectoral performance, and the significant impact of the diaspora on national development.",
      buttons: [
        { text: t('data.hero.economic_data') || "Explore Economic Data", variant: "primary", link: "#indicators" },
        { text: t('data.hero.sector') || "Sector Performance Data", variant: "outline", link: "#sectors-gdp" }
      ]
    },
    {
      image: "/images/pages/data/remittances_impact.png",
      badge: t('data.hero.badge2') || "Diaspora Power",
      badgeIcon: Wallet,
      title: t('data.hero.title2') || "Remittances: A Pillar of ",
      titleHighlight: t('data.hero.highlight2') || "Growth",
      subtitle: t('data.hero.subtitle2') || "Diaspora remittances are a vital source of foreign currency and a key driver of economic stability and development.",
      description: t('data.hero.desc2') || "Discover how these funds are impacting various sectors, from education to housing, and fueling local economies.",
      buttons: []
    },
    {
      image: "/images/pages/investment/diaspora_investment.jpg",
      badge: t('data.hero.badge3') || "Investment Trends",
      badgeIcon: TrendingUp,
      title: t('data.hero.title3') || "Strategic Investment ",
      titleHighlight: t('data.hero.highlight3') || "Opportunities",
      subtitle: t('data.hero.subtitle3') || "Identify high-potential sectors and projects attracting significant investment, both local and from the diaspora.",
      description: "",
      buttons: []
    },
    {
      image: "/images/pages/export/export_hub_bg.jpg",
      badge: t('data.hero.badge4') || "Export Performance",
      badgeIcon: Handshake,
      title: t('data.hero.title4') || "Boosting National ",
      titleHighlight: t('data.hero.highlight4') || "Exports",
      subtitle: t('data.hero.subtitle4') || "Track the growth of Zimbabwe's export sectors and understand market access dynamics.",
      description: "",
      buttons: []
    },
    {
      image: "/images/pages/investment/rbz_building.png",
      badge: t('data.hero.badge5') || "Policy Impact",
      badgeIcon: Currency,
      title: t('data.hero.title5') || "Informed Policy ",
      titleHighlight: t('data.hero.highlight5') || "Making",
      subtitle: t('data.hero.subtitle5') || "Data-driven insights supporting effective economic planning and policy formulation.",
      description: "",
      buttons: []
    },
    {
      image: "/images/pages/trade/manufacturing_factory.jpg",
      badge: "Production Insights",
      badgeIcon: Factory,
      title: "Manufacturing Trends ",
      titleHighlight: "in Focus",
      subtitle: "Track industrial output performance and identify sectors with scaling potential.",
      description: "",
      buttons: []
    },
    {
      image: "/images/pages/shared/minerals_mining.png",
      badge: "Resource Analytics",
      badgeIcon: Mountain,
      title: "Mining and Commodity ",
      titleHighlight: "Signals",
      subtitle: "Use sector data to assess commodity-driven revenue and downstream value-add opportunities.",
      description: "",
      buttons: []
    },
    {
      image: "/images/pages/tourism/victoria_falls.jpg",
      badge: "Services Performance",
      badgeIcon: Plane,
      title: "Tourism and Services ",
      titleHighlight: "Momentum",
      subtitle: "Understand services-sector recovery patterns and visitor-driven economic contribution.",
      description: "",
      buttons: []
    }
  ], [t]);

  const introData = {
  icon: BarChart3, // 
  title:   t('data.objective_title') || "Data driven insights",
  description:   t('data.objective_subtitle') || "Providing comprehensive, actionable insights to support informed decision-making and strategic planning."
};

  const metrics = [
    {
      title: t('data.overview.gdp.title') || "GDP (2026 Projection)",
      value: `$${(animatedValues.gdp / 1000).toFixed(1)}B`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/5",
      change: `+${data.growthRate}% ${t('data.overview.gdp.subtitle') || "% Growth"}`,
    },
    {
      title: t('data.overview.gdp_growth.title') || "Live GDP Growth",
      value: `${animatedValues.growthRate}%`,
      icon: Activity,
      color: "text-orange-600",
      bgColor: "bg-orange-600/5",
      change: "Real-time Feed",
      isLive: true
    },
    {
      title: t('data.overview.remittances.title') || "Diaspora Remittances",
      value: `$${(animatedValues.remittances / 1000).toFixed(1)}B`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-600/5",
      change: t('data.overview.remittances.subtitle') || "Forex leader",
      largeTitle: true
    },
    {
      title: t('data.overview.total_exports.title') || "Total Exports",
      value: `$${(animatedValues.exportValue / 1000).toFixed(1)}B`,
      icon: Globe,
      color: "text-blue-600",
      bgColor: "bg-blue-600/5",
      change: t('data.overview.total_exports.subtitle') || "Export Performance"
    },
        {
      title: t('data.overview.manufacturing.title') || "Manufacturing",
      value: `$${(animatedValues.manufacturingRevenue / 1000).toFixed(1)}B`,
      icon: Factory,
      color: "text-amber-600",
      bgColor: "bg-amber-600/5",
      change: t('data.overview.manufacturing.subtitle') || "Industrial Output"
    },
    {
      title: t('data.overview.mining.title') || "Mining",
      value: `$${(animatedValues.miningRevenue / 1000).toFixed(1)}B`,
      icon: Mountain,
      color: "text-amber-600",
      bgColor: "bg-amber-600/5",
      change: t('data.overview.mining.subtitle') || "Output Growth"
    },
    {
      title: t('data.overview.agriculture.title') || "Agricultural Exports",
      value: `$${(animatedValues.agriculturalExports / 1000).toFixed(1)}B`,
      icon: Users,
      color: "text-red-600",
      bgColor: "bg-red-600/5",
      change: t('data.overview.agriculture.subtitle') || "Export Value"
    },
    {
      title: t('data.overview.tourism.title') || "Tourism",
      value: `$${(animatedValues.tourismRevenue / 1000).toFixed(1)}B`,
      icon: Plane,
      color: "text-purple-600",
      bgColor: "bg-purple-600/5",
      change: t('data.overview.tourism.subtitle') || "Recovery Growth"
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
    { sector: t('data.education') || "Education", percentage: "28%", amount: "$504M", icon: "📚" }, // "Education"
    { sector: t('data.housing') || "Housing & Construction", percentage: "24%", amount: "$432M", icon: "🏠" }, //Housing & Construction"
    { sector: t('data.health_care') || "Healthcare", percentage: "18%", amount: "$324M", icon: "🏥" }, //Healthcare
    { sector: t('data.business_investment') || "Business Investment", percentage: "17%", amount: "$306M", icon: "💼" }, //"Business Investment"
    { sector: t('data.food') || "Food & Basic Needs", percentage: "13%", amount: "$234M", icon: "🛒" } //"Food & Basic Needs"
  ];

  const pieData = sectorGrowthData.map((sector) => ({
    name: sector.name,
    value: sector.share,
    growth: sector.growth,
  }));

  // Pie chart colors
  const COLORS = [
    "#60A5FA", "#34D399", "#FBBF24", "#F97316", "#A78BFA"
  ];
  const activeSector = pieData[activeSectorIndex] ?? pieData[0];
  const gdpBillions = data.gdp / 1000;
  const formatSectorValue = (share: number) => `$${(gdpBillions * (share / 100)).toFixed(1)}B`;

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
      <section id="indicators" className="p-5 bg-slate-950 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <h2 className="!text-xl font-black text-white tracking-tight">{t('data.overview_title') || "Key Economic Indicators"}</h2>
              <p className="text-sm text-white/75 max-w-3xl mx-auto mt-4 font-light leading-relaxed">{t('data.overview_subtitle') || "Key macroeconomic indicators and performance highlights. 2025 Data and 2026 projections"}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                const isRemittancesTile = index === 2;
                return (
                  <motion.div 
                    key={index}
                    whileHover={{ y: -5 }}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 transition-all duration-500"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-xl bg-white/5 ${metric.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`${isRemittancesTile ? "!tracking-tight !normal-case !text-white" : "text-[10px] tracking-widest uppercase text-white/40"} font-black ${isRemittancesTile ? "" : "truncate"}`}
                        style={isRemittancesTile ? { fontSize: "0.75rem", lineHeight: "1.15" } : undefined}
                      >
                        {metric.title}
                      </span>
                    </div>
                    <div className="relative">
                      <p className="text-lg font-black text-white tracking-tighter">{metric.value}</p>
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

            <p className="mt-8 text-[11px] text-white/55 italic font-light leading-relaxed tracking-wide text-center">
              {t('data.disclaimer') || "* Data based on estimates from RBZ, ZIMSTAT, World Bank, and IMF reports. Real-time metrics update periodically via API."}
            </p>
          </div>
        </div>
      </section>

      {/* GDP Growth Trajectory - Animated Ice Bars */}
      
      <section className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <h2 className="!text-xl font-black text-white tracking-tight">{t('data.gdp_growth_trajectory') || "GDP Growth Trajectory"}</h2>
              <p className="text-sm text-white/75 max-w-3xl mx-auto mt-4 font-light leading-relaxed">{t('data.gdp_growth_history') || "Zimbabwe's economic growth from 2021 to 2025 projection"}</p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
              <div className="mb-8 flex justify-between items-end">
                <div>
                  <h3 className="!text-lg font-black text-white tracking-tight">{t('data.gdp_growth_rate') || "GDP Growth Rate"}</h3>
                  <p className="text-xs text-white/30 uppercase tracking-widest mt-1">{t('data.gdp_data_source') || "Source: World Bank, IMF, ZIMSTAT"}</p>
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

      {/* GDP Composition - Glass Donut Terminal */}
      
      <section id="sectors-gdp" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <h2 className="!text-xl font-black text-white tracking-tight">{t('data.sectoral_data_title') || "GDP Growth by Sector"}</h2> 
              <p className="text-sm text-white/75 max-w-3xl mx-auto mt-4 font-light leading-relaxed">{t('data.sectoral_data_breakdown') || "A breakdown of how each pillar of the economy is contributing to the national growth projection."}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              {/* Projections List */}
              <div className="space-y-8">
                <h3 className="!text-[12px] font-black text-zim-gold uppercase tracking-[0.4em] mb-10 border-l-2 border-zim-gold/30 pl-4">
                  {t('data.sectoral_data_projections') || "Growth Projections"} ({data.year})
                </h3> 
                {sectorGrowthData.map((sector, index) => (
                  <button
                    key={sector.name}
                    onClick={() => setActiveSectorIndex(index)}
                    className={`w-full text-left space-y-3 rounded-xl p-3 border transition-all ${
                      activeSectorIndex === index
                        ? "border-zim-gold/40 bg-zim-gold/10"
                        : "border-transparent hover:border-white/20 hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                      <span className="text-white/80">{sector.name}</span>
                      <span className="text-right">
                        <span className="block text-zim-gold">{formatSectorValue(sector.share)}</span>
                        <span className="block text-[10px] text-white/55">+{sector.growth}% growth</span>
                      </span>
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
                    <p className="text-[10px] text-white/50 uppercase tracking-widest">
                      GDP Share: {sector.share.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-white/70 uppercase tracking-widest">
                      Est. Value: {formatSectorValue(sector.share)}
                    </p>
                  </button>
                ))}
              </div>

              {/* Cinematic Donut Chart */}
              <div className="relative p-1 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent">
                <div className="h-[500px] w-full bg-slate-950/40 backdrop-blur-3xl p-10 rounded-[2.9rem] relative overflow-visible">
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
                        labelLine={false}
                        label={({ name, value }) => `${name} ${formatSectorValue(Number(value ?? 0))}`}
                        onMouseEnter={(_, index) => setActiveSectorIndex(index)}
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            className="outline-none stroke-slate-900"
                            strokeWidth={activeSectorIndex === index ? 4 : 2}
                            opacity={activeSectorIndex === index ? 1 : 0.65}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, _name, entry) => {
                          const growth = (entry as { payload?: { growth?: number } })?.payload?.growth ?? 0;
                          return [
                            `${formatSectorValue(Number(value))} • ${Number(value).toFixed(1)}% share • +${growth.toFixed(1)}% growth`,
                            "Sector Value"
                          ];
                        }}
                        wrapperStyle={{
                          zIndex: 60,
                          outline: "none",
                        }}
                        contentStyle={{
                          backgroundColor: "rgba(2, 6, 23, 0.92)",
                          backdropFilter: "blur(12px)",
                          borderRadius: "16px",
                          border: "1px solid rgba(255,255,255,0.18)",
                          color: "#fff",
                          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.45)",
                        }}
                        labelStyle={{ color: "#F8FAFC", fontWeight: 700 }}
                        itemStyle={{ color: "#F8FAFC", fontWeight: 600 }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={50} 
                        iconType="circle"
                        formatter={(value) => <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Label */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">{activeSector?.name ?? "Sector"}</p>
                    <p className="text-lg font-black text-white">{formatSectorValue(activeSector?.value ?? 0)}</p>
                    <p className="text-[11px] font-bold text-zim-gold">+{activeSector?.growth?.toFixed(1) ?? "0"}% growth</p>
                    <p className="text-[10px] font-bold text-white/70 mt-1">{activeSector?.value?.toFixed(1) ?? "0"}% share</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Remittances - High-End Financial Panel */}
      <section id="remittance-impact" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
            
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
              <h2 className="!text-xl font-black text-white tracking-tight leading-tight">
                {t('data.diaspora_remittance_impact_title') || "Diaspora Economic Impact"}
              </h2>
              <p className="text-sm text-white/75 font-light leading-relaxed">
                {t('data.diaspora_remittance_impact_subtitle') || "Understanding the significant contribution of the Zimbabwean diaspora to the national economy."}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="space-y-5 lg:col-span-7 lg:order-1">
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

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5 lg:col-span-5 lg:order-2">
                {[
                  { label: t('data.diaspora_remittance_value') || "Annual Remittances", val: "$1.8B", highlight: true },
                  { label: t('data.diaspora_number_value') || "Global Diaspora", val: "3.5M" },
                  { label: t('data.diaspora_investment_potential') || "Investment Potential", val: "$500M", span: true }
                ].map((stat, i) => (
                  <div key={i} className={`p-6 rounded-[2rem] border border-white/10 bg-white/[0.02] transition-all hover:bg-slate-950/60 ${stat.span ? 'col-span-2 lg:col-span-1' : ''}`}>
                    <p className="text-base md:text-lg font-black text-zim-gold tracking-tighter mb-2">{stat.val}</p>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-8 text-[11px] text-white/55 italic font-light leading-relaxed tracking-wide text-center">
              {t('data.disclaimer') || "* Data based on estimates from RBZ, ZIMSTAT, World Bank, and IMF reports. Real-time metrics update periodically via API."}
            </p>
          </div>
        </div>
      </section>
       
      {/* Global Diaspora Distribution - Animated Glass Table */}
      <section className="pt-5 pb-10 bg-slate-950 relative overflow-hidden">
        {/* Subtle bottom-right glow for table depth */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-zim-gold/[0.02] blur-[120px] rounded-full pointer-events-none" />

        <div className="container px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="!text-xl font-black text-white tracking-tight"
              >
                {t('data.diaspora_distribution') || "Global Diaspora Distribution"}
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-white/75 font-light leading-relaxed mt-4"
              >
                {t('data.diaspora_residence') || "Zimbabwean diaspora residence worldwide"}
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-white/60 font-light leading-relaxed max-w-3xl mx-auto mt-3"
              >
                {t('data.diaspora_residence_extra') ||
                  "This distribution highlights priority diaspora corridors for trade, remittance flows, and investment outreach planning across major host markets."}
              </motion.p>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl relative"
            >
              {/* Internal Crispy Edge */}
              <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />

              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/5">
                    <th className="p-6 text-[10px] font-black text-white/40 uppercase tracking-widest">{t('data.diaspora_residence_country') || "Region/Country"}</th>
                    <th className="p-6 text-[10px] font-black text-white/40 uppercase tracking-widest">{t('data.diaspora_population') || "Population"}</th>
                    <th className="p-6 text-right text-[10px] font-black text-white/40 uppercase tracking-widest">{t('data.diaspora_percentage') || "Percentage"}</th>
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
                        <span className="text-lg drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 duration-500">{item.flag}</span>
                        <span className="text-sm font-bold text-white/80 group-hover:text-zim-gold transition-colors">{item.region}</span>
                      </td>
                      <td className="p-6 text-xs text-white/40 font-medium tracking-wide">{item.population}</td>
                      <td className="p-6 text-right font-black text-zim-gold tabular-nums tracking-tight">{item.percentage}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>

            <p className="mt-8 text-[11px] text-white/55 italic font-light leading-relaxed tracking-wide text-center">
              {t('data.disclaimer') || "* Data based on estimates from RBZ, ZIMSTAT, World Bank, and IMF reports. Real-time metrics update periodically via API."}
            </p>
          </div>
        </div>
      </section>
      
    </Layout>
  );
}
