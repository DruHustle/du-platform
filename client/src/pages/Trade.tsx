import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp, Award, Globe, ExternalLink, Users } from "lucide-react";

export default function Trade() {
  const exportSectors = [
    {
      name: "Horticulture",
      description: "Fresh produce, flowers, and organic vegetables for international markets",
      image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800&q=80",
      opportunities: ["EU organic markets", "Middle East exports", "Regional SADC trade"],
      icon: Package
    },
    {
      name: "Leather Products",
      description: "Premium leather goods, footwear, and accessories with authentic African craftsmanship",
      image: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80",
      opportunities: ["European fashion markets", "Luxury goods sector", "Government procurement"],
      icon: Award
    },
    {
      name: "Arts & Crafts",
      description: "Stone sculptures, beadwork, woven baskets, and traditional artisan products",
      image: "https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80",
      opportunities: ["Tourism markets", "Cultural exports", "Fair trade channels"],
      icon: Globe
    },
    {
      name: "Minerals & Mining",
      description: "Value-added mineral products, precious stones, and processed materials",
      image: "https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80",
      opportunities: ["Industrial exports", "Jewelry sector", "Technology minerals"],
      icon: TrendingUp
    }
  ];

  const programs = [
    {
      title: "Eagles Nest",
      description: "Youth export incubator program developing the next generation of Zimbabwean exporters",
      target: "Young entrepreneurs (18-35)",
      benefits: ["Export training", "Mentorship", "Market access", "Funding support"]
    },
    {
      title: "Next She Exporter",
      description: "Empowering female-owned businesses with export knowledge, skills, and market connections",
      target: "Women-owned businesses",
      benefits: ["Capacity building", "Networking", "Trade missions", "Certification support"]
    },
    {
      title: "Shop At Zim",
      description: "B2B e-commerce platform connecting Zimbabwean suppliers with international buyers",
      target: "Export-ready businesses",
      benefits: ["Online marketplace", "Buyer connections", "Payment solutions", "Logistics support"]
    }
  ];

  const diasporaRole = [
    {
      title: "Market Intelligence",
      description: "Share insights about consumer preferences, trends, and opportunities in your host country",
      icon: Globe
    },
    {
      title: "Buyer Connections",
      description: "Introduce Zimbabwean exporters to retailers, distributors, and importers in your network",
      icon: Users
    },
    {
      title: "Quality Feedback",
      description: "Provide feedback on product quality, packaging, and market readiness",
      icon: Award
    },
    {
      title: "Brand Ambassadors",
      description: "Promote Zimbabwean products and brands in international markets",
      icon: TrendingUp
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/xrZBHerHOgqkwoKu.jpeg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        </div>
        
        <div className="relative z-10 container text-white">
          <Badge className="mb-4 bg-secondary text-secondary-foreground">Trade Information Hub</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Trade Zimbabwe
          </h1>
          <p className="text-xl md:text-2xl mb-6 max-w-3xl opacity-95">
            Connecting Zimbabwean exporters with global markets through diaspora networks
          </p>
        </div>
      </section>

      {/* Export Sectors */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Export Sectors</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Zimbabwe's diverse export portfolio offers opportunities across multiple sectors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {exportSectors.map((sector, index) => {
              const Icon = sector.icon;
              return (
                <Card key={index} className="overflow-hidden hover:shadow-xl transition-all border-t-4 border-t-accent">
                  <div className="relative h-48 overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${sector.image}')` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">
                      <Icon className="h-10 w-10 mb-2" />
                    </div>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">{sector.name}</CardTitle>
                    <CardDescription className="text-base">{sector.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Export Opportunities:</p>
                      <div className="flex flex-wrap gap-2">
                        {sector.opportunities.map((opp, idx) => (
                          <Badge key={idx} variant="secondary">
                            {opp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ZimTrade Programs */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Export Development Programs</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              ZimTrade offers specialized programs to build export capacity and connect businesses with markets
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {programs.map((program, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow border-t-4 border-t-primary">
                <CardHeader>
                  <CardTitle className="text-xl">{program.title}</CardTitle>
                  <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Target Audience:</p>
                    <Badge variant="outline">{program.target}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Key Benefits:</p>
                    <ul className="space-y-1">
                      {program.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <span className="mr-2 text-primary">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Diaspora Trade Networks */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Diaspora Trade Networks</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              How diaspora members can support Zimbabwean exporters and create trade opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {diasporaRole.map((role, index) => {
              const Icon = role.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="mx-auto p-3 bg-primary/10 rounded-lg w-fit mb-3">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Card className="max-w-3xl mx-auto border-t-4 border-t-secondary">
              <CardHeader>
                <CardTitle className="text-2xl">Success Story: Leather Export Network</CardTitle>
                <CardDescription>How diaspora connections opened European markets</CardDescription>
              </CardHeader>
              <CardContent className="text-left space-y-4">
                <p>
                  A group of Zimbabwean diaspora professionals in Germany connected local leather manufacturers 
                  with European retailers, resulting in a $2.5M export contract. The diaspora network provided:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Market intelligence on German consumer preferences</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Direct introductions to retail buyers</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Quality assurance and certification guidance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 text-primary">✓</span>
                    <span>Ongoing market feedback and product development support</span>
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground italic">
                  This partnership now supports 150+ artisans in Zimbabwe and has expanded to three European countries.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trade Resources */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Essential Trade Resources</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Quick access to key information for exporters and importers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Trade Regulations",
                description: "Import/export requirements, customs procedures, and compliance guidelines",
                icon: "📋"
              },
              {
                title: "Trade Agreements",
                description: "SADC, COMESA, AfCFTA, and bilateral trade agreements",
                icon: "🤝"
              },
              {
                title: "Market Intelligence",
                description: "Price trends, demand forecasts, and competitive analysis",
                icon: "📊"
              },
              {
                title: "Certification Support",
                description: "Quality standards, organic certification, and compliance testing",
                icon: "✓"
              },
              {
                title: "Logistics Partners",
                description: "Freight forwarders, customs brokers, and shipping solutions",
                icon: "🚚"
              },
              {
                title: "Export Finance",
                description: "Trade finance, export credit insurance, and payment solutions",
                icon: "💳"
              }
            ].map((resource, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-4xl mb-2">{resource.icon}</div>
                  <CardTitle className="text-lg">{resource.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="container">
          <ContactForm
            title="Trade Support & Partnerships"
            description="Connect with our trade team for export development support, market access guidance, and partnership opportunities."
            module="trade"
          />
        </div>
      </section>

      {/* External Link to ZimTrade */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Access Comprehensive Trade Services
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              For detailed trade information, export development programs, and direct support services, visit ZimTrade
            </p>
            <a href="https://tradezimbabwe.com/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Visit ZimTrade <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
