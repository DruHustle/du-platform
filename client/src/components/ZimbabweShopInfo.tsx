import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Globe, Store, Utensils, Heart, Zap, Truck, Users, ArrowRight } from "lucide-react";
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
      transition: { staggerChildren: 0.1 }
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
      // Reduced vertical spacing between major sections from 24 to 16
      className="max-w-7xl mx-auto px-4 space-y-16 py-12"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="relative rounded-3xl overflow-hidden min-h-[500px] shadow-2xl group">
        <img 
          src="/images/zimbabwe_shop_hero.jpg" 
          alt="Zimbabwe Shop" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="relative z-10 min-h-[500px] bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-8 md:p-16">
          <div className="max-w-3xl space-y-4">
            <Badge className="bg-zim-gold text-zim-black hover:bg-zim-gold/90 text-sm font-bold px-4 py-1 mb-2 uppercase tracking-wider w-fit">
              New Initiative
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              🇿🇼 Zimbabwe Shop
            </h2>
            <p className="text-xl md:text-2xl text-zim-gold font-semibold">
              EU Diaspora & Tourism Commerce Gateway
            </p>
            <p className="text-lg text-white/90 max-w-2xl leading-relaxed">
              Connecting Culture, Commerce, and Identity through a platform designed to bring the heart of Zimbabwe to the European market.
            </p>
          </div>
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
          <div className="flex flex-col group h-full bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="relative h-64 overflow-hidden bg-muted">
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
              <div className="absolute bottom-4 right-4 flex gap-1.5 z-10">
                {sportsJerseys.map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full transition-colors ${i === currentJerseyIndex ? 'bg-zim-gold' : 'bg-white/50'}`} />
                ))}
              </div>
              <div className="absolute inset-0 bg-zim-green/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h4 className="text-xl font-bold mb-2">National Sports</h4>
              <p className="text-sm text-muted-foreground mb-6 flex-grow">Official gear for the Sables, Chevrons, and Warriors.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] font-semibold">Rugby Jerseys</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Cricket Kits</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Soccer Gear</Badge>
              </div>
            </div>
          </div>

          {/* Arts & Crafts */}
          <div className="flex flex-col group h-full bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="relative h-64 overflow-hidden bg-muted">
              <img 
                src="/images/shop_crafts.jpg" 
                alt="Arts & Crafts" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-zim-red/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h4 className="text-xl font-bold mb-2">Arts & Crafts</h4>
              <p className="text-sm text-muted-foreground mb-6 flex-grow">Supporting rural artisans and women cooperatives.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] font-semibold">Stone Sculptures</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Binga Baskets</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Beaded Jewellery</Badge>
              </div>
            </div>
          </div>

          {/* Food & Nostalgia */}
          <div className="flex flex-col group h-full bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="relative h-64 overflow-hidden bg-muted">
              <img 
                src="/images/shop_food.webp" 
                alt="Food & Nostalgia" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-zim-gold/10 group-hover:bg-transparent transition-colors duration-500" />
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h4 className="text-xl font-bold mb-2">Food & Nostalgia</h4>
              <p className="text-sm text-muted-foreground mb-6 flex-grow">The flavors of home, fully EU-compliant.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[10px] font-semibold">Mazoe & Cerevita</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Maputi Snacks</Badge>
                <Badge variant="secondary" className="text-[10px] font-semibold">Export-grade Dovi</Badge>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Vision Statement - Optimized spacing here */}
      <motion.div 
        variants={itemVariants} 
        className="relative py-12 px-8 md:px-16 rounded-[2.5rem] overflow-hidden text-center group shadow-xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zim-green via-zim-black to-zim-red opacity-90 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-6">
          <Heart className="h-10 w-10 text-zim-gold mx-auto mb-2" />
          <h3 className="text-2xl md:text-3xl font-bold text-white leading-relaxed px-4">
            "To build the leading global commercial gateway connecting Zimbabwe’s culture, products, tourism, and investment opportunities."
          </h3>
          <div className="flex items-center justify-center gap-6">
            <div className="h-px w-12 bg-zim-gold/50" />
            <p className="text-zim-gold text-sm font-black uppercase tracking-[0.3em]">Our Vision</p>
            <div className="h-px w-12 bg-zim-gold/50" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}