import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Users, Globe, Factory, Leaf, Mountain, Plane } from "lucide-react";
import { useEffect, useState } from "react";
import { ECONOMIC_DATA, SECTOR_DATA } from "@shared/const";

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
  const [data, setData] = useState<EconomicData>({
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
        {/* Hero Section */}
        <section className="py-16 bg-primary text-white">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-4 bg-secondary text-secondary-foreground">Economic Dashboard</Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Zimbabwe Economic Dashboard 2025
              </h1>
              <p className="text-lg md:text-xl opacity-90">
                Real-time insights into Zimbabwe's economy, diaspora contributions, and national growth metrics
              </p>
              <p className="text-sm mt-4 opacity-75">
                Data sources: RBZ, World Bank, IMF, ZIMSTAT • Last updated: February 2025
              </p>
            </div>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="py-16">
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
        <section className="py-16">
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
                      <div className="text-3xl font-bold text-primary mb-2">{mineral.value}%</div>
                      <p className="text-sm text-muted-foreground">${mineral.revenue}B revenue</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Regional Diaspora Breakdown */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Global Diaspora Distribution
                </h2>
                <p className="text-lg text-muted-foreground">
                  Where Zimbabweans are making their mark worldwide
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Regional Breakdown</CardTitle>
                  <CardDescription>Estimated diaspora population by region (3.5 million total)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {regionalBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.flag}</span>
                          <div>
                            <p className="font-semibold">{item.region}</p>
                            <p className="text-sm text-muted-foreground">{item.population}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{item.percentage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Remittance Impact */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Remittance Impact Analysis
                </h2>
                <p className="text-lg text-muted-foreground">
                  How $1.8B in diaspora remittances are transforming Zimbabwe's economy
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remittanceImpact.map((item, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <span>{item.icon}</span>
                          {item.sector}
                        </CardTitle>
                        <span className="text-2xl font-bold text-primary">{item.percentage}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-1000"
                            style={{ width: item.percentage }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Annual allocation: <span className="font-semibold text-foreground">{item.amount}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Key Insights */}
        <section className="py-16 bg-primary text-white">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                Key Economic Insights 2025
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/10 border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Strong GDP Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm opacity-90">
                      Zimbabwe's GDP is projected to grow by 6.6% in 2025, with Q2 year-over-year growth reaching 11.04%, 
                      driven by mining, agriculture, and services sectors.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Factory className="h-5 w-5" />
                      Mining Boom
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm opacity-90">
                      The mining sector generated $5.56B in 2024, with lithium emerging as a key growth driver 
                      alongside traditional gold and platinum exports.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Leaf className="h-5 w-5" />
                      Agricultural Records
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm opacity-90">
                      Record wheat production of 640,000 tons achieved, with tobacco exports reaching $850M 
                      and horticulture exports growing to $120M.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="py-12 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-lg font-semibold mb-4">Data Sources & Methodology</h3>
              <p className="text-sm text-muted-foreground">
                Data compiled from Reserve Bank of Zimbabwe (RBZ), World Bank, International Monetary Fund (IMF), 
                Zimbabwe National Statistics Agency (ZIMSTAT), and Ministry of Finance. Figures are based on 
                2024 actuals and 2025 projections. Diaspora population estimates from IOM and community surveys.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
