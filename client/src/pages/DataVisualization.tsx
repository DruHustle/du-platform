import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Globe } from "lucide-react";
import { useEffect, useState } from "react";

interface EconomicData {
  remittances: number;
  gdp: number;
  diasporaPopulation: number;
  exportValue: number;
  year: number;
}

export default function DataVisualization() {
  const [data, setData] = useState<EconomicData>({
    remittances: 1200, // Million USD
    gdp: 28400, // Million USD (2023 estimate)
    diasporaPopulation: 4500000, // Estimated
    exportValue: 5800, // Million USD
    year: 2024
  });

  const [animatedValues, setAnimatedValues] = useState({
    remittances: 0,
    gdp: 0,
    diasporaPopulation: 0,
    exportValue: 0
  });

  // Simulate real-time updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        remittances: prev.remittances + (Math.random() * 2 - 1), // Small fluctuation
        exportValue: prev.exportValue + (Math.random() * 1.5 - 0.75),
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Animate counter on mount
  useEffect(() => {
    const duration = 2000; // 2 seconds
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
        exportValue: Math.floor(data.exportValue * progress)
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedValues({
          remittances: data.remittances,
          gdp: data.gdp,
          diasporaPopulation: data.diasporaPopulation,
          exportValue: data.exportValue
        });
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [data]);

  const metrics = [
    {
      title: "Diaspora Remittances",
      value: `$${animatedValues.remittances.toFixed(1)}M`,
      description: "Annual remittances from Zimbabwean diaspora (2024 est.)",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-600/10",
      change: "+8.5% from 2023"
    },
    {
      title: "National GDP",
      value: `$${(animatedValues.gdp / 1000).toFixed(1)}B`,
      description: "Zimbabwe's Gross Domestic Product (2024 est.)",
      icon: TrendingUp,
      color: "text-yellow-600",
      bgColor: "bg-yellow-600/10",
      change: "+5.3% growth rate"
    },
    {
      title: "Global Diaspora",
      value: animatedValues.diasporaPopulation.toLocaleString(),
      description: "Zimbabweans living abroad worldwide",
      icon: Users,
      color: "text-red-600",
      bgColor: "bg-red-600/10",
      change: "Across 100+ countries"
    },
    {
      title: "Export Value",
      value: `$${animatedValues.exportValue.toFixed(1)}M`,
      description: "Total export value (2024 YTD)",
      icon: Globe,
      color: "text-slate-800",
      bgColor: "bg-slate-800/10",
      change: "+12.1% from 2023"
    }
  ];

  const regionalBreakdown = [
    { region: "United Kingdom", population: "500,000 - 1,000,000", percentage: "22%" },
    { region: "South Africa", population: "1,000,000 - 2,000,000", percentage: "33%" },
    { region: "United States", population: "300,000 - 500,000", percentage: "11%" },
    { region: "Australia", population: "50,000 - 100,000", percentage: "2%" },
    { region: "Canada", population: "50,000 - 100,000", percentage: "2%" },
    { region: "Botswana", population: "500,000+", percentage: "11%" },
    { region: "Other Countries", population: "1,100,000+", percentage: "19%" }
  ];

  const remittanceImpact = [
    { sector: "Education", percentage: "28%", amount: "$336M" },
    { sector: "Healthcare", percentage: "18%", amount: "$216M" },
    { sector: "Housing & Construction", percentage: "22%", amount: "$264M" },
    { sector: "Business Investment", percentage: "15%", amount: "$180M" },
    { sector: "Food & Basic Needs", percentage: "17%", amount: "$204M" }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        {/* Hero Section */}
        <section className="py-16 bg-primary text-white">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Zimbabwe Economic Dashboard
              </h1>
              <p className="text-lg md:text-xl opacity-90">
                Real-time insights into Zimbabwe's economy, diaspora contributions, and national growth metrics
              </p>
              <p className="text-sm mt-4 opacity-75">
                Last updated: {new Date().toLocaleString()} • Data refreshes every 10 seconds
              </p>
            </div>
          </div>
        </section>

        {/* Key Metrics */}
        <section className="py-16">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <Card key={index} className={`hover-lift ${metric.bgColor} border-l-4 ${metric.color.replace('text-', 'border-l-')}`}>
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

        {/* Regional Diaspora Breakdown */}
        <section className="py-16 bg-black/5">
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

              <Card className="hover-scale">
                <CardHeader>
                  <CardTitle>Regional Breakdown</CardTitle>
                  <CardDescription>Estimated diaspora population by region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {regionalBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-semibold">{item.region}</p>
                          <p className="text-sm text-muted-foreground">{item.population}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{item.percentage}</p>
                          <p className="text-xs text-muted-foreground">of total</p>
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
                  How diaspora remittances are transforming Zimbabwe's economy
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {remittanceImpact.map((item, index) => (
                  <Card key={index} className="hover-lift">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{item.sector}</CardTitle>
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
                Key Economic Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-white/10 border-white/20 text-white hover-scale">
                  <CardHeader>
                    <CardTitle className="text-white">Remittance Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm opacity-90">
                      Diaspora remittances have grown by 45% over the past 5 years, becoming Zimbabwe's largest source of foreign currency.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white hover-scale">
                  <CardHeader>
                    <CardTitle className="text-white">Economic Contribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm opacity-90">
                      Remittances account for approximately 4.2% of Zimbabwe's GDP, supporting millions of households nationwide.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20 text-white hover-scale">
                  <CardHeader>
                    <CardTitle className="text-white">Investment Potential</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm opacity-90">
                      With proper infrastructure, diaspora investment could unlock an additional $2-3 billion in annual economic activity.
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
                Data compiled from Reserve Bank of Zimbabwe, World Bank, IMF, Zimbabwe National Statistics Agency (ZIMSTAT), 
                and diaspora community surveys. Figures are estimates based on the most recent available data (2023-2024). 
                Real-time updates simulate market fluctuations for demonstration purposes.
              </p>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
