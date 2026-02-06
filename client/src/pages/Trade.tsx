import { useState } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Package, TrendingUp, Award, Globe, ExternalLink, Users, FileCheck, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function Trade() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const exportSectors = [
    {
      name: "Horticulture",
      description: "Fresh produce, flowers, and organic vegetables for international markets",
      image: "/images/horticulture.jpg",
      opportunities: ["EU organic markets", "Middle East exports", "Regional SADC trade"],
      icon: Package
    },
    {
      name: "Leather Products",
      description: "Premium leather goods, footwear, and accessories with authentic African craftsmanship",
      image: "/images/leather_products.jpg",
      opportunities: ["European fashion markets", "Luxury goods sector", "Government procurement"],
      icon: Award
    },
    {
      name: "Arts & Crafts",
      description: "Stone sculptures, beadwork, woven baskets, and traditional artisan products",
      image: "/images/arts_crafts.jpg",
      opportunities: ["Tourism markets", "Cultural exports", "Fair trade channels"],
      icon: Globe
    },
    {
      name: "Minerals & Mining",
      description: "Value-added mineral products, precious stones, and processed materials",
      image: "/images/minerals_mining.jpg",
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

  // Export flow steps based on the diagram
  const exportFlowSteps = [
    {
      phase: "Product Approval",
      description: "For products not yet EU approved (e.g., Honey)",
      steps: [
        "Submit Residue Monitoring Plan (RMP)",
        "Establish EU-Accredited Testing Systems",
        "Register in EU TRACES System",
        "Await Addition to EU Approved List"
      ],
      icon: AlertCircle,
      color: "border-yellow-500"
    },
    {
      phase: "Registration & Compliance",
      description: "Required for all exporters",
      steps: [
        "Register for REX System via ZIMRA",
        "Consult ZimTrade for Market Intelligence",
        "Obtain Required Certifications"
      ],
      icon: FileCheck,
      color: "border-blue-500"
    },
    {
      phase: "Certification & Quality",
      description: "Meet EU quality standards",
      steps: [
        "GLOBALG.A.P. & GRASP Certification",
        "EU Organic Certification (if applicable)",
        "Quality Control: Class I, MRL Limits"
      ],
      icon: CheckCircle2,
      color: "border-green-500"
    },
    {
      phase: "Logistics & Documentation",
      description: "Final export preparation",
      steps: [
        "Prepare Export Documents",
        "Health & Phytosanitary Certificates",
        "Commercial Invoice with REX Statement",
        "Arrange Cold Chain Logistics"
      ],
      icon: Truck,
      color: "border-purple-500"
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/great_zimbabwe.jpeg')`,
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

      {/* Export Flow Diagram Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Zimbabwe to Germany Export Roadmap</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Step-by-step guide for exporting Zimbabwean products to the German market
            </p>
          </div>

          {/* Visual Flow Diagram */}
          <div className="max-w-5xl mx-auto mb-12">
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary text-primary-foreground text-center">
                <CardTitle className="text-xl">Export Process Flow</CardTitle>
                <CardDescription className="text-primary-foreground/80">
                  From farmer to German market (e.g., EDEKA)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex justify-center">
                  <img 
                    src="/images/export_flow.png" 
                    alt="Zimbabwe to Germany Export Flow Diagram"
                    className="max-w-full h-auto rounded-lg shadow-md"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {exportFlowSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className={`border-t-4 ${step.color}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="outline">Phase {index + 1}</Badge>
                    </div>
                    <CardTitle className="text-lg">{step.phase}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.steps.map((s, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <span className="mr-2 text-primary">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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

      {/* Contact CTA with Modal */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to Export?</CardTitle>
              <CardDescription className="text-base">
                Our trade specialists can help you navigate export requirements, connect with buyers, and access ZimTrade programs.
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
                    title="Trade Inquiry"
                    description="Fill out the form below and our trade specialists will contact you."
                    module="trade"
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* External Link to ZimTrade */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore More Trade Resources
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              For comprehensive trade information, export guides, and market intelligence, visit ZimTrade
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
