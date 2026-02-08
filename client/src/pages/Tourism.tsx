import { useState } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Calendar, Shield, CreditCard, ExternalLink, Award, CheckCircle2 } from "lucide-react";

export default function Tourism() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const attractions = [
    {
      name: "Victoria Falls",
      description: "One of the Seven Natural Wonders of the World, the world's largest sheet of falling water",
      image: "/images/victoria_falls.jpg",
      highlights: ["UNESCO World Heritage Site", "Adventure Activities", "Wildlife Viewing"]
    },
    {
      name: "Great Zimbabwe",
      description: "Ancient stone ruins showcasing medieval African civilization and architectural excellence",
      image: "/images/great_zimbabwe.jpeg",
      highlights: ["UNESCO World Heritage Site", "Historical Significance", "Cultural Heritage"]
    },
    {
      name: "Kariba Dam",
      description: "One of the world's largest man-made lakes, perfect for houseboating and fishing",
      image: "/images/kariba_dam.webp",
      highlights: ["Water Sports", "Fishing", "Scenic Beauty"]
    },
    {
      name: "Balancing Rocks",
      description: "Iconic natural rock formations that symbolize Zimbabwe's unique geological heritage",
      image: "/images/balancing_rocks.jpg",
      highlights: ["Natural Wonder", "Photography", "National Symbol"]
    }
  ];

  const planningInfo = [
    {
      icon: MapPin,
      title: "Visa Requirements",
      description: "Most visitors can obtain visa on arrival. E-visa system available for advance applications.",
      details: ["Tourist visa: $30-75", "Valid passport required", "6 months validity recommended"]
    },
    {
      icon: Shield,
      title: "Health & Safety",
      description: "Zimbabwe is generally safe for tourists. Standard travel precautions recommended.",
      details: ["Yellow fever certificate required from endemic areas", "Malaria prophylaxis recommended", "Travel insurance advised"]
    },
    {
      icon: CreditCard,
      title: "Payment Systems",
      description: "Multi-currency economy with USD widely accepted. Mobile money popular.",
      details: ["USD, ZAR, EUR accepted", "EcoCash mobile money", "Credit cards in major hotels"]
    },
    {
      icon: Calendar,
      title: "Best Time to Visit",
      description: "Year-round destination with dry season (May-October) being most popular.",
      details: ["May-October: Dry season", "November-April: Green season", "Victoria Falls best: February-May"]
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/victoria_falls.jpg')`,
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        <div className="relative z-10 container text-white text-center px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Award className="h-8 w-8 md:h-12 md:w-12 text-secondary" />
            <Badge className="bg-secondary text-secondary-foreground text-sm md:text-lg px-4 py-1 md:py-2">
              Forbes #1 Destination 2025
            </Badge>
          </div>
          <h1 className="text-3xl md:text-6xl font-bold mb-4 text-white">
            Zimbabwe: A World of Wonders
          </h1>
          <p className="text-lg md:text-2xl mb-6 max-w-3xl mx-auto opacity-95 text-white/90">
            Discover breathtaking landscapes, rich cultural heritage, and unforgettable experiences
          </p>
        </div>
      </section>

      {/* Key Attractions */}
      <section className="py-12 md:py-20">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Must-Visit Attractions</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
              From ancient ruins to natural wonders, Zimbabwe offers experiences that will stay with you forever
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {attractions.map((attraction, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-all border-t-4 border-t-primary">
                <div className="relative h-48 md:h-64 overflow-hidden">
                  <img 
                    src={attraction.image} 
                    alt={attraction.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">{attraction.name}</CardTitle>
                  <CardDescription className="text-sm md:text-base">{attraction.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {attraction.highlights.map((highlight, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planning Your Visit */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Plan Your Visit</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
              Essential information to help you prepare for your Zimbabwe adventure
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {planningInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg md:text-xl">{info.title}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {info.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start text-xs md:text-sm">
                          <CheckCircle2 className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{detail}</span>
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

      {/* Diaspora Tourism Packages */}
      <section className="py-12 md:py-20">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Diaspora Homecoming Packages</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto">
              Special packages designed for Zimbabweans abroad reconnecting with home
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Heritage Tour",
                duration: "7 Days",
                highlights: ["Great Zimbabwe", "Matobo Hills", "Cultural Villages", "Traditional Ceremonies"],
                price: "From $1,200"
              },
              {
                title: "Adventure Package",
                duration: "10 Days",
                highlights: ["Victoria Falls", "Hwange Safari", "Kariba Houseboat", "White Water Rafting"],
                price: "From $2,500"
              },
              {
                title: "Family Reunion",
                duration: "14 Days",
                highlights: ["Flexible Itinerary", "Family Gatherings", "City Tours", "Rural Visits"],
                price: "Custom Pricing"
              }
            ].map((pkg, index) => (
              <Card key={index} className="border-t-4 border-t-secondary hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">{pkg.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {pkg.duration}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <ul className="space-y-2">
                    {pkg.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start text-xs md:text-sm">
                        <CheckCircle2 className="mr-2 h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0 mt-auto">
                  <div className="pt-4 border-t">
                    <p className="text-lg font-bold text-primary">{pkg.price}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA with Modal */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container px-4">
          <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Plan Your Zimbabwe Adventure</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Need help planning your trip? Our tourism team can assist with bookings, itineraries, and special diaspora packages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="text-base md:text-lg px-8">
                    Connect with an Expert
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <ContactForm
                    title="Tourism Inquiry"
                    description="Fill out the form below and our tourism specialists will contact you."
                    module="tourism"
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* External Link to Zimbabwe Tourism */}
      <section className="py-12 md:py-20 bg-primary text-primary-foreground">
        <div className="container px-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4 text-white">
              Explore More Tourism Information
            </h2>
            <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto opacity-95 text-white/90">
              For detailed destination guides, booking information, and comprehensive tourism resources, visit the official Zimbabwe Tourism Authority website
            </p>
            <a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-base md:text-lg px-8">
                Visit Zimbabwe Tourism <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
