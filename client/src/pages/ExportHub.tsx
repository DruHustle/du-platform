import { useState } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Users, Building2, Truck, Shield, AlertTriangle, CheckCircle, ArrowRight, Globe, Award, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function ExportHub() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const germanRequirements = [
    {
      category: "Food Products",
      requirements: ["EU Organic Certification (Bio-Siegel)", "HACCP Compliance", "Maximum Residue Levels (MRLs)", "Traceability Documentation"],
      price: "€15-45/kg (organic produce)",
      icon: "🍎"
    },
    {
      category: "Textiles & Leather",
      requirements: ["REACH Compliance", "CE Marking", "Oeko-Tex Standard 100", "Country of Origin Documentation"],
      price: "€25-120/item (leather goods)",
      icon: "👜"
    },
    {
      category: "Arts & Crafts",
      requirements: ["Product Safety Standards", "Import Declaration", "Cultural Heritage Documentation", "Fair Trade Certification (optional)"],
      price: "€30-500/piece (stone sculptures)",
      icon: "🎨"
    },
    {
      category: "Agricultural Products",
      requirements: ["Phytosanitary Certificate", "EU Plant Health Regulations", "Pesticide Residue Testing", "Quality Standards"],
      price: "€2-8/kg (fresh produce)",
      icon: "🌾"
    }
  ];

  const partners = [
    {
      type: "Retailers",
      icon: Building2,
      examples: ["REWE Group", "EDEKA", "Metro AG", "Kaufland", "Aldi Süd"],
      description: "Major German retail chains interested in authentic African products"
    },
    {
      type: "Educational Institutions",
      icon: Users,
      examples: ["German-African Business Association", "IHK (Chambers of Commerce)", "Trade Schools", "Universities"],
      description: "Institutions supporting trade education and partnerships"
    },
    {
      type: "Business Partners",
      icon: Building2,
      examples: ["Import/Export Agencies", "Trade Consultants", "Market Entry Specialists", "Distribution Partners"],
      description: "Professional services for market entry and expansion"
    },
    {
      type: "Logistics Partners",
      icon: Truck,
      examples: ["DHL Global Forwarding", "Kuehne + Nagel", "DB Schenker", "Freight Forwarders"],
      description: "Reliable shipping and customs clearance services"
    },
    {
      type: "Regulatory Partners",
      icon: Shield,
      examples: ["German Customs (Zoll)", "Certification Bodies", "Quality Assurance Agencies", "Trade Compliance Consultants"],
      description: "Support for regulatory compliance and certifications"
    }
  ];

  const regulatoryUpdates = [
    {
      title: "EU Sanctions Easing",
      date: "February 2025",
      description: "EU eased certain sanctions on Zimbabwe, improving trade relations and market access opportunities.",
      status: "positive"
    },
    {
      title: "Arms Embargo Expiration",
      date: "February 2026",
      description: "The EU arms embargo is set to expire, signaling further normalization of EU-Zimbabwe relations.",
      status: "positive"
    },
    {
      title: "EU-ESA EPA Benefits",
      description: "Zimbabwe benefits from tariff-free access to EU markets under the EU-ESA Interim Economic Partnership Agreement for qualifying products.",
      status: "positive"
    }
  ];

  const marketIntelligence = [
    {
      product: "Blueberries",
      status: "approved",
      requirements: [
        "Class I quality standards required",
        "LIDL-specific MRLs (33% of legal limit)",
        "Mandatory cold chain logistics",
        "GLOBALG.A.P. certification essential"
      ],
      buyers: ["LIDL", "EDEKA", "REWE"]
    },
    {
      product: "Honey",
      status: "pending",
      requirements: [
        "NOT YET EU APPROVED for direct export",
        "TRACES registration mandate (since Nov 2024)",
        "Residue Monitoring Plan (RMP) required",
        "EU-accredited testing systems needed"
      ],
      buyers: ["Pending approval process"]
    },
    {
      product: "Natural Oils (Marula)",
      status: "approved",
      requirements: [
        "German-language labeling mandatory",
        "Purity testing certification",
        "Organic certification preferred",
        "REACH compliance for cosmetic use"
      ],
      buyers: ["Cosmetic manufacturers", "Specialty retailers"]
    }
  ];

  const stats = [
    { value: "€2.8B", label: "EU-Zimbabwe Trade", icon: TrendingUp },
    { value: "50+", label: "Export Guides", icon: FileText },
    { value: "100+", label: "Partner Network", icon: Users },
    { value: "0%", label: "EPA Tariffs", icon: Award }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/export_hub_bg.jpg')`,
          }}
        >
          <div className="absolute inset-0 hero-gradient" />
        </div>
        
        <div className="relative z-10 container text-white py-16">
          <div className="max-w-4xl">
            <Badge className="mb-4 bg-secondary text-secondary-foreground shadow-lg">Export Knowledge Hub</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 hero-text-shadow">
              Access German Markets
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl opacity-95 leading-relaxed">
              Comprehensive guidance on regulations, certifications, and partnerships for exporting Zimbabwean products to Germany
            </p>
            <div className="flex flex-wrap gap-4">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-xl group">
                    Connect with an Expert
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <ContactForm
                    title="Export Support Request"
                    description="Fill out the form below and our export specialists will contact you."
                    module="export"
                  />
                </DialogContent>
              </Dialog>
              <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30">
                <Globe className="mr-2 h-5 w-5" />
                View Market Guide
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 bg-primary">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="text-center text-white">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-secondary" />
                  <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm opacity-80">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2026 Regulatory Updates */}
      <section className="section-padding bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-primary mb-4">Latest Updates</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">2026 Regulatory Updates</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Latest developments affecting Zimbabwe-EU trade relations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {regulatoryUpdates.map((update, index) => (
              <Card key={index} className="card-professional border-l-4 border-l-green-600">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    {update.date && <Badge variant="outline" className="font-medium">{update.date}</Badge>}
                  </div>
                  <CardTitle className="text-lg">{update.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{update.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Market Intelligence */}
      <section className="section-padding">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-secondary mb-4">Product Intelligence</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Product Market Intelligence</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Specific requirements and status for key Zimbabwean export products
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {marketIntelligence.map((item, index) => (
              <Card key={index} className={`card-professional overflow-hidden ${item.status === 'approved' ? 'border-t-4 border-t-green-600' : 'border-t-4 border-t-amber-500'}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl">{item.product}</CardTitle>
                    <Badge className={`${item.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                      {item.status === 'approved' ? 'EU Approved' : 'Pending Approval'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">Requirements:</p>
                    <ul className="space-y-2">
                      {item.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          {req.includes("NOT YET") ? (
                            <AlertTriangle className="h-4 w-4 mr-2 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={req.includes("NOT YET") ? "text-amber-700 font-medium" : "text-muted-foreground"}>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="pt-3 border-t">
                    <p className="text-sm font-semibold text-foreground mb-2">Target Buyers:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.buyers.map((buyer, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs font-medium">
                          {buyer}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Market Requirements */}
      <section className="section-padding bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-primary mb-4">Requirements</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">German Market Requirements</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Different products have different requirements. Find the specific regulations and pricing for your product category.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {germanRequirements.map((item, index) => (
              <Card key={index} className="card-professional border-l-4 border-l-secondary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      {item.category}
                    </span>
                    <Badge variant="outline" className="font-semibold text-primary">{item.price}</Badge>
                  </CardTitle>
                  <CardDescription className="text-base">Required certifications and documentation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {item.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start">
                        <FileText className="h-5 w-5 mr-3 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="section-padding">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-secondary mb-4">Certifications</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Certifications</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Essential certifications for accessing EU and German markets
            </p>
          </div>

          <Tabs defaultValue="organic" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50">
              <TabsTrigger value="organic" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Organic</TabsTrigger>
              <TabsTrigger value="safety" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Safety & Quality</TabsTrigger>
              <TabsTrigger value="trade" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Fair Trade</TabsTrigger>
              <TabsTrigger value="globalg" className="py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">GLOBALG.A.P.</TabsTrigger>
            </TabsList>
            
            <TabsContent value="organic" className="mt-8">
              <Card className="card-professional">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">EU Organic Certification (Bio-Siegel)</CardTitle>
                      <CardDescription>Required for organic food products in the EU market</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-foreground">Requirements:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {["No synthetic pesticides or fertilizers", "No GMOs (Genetically Modified Organisms)", "Annual inspection by authorized certification body", "Detailed documentation of production methods"].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-foreground">Certification Bodies in Zimbabwe:</h4>
                    <p className="text-muted-foreground">Contact Standards Association of Zimbabwe (SAZ) for approved certification partners</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="safety" className="mt-8">
              <Card className="card-professional">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Shield className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">REACH & CE Marking</CardTitle>
                      <CardDescription>Safety and quality standards for consumer products</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-foreground">REACH Compliance:</h4>
                      <ul className="space-y-2">
                        {["Registration of chemical substances", "Safety data sheets", "Restriction of hazardous substances"].map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-foreground">CE Marking:</h4>
                      <ul className="space-y-2">
                        {["Conformity assessment", "Technical documentation", "Declaration of conformity"].map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trade" className="mt-8">
              <Card className="card-professional">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-amber-100 rounded-xl">
                      <Users className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Fair Trade Certification</CardTitle>
                      <CardDescription>Ethical sourcing and fair prices for producers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-foreground">Benefits:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {["Premium prices for certified products", "Access to ethical consumer markets", "Long-term trading partnerships", "Community development funds"].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-foreground">Certification Process:</h4>
                    <p className="text-muted-foreground">Contact Fairtrade Africa or local representatives for certification guidance</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="globalg" className="mt-8">
              <Card className="card-professional">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <Globe className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">GLOBALG.A.P. & GRASP</CardTitle>
                      <CardDescription>Good Agricultural Practices certification for fresh produce</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-foreground">GLOBALG.A.P. Requirements:</h4>
                      <ul className="space-y-2">
                        {["Food safety and traceability", "Environmental management", "Worker health and safety", "Integrated pest management"].map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-foreground">GRASP Add-on:</h4>
                      <ul className="space-y-2">
                        {["Social practices assessment", "Worker welfare standards", "Required by major EU retailers"].map((item, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Potential Partners */}
      <section className="section-padding bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="badge-primary mb-4">Network</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Potential Partners</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Connect with retailers, educational institutions, business partners, logistics providers, and regulatory experts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner, index) => {
              const Icon = partner.icon;
              return (
                <Card key={index} className="card-professional group">
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="feature-icon group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">{partner.type}</CardTitle>
                    </div>
                    <CardDescription className="text-base">{partner.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Examples:</p>
                      <div className="flex flex-wrap gap-2">
                        {partner.examples.slice(0, 3).map((example, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {example}
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

      {/* Contact CTA */}
      <section className="section-padding">
        <div className="container">
          <Card className="max-w-4xl mx-auto text-center card-professional border-t-4 border-t-primary overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            <CardHeader className="relative">
              <CardTitle className="text-2xl md:text-3xl">Need Export Support?</CardTitle>
              <CardDescription className="text-lg">
                Our team can help you navigate German market requirements, connect with partners, and access export resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all group">
                    Connect with an Expert
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <ContactForm
                    title="Export Support Request"
                    description="Fill out the form below and our export specialists will contact you."
                    module="export"
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Navigate to Success Stories */}
      <section className="section-padding-sm bg-primary text-primary-foreground">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Explore Success Stories
              </h2>
              <p className="text-lg opacity-95">
                View successful projects funded through our platform and their impact in Zimbabwe
              </p>
            </div>
            <Link href="/success-stories">
              <Button size="lg" variant="secondary" className="shadow-lg group">
                Explore Success Stories
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
