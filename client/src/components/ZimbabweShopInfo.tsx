import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FileText, Sparkles, CheckCircle } from "lucide-react";

export default function ZimbabweShopInfo() {
  const { t } = useTranslation();
  const [currentJerseyIndex, setCurrentJerseyIndex] = useState(0);
  const [currentCraftsIndex, setCurrentCraftsIndex] = useState(0);
  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);
  
  const sportsJerseys = [
    { image: "/images/sports_rugby_jersey.jpg", title: "Sables Rugby Home Kit" },
    { image: "/images/sports_cricket_jersey.png", title: "Chevrons World Cup Jersey" },
    { image: "/images/sports_football_jersey.png", title: "Warriors Football Kit" },
  ];

  const artsCrafts = [
    { image: "/images/shop_crafts.jpg", title: t('shop.crafts_title') },
    { image: "/images/crafts_stone_sculptures1.png", title: "Shona Stone Sculptures" },
    { image: "/images/crafts_stone_sculptures2.jpg", title: "Traditional Stone Art" },
    { image: "/images/crafts_stone_sculptures3.jpg", title: "Stone Sculpture Collection" },
    { image: "/images/crafts_binga_baskets1.jpg", title: "Binga Baskets" },
    { image: "/images/crafts_binga_baskets2.jpg", title: "Traditional Baskets" },
    { image: "/images/crafts_beaded_jewelry1.jpg", title: "Beaded Jewelry" }
  ];

  const foodProducts = [
    { image: "/images/shop_food.webp", title: t('shop.food_title') },
    { image: "/images/food_mazoe.jpg", title: "Mazoe Variety Pack" },
    { image: "/images/food_cerevita1.png", title: "Cerevita Instant Cereal" },
    { image: "/images/food_maputi.png", title: "Maputi Snacks" },
    { image: "/images/food_dovi1.webp", title: "Traditional Dovi" },
    { image: "/images/food_kapenta1.jpg", title: "Kapenta Dried Fish" }
  ];

  useEffect(() => {
    const jerseyTimer = setInterval(() => {
      setCurrentJerseyIndex((prev) => (prev + 1) % sportsJerseys.length);
    }, 3000);
    const craftsTimer = setInterval(() => {
      setCurrentCraftsIndex((prev) => (prev + 1) % artsCrafts.length);
    }, 3500);
    const foodTimer = setInterval(() => {
      setCurrentFoodIndex((prev) => (prev + 1) % foodProducts.length);
    }, 4000);
    return () => {
      clearInterval(jerseyTimer);
      clearInterval(craftsTimer);
      clearInterval(foodTimer);
    };
  }, [sportsJerseys.length, artsCrafts.length, foodProducts.length]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      id="zimbabwe-shop-info"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={containerVariants}
      className="max-w-7xl mx-auto px-6 space-y-16 py-10 scroll-mt-24 relative overflow-hidden"
    >
      {/* Background Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />

      {/* Header Section */}
      <motion.div variants={itemVariants} className="space-y-6 text-center">
        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
          {t('shop.title')}
        </h2>
        <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto font-light leading-relaxed">
          {t('shop.desc')}
        </p>
      </motion.div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {[
          { 
            index: currentJerseyIndex, 
            data: sportsJerseys, 
            title: t('shop.sports_title'), 
            desc: t('shop.sports_desc'),
            badges: [t('shop.sports_mech_rugby'), t('shop.sports_mech_cricket'), t('shop.sports_mech_soccer')]
          },
          { 
            index: currentCraftsIndex, 
            data: artsCrafts, 
            title: t('shop.crafts_title'), 
            desc: t('shop.crafts_desc'),
            badges: ["Stone Sculptures", "Binga Baskets", "Beaded Jewellery"]
          },
          { 
            index: currentFoodIndex, 
            data: foodProducts, 
            title: t('shop.food_title'), 
            desc: t('shop.food_desc'),
            badges: ["Mazoe & Cerevita", "Maputi Snacks", "Export-grade Dovi"]
          }
        ].map((category, catIdx) => (
          <motion.div
            key={catIdx}
            variants={itemVariants}
            className="group relative flex flex-col h-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 hover:bg-white/[0.07] hover:-translate-y-2"
          >
            {/* The Crispy Edge Finish */}
            <span className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none z-20" />

            {/* Image Section with Glass Overlay */}
            <div className="relative h-72 overflow-hidden bg-slate-900">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={category.index}
                  src={category.data[category.index].image} 
                  alt={category.title} 
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.7, ease: "circOut" }}
                  className="w-full h-full object-cover saturate-[0.8] group-hover:saturate-100 group-hover:scale-110 transition-all duration-700"
                />
              </AnimatePresence>
              
              {/* Image Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />

              {/* Pagination Dots */}
              <div className="absolute bottom-6 right-6 flex gap-1.5 z-20">
                {category.data.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${
                      i === category.index ? 'bg-zim-gold w-4 shadow-[0_0_8px_rgba(212,175,55,0.8)]' : 'bg-white/30'
                    }`} 
                  />
                ))}
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 flex flex-col flex-grow relative z-10">
              <h4 className="text-xl font-bold text-white mb-3 group-hover:text-zim-gold transition-colors duration-300">
                {category.title}
              </h4>
              <p className="text-sm text-white/50 mb-8 flex-grow leading-relaxed font-light">
                {category.desc}
              </p>
              
              {/* Compact Badges */}
              <div className="flex flex-wrap gap-2">
                {category.badges.map((badge, bIdx) => (
                  <span 
                    key={bIdx} 
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/70 group-hover:border-zim-gold/30 group-hover:text-white transition-all duration-300"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Subtle bottom glow accent */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zim-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}