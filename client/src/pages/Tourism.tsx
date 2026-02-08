import React, { useState } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Calendar, Shield, CreditCard, ExternalLink, Award, Heart, Utensils, Trophy, Palette } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export default function Tourism() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const excellenceItems = [
    {
      title: "National Sports",
      description: "Experience the passion of Zimbabwean sports, from world-class cricket and rugby to our legendary football atmosphere.",
      image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=800",
      icon: Trophy,
      highlights: ["International Cricket", "Rugby Sevens", "Local Football"]
    },
    {
      title: "Arts and Crafts",
      description: "Discover the world-renowned Shona stone sculpture and intricate basketry that tells the story of our heritage.",
      image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800",
      icon: Palette,
      highlights: ["Stone Sculpture", "Basket Weaving", "Contemporary Art"]
    },
    {
      title: "Food and Nostalgia",
      description: "Taste the authentic flavors of Zimbabwe, from Sadza and Nyama to the unique snacks that bring back home memories.",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800",
      icon: Utensils,
      highlights: ["Traditional Cuisine", "Street Food", "Homegrown Flavors"]
    }
  ];

  const attractions = [
    {
      name: "Victoria Falls",
      description: "The Mosi-oa-Tunya (Smoke that Thunders) - the world's largest curtain of falling water.",
      image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=800",
      highlights: ["UNESCO World Heritage", "Devil's Pool", "Sunset Cruises"]
    },
    {
      name: "Great Zimbabwe",
      description: "Ancient stone city that was the capital of the Kingdom of Zimbabwe during the Late Iron Age.",
      image: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?auto=format&fit=crop&q=80&w=800",
      highlights: ["Medieval Architecture", "Historical Tours", "Cultural Center"]
    },
    {
      name: "Hwange National Park",
      description: "Zimbabwe's largest natural reserve, home to one of the world's largest elephant populations.",
      image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&q=80&w=800",
      highlights: ["Big Five Safari", "Walking Safaris", "Luxury Lodges"]
    },
    {
      name: "Lake Kariba",
      description: "The world's largest man-made lake, offering spectacular sunsets and world-class tiger fishing.",
      image: "https://images.unsplash.com/photo-1506477331477-33d5d8b3dc85?auto=format&fit=crop&q=80&w=800",
      highlights: ["Houseboating", "Tiger Fishing", "Matusadona Wildlife"]
    }
  ];

  const planningInfo = [
    {
      icon: MapPin,
      title: "Travel Essentials",
      description: "Simple visa processes and multiple entry points make visiting home easier than ever.",
      details: ["E-visa system available", "Direct flights to major hubs", "Regional transport links"]
    },
    {
      icon: CreditCard,
      title: "Money & Payments",
      description: "Multi-currency system with digital payments widely accepted across the country.",
      details: ["USD widely used", "Contactless payments", "Mobile money convenience"]
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&q=80&w=1200')`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        </div>
        
        <div className="relative z-10 container text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Award className="h-12 w-12" />
            <Badge className="bg-secondary text-secondary-foreground text-lg px-4 py-2">
              Forbes #1 Destination 2025
            </Badge>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Zimbabwe: A World of Wonders
          </h1>
          <p className="text-xl md:text-2xl mb-6 max-w-3xl mx-auto opacity-95">
            Discover breathtaking landscapes, rich cultural heritage, and unforgettable experiences
          </p>
        </div>
      </section>

      {/* Curated Zimbabwean Excellence Carousel */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Curated Zimbabwean Excellence</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Celebrating the best of our culture, sports, and heritage
            </p>
          </div>

          <div className="px-12">
            <Carousel className="w-full max-w-5xl mx-auto">
              <CarouselContent>
                {excellenceItems.map((item, index) => (
                  <CarouselItem key={index}>
                    <Card className="overflow-hidden border-none shadow-none bg-transparent">
                      <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="relative h-80 rounded-2xl overflow-hidden shadow-xl">
                          <img 
                            src={item.image} 
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-primary/90 text-white flex gap-2 py-2 px-4">
                              <item.icon className="h-4 w-4" />
                              {item.title}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <h3 className="text-3xl font-bold text-primary">{item.title}</h3>
                          <p className="text-xl text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {item.highlights.map((h, i) => (
                              <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                                {h}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Must-Visit Attractions Carousel */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Must-Visit Attractions</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Explore the iconic destinations that make Zimbabwe a world-class travel choice
            </p>
          </div>

          <div className="px-12">
            <Carousel className="w-full max-w-5xl mx-auto">
              <CarouselContent>
                {attractions.map((attraction, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
                    <Card className="mx-2 overflow-hidden hover:shadow-xl transition-all h-full flex flex-col border-t-4 border-t-accent">
                      <div className="relative h-64 overflow-hidden">
                        <img 
                          src={attraction.image} 
                          alt={attraction.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardHeader>
                        <CardTitle className="text-2xl">{attraction.name}</CardTitle>
                        <CardDescription className="text-base line-clamp-2">{attraction.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="mt-auto">
                        <div className="flex flex-wrap gap-2">
                          {attraction.highlights.map((highlight, idx) => (
                            <Badge key={idx} variant="secondary">
                              {highlight}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Simplified Planning Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Travel Simplified</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know for a smooth journey back home
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {planningInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{info.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {info.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <span className="mr-2 text-primary">•</span>
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
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Diaspora Homecoming Packages</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
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
              <Card key={index} className="border-t-4 border-t-secondary hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-2xl">{pkg.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {pkg.duration}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {pkg.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start text-sm">
                        <span className="mr-2 text-primary">✓</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-lg font-bold text-primary">{pkg.price}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA with Modal */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary shadow-xl">
            <CardHeader>
              <CardTitle className="text-3xl">Plan Your Zimbabwe Adventure</CardTitle>
              <CardDescription className="text-lg">
                Need help planning your trip? Our tourism team can assist with bookings, itineraries, and special diaspora packages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="text-lg px-12 py-6">
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
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Explore More Tourism Information
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              For detailed destination guides, booking information, and comprehensive tourism resources, visit the official Zimbabwe Tourism Authority website
            </p>
            <a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Visit Zimbabwe Tourism <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
