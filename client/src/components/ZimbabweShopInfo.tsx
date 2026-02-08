import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Globe, Store, Utensils, Heart, Zap, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ZimbabweShopInfo() {
  const [currentJerseyIndex, setCurrentJerseyIndex] = useState(0);
  
  const sportsJerseys = [
    { image: "/images/shop_sables.jpg", title: "Sables Rugby" },
    { image: "/images/shop_sports.jpg", title: "Chevrons Cricket" },
    { image: "/images/shop_warriors.jpg", title: "Warriors Football" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentJerseyIndex((prev) => (prev + 1) % sportsJerseys.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  return (
    <motion.div 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
      className="space-y-20 py-8"
    >
      {/* Hero Section for Zimbabwe Shop */}
      <motion.div variants={itemVariants} className="relative rounded-3xl overflow-hidden h-[500px] shadow-2xl group">
        <img 
          src="/images/zimbabwe_shop_hero.jpg" 
          alt="Zimbabwe Shop" 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zim-black/80 via-transparent to-zim-black/20 flex flex-col justify-end p-8 md:p-16">
          <div className="max-w-3xl space-y-4">
            <Badge className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-sm font-bold px-4 py-1 mb-2 uppercase tracking-wider">
              New Initiative
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              🇿🇼 Zimbabwe Shop
            </h2>
            <p className="text-xl md:text-2xl text-zim-gold font-semibold">
              EU Diaspora & Tourism Commerce Gateway
            </p>
            <p className="text-lg text-white/90 max-w-2xl leading-relaxed">
              Connecting Culture, Commerce, and Identity through a hybrid platform designed to bring the heart of Zimbabwe to the European market.
            </p>
          </div>
        </div>
      </motion.div>

      {/* The Hybrid Model Section */}
      <motion.div variants={itemVariants} className="space-y-8">
        <div className="max-w-3xl space-y-4">
          <h3 className="text-3xl md:text-4xl font-bold gradient-text">The Hybrid Model</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Zimbabwe Shop is a hybrid Diaspora Commerce + Tourism Promotion + Export Enablement Platform designed to connect Zimbabwean culture, products, and experiences with the European market.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="card-professional overflow-hidden group">
            <div className="h-2 bg-zim-green w-full" />
            <CardHeader>
              <div className="p-3 bg-zim-green/10 rounded-xl w-fit mb-4 group-hover:bg-zim-green group-hover:text-white transition-colors duration-300">
                <Globe className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">EU Online Store</CardTitle>
              <CardDescription>Digital-first commerce</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-zim-green" /> EU-wide shipping & logistics</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-zim-green" /> Multi-currency checkout</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-zim-green" /> Fast delivery (2–5 days)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="card-professional overflow-hidden group">
            <div className="h-2 bg-zim-gold w-full" />
            <CardHeader>
              <div className="p-3 bg-zim-gold/10 rounded-xl w-fit mb-4 group-hover:bg-zim-gold group-hover:text-zim-black transition-colors duration-300">
                <Store className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Flagship Store</CardTitle>
              <CardDescription>Physical brand experience</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-zim-gold" /> Cultural showroom & hub</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-zim-gold" /> Merchandise flagship</li>
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-zim-gold" /> Community engagement centre</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Product Categories */}
      <motion.div variants={itemVariants} className="space-y-12">
        <div className="text-center space-y-4">
          <Badge variant="outline" className="border-zim-green text-zim-green uppercase tracking-widest px-4">Collections</Badge>
          <h3 className="text-4xl md:text-5xl font-bold">Curated Zimbabwean Excellence</h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From official merchandise to handcrafted treasures, every item tells a story of heritage and quality.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Rotating National Sports Jerseys */}
          <div className="group hover-lift">
            <div className="relative h-64 rounded-t-2xl overflow-hidden bg-muted">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentJerseyIndex}
                  src={sportsJerseys[currentJerseyIndex].image} 
                  alt={sportsJerseys[currentJerseyIndex].title} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute bottom-2 right-2 flex gap-1">
                {sportsJerseys.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === currentJerseyIndex ? 'bg-zim-gold' : 'bg-white/50'}`} 
                  />
                ))}
              </div>
              <div className="absolute inset-0 bg-zim-green/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="p-6 bg-card border border-t-0 rounded-b-2xl shadow-sm h-full">
              <h4 className="text-xl font-bold mb-2">National Sports</h4>
              <p className="text-sm text-muted-foreground mb-4">Official gear for the Sables, Chevrons, and Warriors.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] font-semibold">Rugby Jerseys</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Cricket Kits</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Soccer Gear</Badge>
              </div>
            </div>
          </div>

          {/* Arts & Crafts */}
          <div className="group hover-lift">
            <div className="relative h-64 rounded-t-2xl overflow-hidden bg-muted">
              <img 
                src="/images/shop_crafts.jpg" 
                alt="Arts & Crafts" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-zim-red/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="p-6 bg-card border border-t-0 rounded-b-2xl shadow-sm h-full">
              <h4 className="text-xl font-bold mb-2">Arts & Crafts</h4>
              <p className="text-sm text-muted-foreground mb-4">Supporting rural artisans and women cooperatives.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] font-semibold">Stone Sculptures</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Binga Baskets</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Beaded Jewellery</Badge>
              </div>
            </div>
          </div>

          {/* Food & Nostalgia */}
          <div className="group hover-lift">
            <div className="relative h-64 rounded-t-2xl overflow-hidden bg-muted">
              <img 
                src="/images/shop_food.webp" 
                alt="Food & Nostalgia" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-zim-gold/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="p-6 bg-card border border-t-0 rounded-b-2xl shadow-sm h-full">
              <h4 className="text-xl font-bold mb-2">Food & Nostalgia</h4>
              <p className="text-sm text-muted-foreground mb-4">The flavors of home, fully EU-compliant.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] font-semibold">Mazoe & Cerevita</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Maputi Snacks</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Export-grade Dovi</Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ecosystem Impact Section */}
      <motion.div variants={itemVariants} className="space-y-8">
        <h3 className="text-3xl font-bold">The Ecosystem Impact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              title: "Tourism Funnel Effect", 
              icon: Globe, 
              desc: "Commerce drives awareness: Purchase → Discover → Book → Visit.",
              color: "zim-green"
            },
            { 
              title: "Identity Economy", 
              icon: Users, 
              desc: "Connecting the diaspora through belonging, memory, and pride.",
              color: "zim-gold"
            },
            { 
              title: "Market Validation", 
              icon: Zap, 
              desc: "Low-risk EU market testing for Zimbabwean SMEs and artisans.",
              color: "zim-red"
            }
          ].map((feature, i) => (
            <div key={i} className="p-6 bg-card border rounded-2xl flex flex-col gap-4 hover:border-primary/30 transition-colors shadow-sm">
              <div className={`h-12 w-12 rounded-xl bg-${feature.color}/10 flex items-center justify-center shrink-0`}>
                <feature.icon className={`h-6 w-6 text-${feature.color}`} />
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Innovation Features */}
      <motion.div variants={itemVariants} className="bg-muted/50 rounded-[2.5rem] p-8 md:p-16 border border-border/50">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <Badge className="bg-zim-red text-white uppercase">Innovation</Badge>
              <h3 className="text-3xl md:text-4xl font-bold">Future-Proof Features</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We are building more than just a shop; we're creating a digital bridge between Zimbabwe and the world.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <div className="space-y-3">
                <div className="h-12 w-12 bg-zim-green/10 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-zim-green" />
                </div>
                <h4 className="text-xl font-bold">Subscription Box</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">Monthly curated experiences featuring snacks, crafts, and exclusive cultural booklets.</p>
              </div>
              <div className="space-y-3">
                <div className="h-12 w-12 bg-zim-gold/10 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-zim-gold" />
                </div>
                <h4 className="text-xl font-bold">Product Passport</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">QR-based storytelling connecting customers directly to the artisan and region of origin.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Vision Statement */}
      <motion.div variants={itemVariants} className="relative py-20 px-8 md:px-16 rounded-[3rem] overflow-hidden text-center group">
        <div className="absolute inset-0 zim-gradient opacity-90 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <Heart className="h-16 w-16 text-zim-gold mx-auto" />
          <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight">
            "To build the leading global commercial gateway connecting Zimbabwe’s culture, products, tourism, and investment opportunities."
          </h3>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-zim-gold/50" />
            <p className="text-zim-gold font-bold uppercase tracking-[0.3em]">Our Vision</p>
            <div className="h-px w-12 bg-zim-gold/50" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
