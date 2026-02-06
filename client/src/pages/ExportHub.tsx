import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Building2, Truck, Shield, ExternalLink } from "lucide-react";

export default function ExportHub() {
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

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663323515850/kreNqAHriNxTszcg.jpg')`,
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

      {/* Market Requirements */}
      <section className="py-16">
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
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Key Certifications</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Essential certifications for accessing EU and German markets
            </p>
          </div>

          <Tabs defaultValue="organic" className="max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="organic">Organic</TabsTrigger>
              <TabsTrigger value="safety">Safety & Quality</TabsTrigger>
              <TabsTrigger value="trade">Fair Trade</TabsTrigger>
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
          </Tabs>
        </div>
      </section>

      {/* Potential Partners */}
      <section className="py-16">
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

      {/* Contact Form */}
      <section className="py-16">
        <div className="container">
          <ContactForm
            title="Need Export Support?"
            description="Our team can help you navigate German market requirements, connect with partners, and access export resources."
            module="export"
          />
        </div>
      </section>

      {/* Navigate to Success Stories */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore Sucess Stories?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              View some of the successful projects that have been funded through our platform and the impact they've made in Zimbabwe
            </p>
            <a href="/succsess-stories" >
              <button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-3 rounded-lg font-semibold">
                Explore Success Stories
              </button>
            </a>

          </div>
        </div>
      </section>
    </Layout>
  );
}
