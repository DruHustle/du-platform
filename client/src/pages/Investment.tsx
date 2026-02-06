import { useState } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import InvestmentCalculator from "@/components/InvestmentCalculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, Shield, DollarSign, ExternalLink, CheckCircle, Building, Leaf, Cpu, Factory, Award } from "lucide-react";
import { Link } from "wouter";

export default function Investment() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  const projects = [
    {
      title: "Zimbabwe Leather Manufacturing Project",
      description: "Expand leather goods production for export to European markets with government procurement support",
      category: "Manufacturing",
      sector: "manufacturing",
      targetAmount: "$250,000",
      raised: "$187,500",
      progress: 75,
      investors: 342,
      minInvestment: "$500",
      expectedReturn: "12-15% annually",
      timeline: "3-5 years",
      status: "Active",
      risk: "moderate",
      verified: true,
      highlights: [
        "Government civil servant procurement contract",
        "Export-ready quality standards",
        "Skilled artisan workforce",
        "Sustainable sourcing practices"
      ]
    },
    {
      title: "Organic Horticulture Export Hub",
      description: "Establish EU-certified organic farming collective for high-value vegetable exports",
      category: "Agriculture",
      sector: "agriculture",
      targetAmount: "$150,000",
      raised: "$98,000",
      progress: 65,
      investors: 218,
      minInvestment: "$300",
      expectedReturn: "10-12% annually",
      timeline: "2-4 years",
      status: "Active",
      risk: "conservative",
      verified: true,
      highlights: [
        "EU organic certification in progress",
        "Direct buyer relationships in Germany",
        "Climate-smart irrigation systems",
        "Fair trade principles"
      ]
    },
    {
      title: "Victoria Falls Tourism Lodge",
      description: "Boutique eco-lodge development near Victoria Falls for diaspora and international tourists",
      category: "Tourism",
      sector: "tourism",
      targetAmount: "$500,000",
      raised: "$125,000",
      progress: 25,
      investors: 156,
      minInvestment: "$1,000",
      expectedReturn: "15-18% annually",
      timeline: "5-7 years",
      status: "Active",
      risk: "aggressive",
      verified: false,
      highlights: [
        "Prime location near UNESCO site",
        "Sustainable tourism model",
        "Diaspora homecoming packages",
        "Year-round revenue potential"
      ]
    },
    {
      title: "Solar Energy Infrastructure Fund",
      description: "Invest in renewable energy projects powering rural communities and businesses",
      category: "Infrastructure",
      sector: "infrastructure",
      targetAmount: "$400,000",
      raised: "$280,000",
      progress: 70,
      investors: 412,
      minInvestment: "$250",
      expectedReturn: "8-10% annually",
      timeline: "4-6 years",
      status: "Active",
      risk: "conservative",
      verified: true,
      highlights: [
        "Government energy partnership",
        "Carbon credit potential",
        "Rural electrification impact",
        "Long-term power purchase agreements"
      ]
    },
    {
      title: "AgriTech Innovation Hub",
      description: "Technology-driven agricultural solutions including precision farming and supply chain digitization",
      category: "Tech",
      sector: "tech",
      targetAmount: "$300,000",
      raised: "$195,000",
      progress: 65,
      investors: 289,
      minInvestment: "$500",
      expectedReturn: "18-22% annually",
      timeline: "3-5 years",
      status: "Active",
      risk: "aggressive",
      verified: false,
      highlights: [
        "Mobile-first farmer platform",
        "AI-powered crop analytics",
        "Market linkage system",
        "Diaspora tech mentorship"
      ]
    }
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Government Support",
      description: "Selected projects receive government backing through procurement contracts and policy support"
    },
    {
      icon: Users,
      title: "Diaspora Network",
      description: "Leverage global connections for market access, expertise, and investment capital"
    },
    {
      icon: TrendingUp,
      title: "Performance Tracking",
      description: "Real-time dashboards showing project progress, financial performance, and impact metrics"
    },
    {
      icon: DollarSign,
      title: "Flexible Investment",
      description: "Start with as little as $250-$1,000 and build your portfolio over time"
    }
  ];

  // HDC Associations
  const hdcAssociations = [
    "Avocado Growers Association",
    "Berry Growers Association",
    "Citrus Growers Association",
    "Coffee Growers Association",
    "Deciduous Fruit Growers Association",
    "Nut Growers Association",
    "Export Produce Association",
    "Export Flower Growers Association",
    "Tea Growers Association"
  ];

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
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/investment_bg.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        </div>
        
        <div className="relative z-10 container text-white">
          <Badge className="mb-4 bg-secondary text-secondary-foreground">Investment Marketplace</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Invest in Zimbabwe's Future
          </h1>
          <p className="text-xl md:text-2xl mb-6 max-w-3xl opacity-95">
            Diaspora-friendly micro-investments and crowdfunding opportunities in verified projects
          </p>
        </div>
      </section>

      {/* Why Invest Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Invest Through ZIGD?</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We've designed an investment platform specifically for small to medium-scale diaspora investors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto p-3 bg-primary/10 rounded-lg w-fit mb-3">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Verified Directories */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* NTIR */}
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Building className="h-8 w-8 text-primary" />
                  <CardTitle className="text-xl">National Trade & Investment Register</CardTitle>
                </div>
                <CardDescription>
                  Access the official registry of all verified trade and investment entities in Zimbabwe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Search NTIR Database
                </Button>
              </CardContent>
            </Card>

            {/* HDC */}
            <Card className="border-t-4 border-t-green-600">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Leaf className="h-8 w-8 text-green-600" />
                  <CardTitle className="text-xl">Horticultural Development Council</CardTitle>
                </div>
                <CardDescription>
                  HDC of Zimbabwe oversees quality and standards for horticultural exports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {hdcAssociations.slice(0, 5).map((assoc, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {assoc}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-xs">+4 more</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Active Projects with Filters */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Active Investment Opportunities</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Carefully vetted projects with government support and transparent performance tracking
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 justify-center">
            <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="agriculture">Agriculture</TabsTrigger>
                <TabsTrigger value="tech">Tech</TabsTrigger>
                <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
                <TabsTrigger value="manufacturing">Manufacturing</TabsTrigger>
                <TabsTrigger value="tourism">Tourism</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <select 
              value={riskFilter} 
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-4 py-2 border rounded-md bg-white"
            >
              <option value="all">All Risk Levels</option>
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>

          <div className="space-y-8">
            {filteredProjects.map((project, index) => (
              <Card key={index} className="overflow-hidden border-t-4 border-t-primary hover:shadow-xl transition-shadow">
                <div className="grid md:grid-cols-3 gap-6 p-6">
                  {/* Project Details */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Badge variant="secondary">{project.category}</Badge>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          {project.status}
                        </Badge>
                        <Badge className={getRiskColor(project.risk)}>
                          {project.risk.charAt(0).toUpperCase() + project.risk.slice(1)} Risk
                        </Badge>
                        {project.verified && (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                            <Award className="h-3 w-3 mr-1" /> Verified
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                      <p className="text-muted-foreground">{project.description}</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        Key Highlights
                      </h4>
                      <ul className="grid md:grid-cols-2 gap-2">
                        {project.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <span className="mr-2 text-primary">•</span>
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Investment Stats */}
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Funding Progress</p>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-2xl font-bold text-primary">{project.raised}</span>
                          <span className="text-sm text-muted-foreground">of {project.targetAmount}</span>
                        </div>
                        <Progress value={project.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{project.progress}% funded</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Investors</p>
                          <p className="text-lg font-semibold">{project.investors}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Min. Investment</p>
                          <p className="text-lg font-semibold">{project.minInvestment}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Expected Return</span>
                          <span className="font-semibold text-green-600">{project.expectedReturn}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Timeline</span>
                          <span className="font-semibold">{project.timeline}</span>
                        </div>
                      </div>
                    </div>

                    <Button className="w-full" size="lg">
                      View Details & Invest
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Crowdfunding Works</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Simple, transparent process from investment to returns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Browse Projects",
                description: "Review vetted investment opportunities with detailed business plans and government backing"
              },
              {
                step: "2",
                title: "Invest Your Share",
                description: "Choose your investment amount and complete secure payment through multiple channels"
              },
              {
                step: "3",
                title: "Track Performance",
                description: "Monitor project progress, financial metrics, and impact through your investor dashboard"
              },
              {
                step: "4",
                title: "Receive Returns",
                description: "Get quarterly dividends and capital appreciation as projects grow and succeed"
              }
            ].map((item, index) => (
              <Card key={index} className="text-center relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                  {item.step}
                </div>
                <CardHeader className="pt-8">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Investment Calculator */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <InvestmentCalculator />
        </div>
      </section>

      {/* Contact CTA with Modal */}
      <section className="py-16">
        <div className="container">
          <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Invest?</CardTitle>
              <CardDescription className="text-base">
                Our investment team can help you identify the right opportunities and guide you through the process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="text-lg px-8">
                    Connect with an Expert
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <ContactForm
                    title="Investment Inquiry"
                    description="Fill out the form below and our investment specialists will contact you."
                    module="investment"
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* External Links */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore More Investment Resources
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              For comprehensive investment information and official guidelines, visit the Zimbabwe Investment and Development Agency
            </p>
            <a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Visit ZIDA <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
