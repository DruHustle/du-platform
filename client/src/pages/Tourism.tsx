import { useState } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Calendar, Shield, CreditCard, ExternalLink, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import ZimbabweShopInfo from "@/components/ZimbabweShopInfo";
import { motion } from "framer-motion";

export default function Tourism() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const attractions = [
    {
      name: "Victoria Falls",
      description: "One of the Seven Natural Wonders of the World, the world's largest sheet of falling water",
      image: "/images/victoria_falls.jpg",
      highlights: ["UNESCO World Heritage", "Adventure Hub", "Wildlife Viewing"]
    },
    {
      name: "Great Zimbabwe",
      description: "Ancient stone ruins showcasing medieval African civilization and architectural excellence",
      image: "/images/great_zimbabwe.jpeg",
      highlights: ["UNESCO World Heritage", "Historical Site", "Cultural Heritage"]
    },
    {
      name: "Kariba Dam",
      description: "One of the world's largest man-made lakes, perfect for houseboating and fishing",
      image: "/images/kariba_dam.webp",
      highlights: ["Water Sports", "Tiger Fishing", "Scenic Sunset"]
    },
    {
      name: "Balancing Rocks",
      description: "Iconic natural rock formations that symbolize Zimbabwe's unique geological heritage",
      image: "/images/balancing_rocks.jpg",
      highlights: ["National Symbol", "Photography", "Natural Wonder"]
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
      details: ["Yellow fever (if applicable)", "Malaria prophylaxis", "Travel insurance advised"]
    },
    {
      icon: CreditCard,
      title: "Payment Systems",
      description: "Multi-currency economy with USD widely accepted. Mobile money popular.",
      details: ["USD, ZAR, EUR accepted", "EcoCash mobile money", "Cards in major hotels"]
    },
    {
      icon: Calendar,
      title: "Best Time to Visit",
      description: "Year-round destination with dry season (May-October) being most popular.",
      details: ["May-Oct: Dry season", "Nov-Apr: Green season", "Falls best: Feb-May"]
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/images/victoria_falls.jpg')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zim-black/60 via-zim-black/40 to-zim-black/80" />
        
        <div className="relative z-10 container text-white text-center">
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center justify-center gap-3 mb-8">
              <Award className="h-10 w-10 text-zim-gold" />
              <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                Forbes #1 Destination 2025
              </Badge>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
              Zimbabwe: <span className="text-zim-gold italic">A World of Wonders</span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto text-white/90 leading-relaxed font-medium">
              Discover breathtaking landscapes, rich cultural heritage, and unforgettable experiences in the heart of Southern Africa.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-lg px-10 h-14 rounded-full font-bold">
                Plan Your Journey
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 text-lg px-10 h-14 rounded-full font-bold">
                Watch Experience
              </Button>
            </div>
          </motion.div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Zimbabwe Shop Section */}
      <section className="section-padding bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-zim-green/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-zim-gold/5 rounded-full blur-3xl -ml-20 -mb-20" />
        <div className="container relative z-10">
          <ZimbabweShopInfo />
        </div>
      </section>

      {/* Key Attractions */}
      <section className="section-padding bg-muted/30">
        <div className="container">
          <div className="text-center mb-16 space-y-4">
            <Badge variant="outline" className="border-zim-red text-zim-red uppercase tracking-widest px-4">Destinations</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">Must-Visit Attractions</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From ancient ruins to natural wonders, Zimbabwe offers experiences that will stay with you forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {attractions.map((attraction, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="card-professional group overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="relative h-80 overflow-hidden">
                    <img 
                      src={attraction.image} 
                      alt={attraction.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zim-black/80 to-transparent opacity-60" />
                    <div className="absolute bottom-6 left-6 right-6">
                       <h3 className="text-2xl font-bold text-white mb-2">{attraction.name}</h3>
                       <div className="flex flex-wrap gap-2">
                        {attraction.highlights.map((highlight, idx) => (
                          <span key={idx} className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white px-2 py-1 rounded">
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {attraction.description}
                    </p>
                    <Button variant="link" className="p-0 h-auto text-zim-green font-bold group-hover:gap-3 transition-all">
                      Explore destination <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Planning Your Visit */}
      <section className="section-padding bg-zim-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="container relative z-10">
          <div className="text-center mb-16 space-y-4">
            <Badge className="bg-zim-gold text-zim-black border-none uppercase tracking-widest px-4">Travel Guide</Badge>
            <h2 className="text-4xl md:text-5xl font-bold">Essential Planning Information</h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
             Everything you need to know to ensure a seamless and unforgettable adventure in Zimbabwe.
            </p>

            <div className="pt-4">
              <Button className="rounded-full px-8 h-12 bg-zim-green hover:bg-zim-green/90">
                Download Travel Kit
              </Button>
            </div>

          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {planningInfo.map((info, index) => {
          const Icon = info.icon;
          return (
            <motion.div
              key={index}
              whileHover={{ y: -10 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-[2rem] flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">

                      {/* Keeping your dynamic icon logic */}
                      <Icon className="h-6 w-6 text-zim-gold" />
                      <h3 className="text-2xl font-bold text-zim-gold">
                        {info.title}
                      </h3>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {info.description}
                    </p>
                  </div>

                </div>

                <ul className="space-y-4">
                  {/* Mapping 'details' from original data to the new 'features' style */}
                  {info.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-white/80 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-zim-gold shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </motion.div>
          );
        })}
      </div>

        </div>
      </section>

        {/* Contact Section */}
        <section className="py-16">
          <div className="container">
            <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Ready to Start Your Adventure?</CardTitle>
                <CardDescription className="text-base">
                  Our travel experts are ready to help you plan the perfect Zimbabwean experience tailored to your interests and needs.
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
                      title="Travel Inquiry"
                      description="Fill out the form below and our travel specialists will contact you."
                      module= "tourism"
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
              Explore More Tourism Information
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
              For detailed destination guides, booking information, and comprehensive tourism resources, visit the official Zimbabwe Tourism Authority website.
            </p>
            <a href="https://zimbabwetourism.net/" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Visit Zimbabwe Tourism Authority <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>

    </Layout>
  );
}
