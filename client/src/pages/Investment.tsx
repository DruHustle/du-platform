import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import InvestmentCalculator from "@/components/InvestmentCalculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Shield, DollarSign, ExternalLink, CheckCircle } from "lucide-react";

export default function Investment() {
  const projects = [
    {
      title: "Zimbabwe Leather Manufacturing Project",
      description: "Expand leather goods production for export to European markets with government procurement support",
      category: "Manufacturing",
      targetAmount: "$250,000",
      raised: "$187,500",
      progress: 75,
      investors: 342,
      minInvestment: "$500",
      expectedReturn: "12-15% annually",
      timeline: "3-5 years",
      status: "Active",
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
      targetAmount: "$150,000",
      raised: "$98,000",
      progress: 65,
      investors: 218,
      minInvestment: "$300",
      expectedReturn: "10-12% annually",
      timeline: "2-4 years",
      status: "Active",
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
      targetAmount: "$500,000",
      raised: "$125,000",
      progress: 25,
      investors: 156,
      minInvestment: "$1,000",
      expectedReturn: "15-18% annually",
      timeline: "5-7 years",
      status: "Active",
      highlights: [
        "Prime location near UNESCO site",
        "Sustainable tourism model",
        "Diaspora homecoming packages",
        "Year-round revenue potential"
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
      description: "Start with as little as $300-$1,000 and build your portfolio over time"
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/tnmQvoljziNwaaOa.jpg')`,
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

      {/* Active Projects */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Active Investment Opportunities</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Carefully vetted projects with government support and transparent performance tracking
            </p>
          </div>

          <div className="space-y-8">
            {projects.map((project, index) => (
              <Card key={index} className="overflow-hidden border-t-4 border-t-primary hover:shadow-xl transition-shadow">
                <div className="grid md:grid-cols-3 gap-6 p-6">
                  {/* Project Details */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="secondary">{project.category}</Badge>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          {project.status}
                        </Badge>
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
      <section className="py-16 bg-muted/30">
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
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-3">
                    {item.step}
                  </div>
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

      {/* NTIR - Trust Infrastructure */}
      <section className="py-16">
        <div className="container">
          <Card className="border-t-4 border-t-secondary">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl">National Trusted Investment Registry (NTIR)</CardTitle>
              </div>
              <CardDescription className="text-base">
                Government-backed trust infrastructure ensuring transparency and accountability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                All investment opportunities on the ZIGD platform are registered with the National Trusted Investment Registry (NTIR), 
                a government initiative that provides:
              </p>
              <ul className="grid md:grid-cols-2 gap-3">
                {[
                  "Pre-investment due diligence and verification",
                  "Real-time performance tracking and reporting",
                  "Investor protection mechanisms",
                  "Dispute resolution frameworks",
                  "Compliance monitoring and audits",
                  "Trust score ratings for projects and operators"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Investment Calculator */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Calculate Your Returns</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Use our interactive calculator to project potential returns on your investment portfolio
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <InvestmentCalculator />
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="container">
          <ContactForm
            title="Investment Inquiries"
            description="Interested in investing? Our team can provide detailed project information, due diligence reports, and NTIR registration support."
            module="investment"
          />
        </div>
      </section>

      {/* External Link to ZIDA */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Looking for Large-Scale Investments?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              For institutional investors and large-scale FDI opportunities, explore comprehensive investment services through ZIDA
            </p>
            <a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Visit ZIDA Invest <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
