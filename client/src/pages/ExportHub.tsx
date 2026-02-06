import { useState } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Users, Building2, Truck, Shield, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function ExportHub() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const germanRequirements = [
    {
      category: "Food Products",
      requirements: ["EU Organic Certification (Bio-Siegel)", "HACCP Compliance", "Maximum Residue Levels (MRLs)", "Traceability Documentation"],
      price: "€15-45/kg (organic produce)"
    },
    {
      category: "Textiles & Leather",
      requirements: ["REACH Compliance", "CE Marking", "Oeko-Tex Standard 100", "Country of Origin Documentation"],
      price: "€25-120/item (leather goods)"
    },
    {
      category: "Arts & Crafts",
      requirements: ["Product Safety Standards", "Import Declaration", "Cultural Heritage Documentation", "Fair Trade Certification (optional)"],
      price: "€30-500/piece (stone sculptures)"
    },
    {
      category: "Agricultural Products",
      requirements: ["Phytosanitary Certificate", "EU Plant Health Regulations", "Pesticide Residue Testing", "Quality Standards"],
      price: "€2-8/kg (fresh produce)"
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

  // 2026 Regulatory Updates
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

  // Product-specific market intelligence
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

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/export_hub_bg.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        </div>
        
        <div className="relative z-10 container text-white">
          <Badge className="mb-4 bg-secondary text-secondary-foreground">Export Knowledge Hub</Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Access German Markets
          </h1>
          <p className="text-xl md:text-2xl mb-6 max-w-3xl opacity-95">
            Comprehensive guidance on regulations, certifications, and partnerships for exporting Zimbabwean products to Germany
          </p>
        </div>
      </section>

      {/* 2026 Regulatory Updates */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">2026 Regulatory Updates</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Latest developments affecting Zimbabwe-EU trade relations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {regulatoryUpdates.map((update, index) => (
              <Card key={index} className="border-t-4 border-t-green-600">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    {update.date && <Badge variant="outline">{update.date}</Badge>}
                  </div>
                  <CardTitle className="text-lg">{update.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{update.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Market Intelligence */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Product Market Intelligence</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Specific requirements and status for key Zimbabwean export products
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {marketIntelligence.map((item, index) => (
              <Card key={index} className={`border-t-4 ${item.status === 'approved' ? 'border-t-green-600' : 'border-t-yellow-500'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-xl">{item.product}</CardTitle>
                    <Badge className={item.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {item.status === 'approved' ? 'EU Approved' : 'Pending Approval'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Requirements:</p>
                    <ul className="space-y-2">
                      {item.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          {req.includes("NOT YET") ? (
                            <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <FileText className="h-4 w-4 mr-2 text-primary flex-shrink-0 mt-0.5" />
                          )}
                          <span className={req.includes("NOT YET") ? "text-yellow-700 font-medium" : ""}>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-2">Target Buyers:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.buyers.map((buyer, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
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
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">German Market Requirements</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Different products have different requirements. Find the specific regulations and pricing for your product category.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {germanRequirements.map((item, index) => (
              <Card key={index} className="border-t-4 border-t-secondary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {item.category}
                    <Badge variant="outline">{item.price}</Badge>
                  </CardTitle>
                  <CardDescription>Required certifications and documentation</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {item.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start">
                        <FileText className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{req}</span>
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
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Certifications</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Essential certifications for accessing EU and German markets
            </p>
          </div>

          <Tabs defaultValue="organic" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="organic">Organic</TabsTrigger>
              <TabsTrigger value="safety">Safety & Quality</TabsTrigger>
              <TabsTrigger value="trade">Fair Trade</TabsTrigger>
              <TabsTrigger value="globalg">GLOBALG.A.P.</TabsTrigger>
            </TabsList>
            
            <TabsContent value="organic" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>EU Organic Certification (Bio-Siegel)</CardTitle>
                  <CardDescription>Required for organic food products in the EU market</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Requirements:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>No synthetic pesticides or fertilizers</li>
                      <li>No GMOs (Genetically Modified Organisms)</li>
                      <li>Annual inspection by authorized certification body</li>
                      <li>Detailed documentation of production methods</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Certification Bodies in Zimbabwe:</h4>
                    <p className="text-sm text-muted-foreground">Contact Standards Association of Zimbabwe (SAZ) for approved certification partners</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="safety" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>REACH & CE Marking</CardTitle>
                  <CardDescription>Safety and quality standards for consumer products</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">REACH Compliance:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Registration of chemical substances</li>
                      <li>Safety data sheets</li>
                      <li>Restriction of hazardous substances</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">CE Marking:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Conformity assessment</li>
                      <li>Technical documentation</li>
                      <li>Declaration of conformity</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trade" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Fair Trade Certification</CardTitle>
                  <CardDescription>Ethical sourcing and fair prices for producers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Benefits:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Premium prices for certified products</li>
                      <li>Access to ethical consumer markets</li>
                      <li>Long-term trading partnerships</li>
                      <li>Community development funds</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Certification Process:</h4>
                    <p className="text-sm text-muted-foreground">Contact Fairtrade Africa or local representatives for certification guidance</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="globalg" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>GLOBALG.A.P. & GRASP</CardTitle>
                  <CardDescription>Good Agricultural Practices certification for fresh produce</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">GLOBALG.A.P. Requirements:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Food safety and traceability</li>
                      <li>Environmental management</li>
                      <li>Worker health and safety</li>
                      <li>Integrated pest management</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">GRASP Add-on:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Social practices assessment</li>
                      <li>Worker welfare standards</li>
                      <li>Required by major EU retailers</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Potential Partners */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Potential Partners</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Connect with retailers, educational institutions, business partners, logistics providers, and regulatory experts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner, index) => {
              const Icon = partner.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{partner.type}</CardTitle>
                    </div>
                    <CardDescription>{partner.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Examples:</p>
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

      {/* Contact CTA with Modal */}
      <section className="py-16">
        <div className="container">
          <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Need Export Support?</CardTitle>
              <CardDescription className="text-base">
                Our team can help you navigate German market requirements, connect with partners, and access export resources.
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
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore Success Stories
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              View some of the successful projects that have been funded through our platform and the impact they've made in Zimbabwe
            </p>
            <Link href="/success-stories">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Explore Success Stories
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
