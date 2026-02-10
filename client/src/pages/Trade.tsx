import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Package, TrendingUp, Award, Globe, ExternalLink, Users, FileCheck, Truck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

export default function Trade() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isFlowDiagramOpen, setIsFlowDiagramOpen] = useState(false);

  const heroSlides = [
    {
      image: "/images/african_trade.jpg",
      badge: "Trade Excellence",
      title: "Zimbabwe Export Hub",
      subtitle: "Connecting Zimbabwean producers with global markets through diaspora networks and trade expertise",
      highlight: "$50M+ Exports"
    },
    {
      image: "/images/leather_products.jpg",
      badge: "Premium Exports",
      title: "Leather & Craftsmanship",
      subtitle: "Authentic African leather goods and accessories reaching European luxury markets",
      highlight: "3 Countries"
    },
    {
      image: "/images/horticulture.jpg",
      badge: "Fresh Produce",
      title: "Organic Horticulture",
      subtitle: "EU-certified organic vegetables and flowers supplying international supermarket chains",
      highlight: "EU Markets"
    },
    {
      image: "/images/arts_crafts.jpg",
      badge: "Cultural Heritage",
      title: "Arts & Stone Sculptures",
      subtitle: "Traditional Zimbabwean art and Shona stone sculptures in galleries worldwide",
      highlight: "Global Reach"
    }
  ];

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, []);

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
      image: "/images/minerals_mining.png",
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
        "Obtain Required Certifications",
        "Complete Export Registration with Relevant Authorities"
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
        "Quality Control: Class I, MRL Limits",
        "Third-Party Audits & Compliance Verification"
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
      {/* Hero Carousel Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentHeroIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <motion.div 
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${heroSlides[currentHeroIndex].image}')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zim-black/70 via-zim-black/50 to-zim-black/85" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container text-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Globe className="h-8 w-8 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex].badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex].title}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-white/90 leading-relaxed font-medium max-w-3xl">
                {heroSlides[currentHeroIndex].subtitle}
              </p>
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="h-6 w-6 text-zim-green" />
                <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex].highlight}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_, idx) => (
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

      {/* Export Process Flow Section */}
      <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              Export Roadmap
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Zimbabwe to Germany Export Process</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Professional step-by-step guidance for exporting Zimbabwean products to the German and EU markets
            </p>
          </div>

          {/* View Flow Diagram Button */}
          <div className="text-center mb-8">
            <Dialog open={isFlowDiagramOpen} onOpenChange={setIsFlowDiagramOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="border-2 border-zim-gold text-zim-gold hover:bg-zim-gold hover:text-zim-black font-bold">
                  <Package className="mr-2 h-5 w-5" />
                  View Complete Flow Diagram
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Export Process Flow</h3>
                    <p className="text-muted-foreground">From farmer to German market (e.g., EDEKA)</p>
                  </div>
                  <div className="flex justify-center">
                    <img 
                      src="/images/export_flow.png" 
                      alt="Zimbabwe to Germany Export Flow Diagram"
                      className="max-w-full h-auto rounded-lg shadow-md"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Modern Flow Visualization */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="relative">
              {/* Connection Lines */}
              <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 via-blue-500 via-green-500 to-purple-500 transform -translate-y-1/2 z-0" />
              
              {/* Flow Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                {exportFlowSteps.map((step, index) => {
                  const Icon = step.icon;
                  const colorClasses: Record<string, string> = {
                    'border-yellow-500': 'from-yellow-500/20 to-yellow-500/5 border-yellow-500 text-yellow-600',
                    'border-blue-500': 'from-blue-500/20 to-blue-500/5 border-blue-500 text-blue-600',
                    'border-green-500': 'from-green-500/20 to-green-500/5 border-green-500 text-green-600',
                    'border-purple-500': 'from-purple-500/20 to-purple-500/5 border-purple-500 text-purple-600'
                  };
                  const gradientClass = colorClasses[step.color] || colorClasses['border-yellow-500'];
                  
                  return (
                    <div key={index} className="relative group">
                      {/* Step Number Badge */}
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradientClass.split(' ')[0]} ${gradientClass.split(' ')[1]} border-4 border-background flex items-center justify-center shadow-lg`}>
                          <span className="text-lg font-bold">{index + 1}</span>
                        </div>
                      </div>

                      {/* Step Card */}
                      <Card className={`mt-8 border-2 ${step.color} hover:shadow-2xl transition-all duration-300 group-hover:scale-105 bg-gradient-to-br ${gradientClass.split(' ')[0]} ${gradientClass.split(' ')[1]}`}>
                        <CardHeader className="pb-4">
                          <div className="flex justify-center mb-4">
                            <div className={`p-4 rounded-2xl bg-background shadow-md border-2 ${step.color}`}>
                              <Icon className={`h-8 w-8 ${gradientClass.split(' ')[2]}`} />
                            </div>
                          </div>
                          <CardTitle className="text-xl font-bold text-center mb-2">{step.phase}</CardTitle>
                          <CardDescription className="text-center text-sm font-medium">{step.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-background/80 rounded-lg p-4 backdrop-blur-sm">
                            <ul className="space-y-3">
                              {step.steps.map((s, idx) => (
                                <li key={idx} className="flex items-start text-sm">
                                  <CheckCircle2 className={`h-4 w-4 mr-2 mt-0.5 flex-shrink-0 ${gradientClass.split(' ')[2]}`} />
                                  <span className="leading-tight">{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Arrow Connector (Mobile) */}
                      {index < exportFlowSteps.length - 1 && (
                        <div className="lg:hidden flex justify-center my-4">
                          <div className={`w-1 h-8 bg-gradient-to-b ${step.color.replace('border-', 'from-')} to-transparent`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <Card className="max-w-3xl mx-auto border-2 border-zim-gold/30 bg-gradient-to-br from-zim-gold/5 to-transparent">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Need Export Assistance?</h3>
                <p className="text-muted-foreground mb-6">
                  Our diaspora network and trade experts are ready to guide you through every step of the export process
                </p>
                <Button size="lg" className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 font-bold">
                  <Package className="mr-2 h-5 w-5" />
                  Get Export Support
                </Button>
              </CardContent>
            </Card>
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
