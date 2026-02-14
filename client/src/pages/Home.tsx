import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { FileText, BookOpen, Plane, TrendingUp, Package, ArrowRight, CheckCircle, Globe, Users, BarChart3, Award, Brain, Heart } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import ContactForm from "@/components/ContactForm";

export default function Home() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState<number>(0); // Hero background images - Zimbabwe tourist destinations
  const heroBackgrounds = useMemo(() => [
    "/images/victoria_falls.jpg",
    "/images/hwange_elephants.jpg",
    "/images/balancing_rocks.jpg",
    "/images/great_zimbabwe.jpeg",
    "/images/eastern_highlands.jpg",
    "/images/zimbabwe_lion.png",
    "/images/mana_pools.jpg",
    "/images/kariba_sunset.jpg",
    "/images/partnership_handshake.png",
    "/images/african_trade.jpg",
    "/images/harare_airport.png",
    "/images/eu_symbol.png",
    "/images/dest_mana_pools.jpg",
    "/images/dest_gonarezhou.jpg",
    "/images/dest_matobo.jpg",
    "/images/minerals_mining.png",
    "/images/manufacturing_factory.jpg",
    "/images/tech/ai_innovation.jpg",
    "/images/tech/ai_context.jpg"
  ], []);

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % heroBackgrounds.length);
    }, 5000);
    return () => clearInterval(bgTimer);
  }, [heroBackgrounds.length]);

  const modules = [
    {
      title: t('home.modules.technology.title'),
      description: t('home.modules.technology.desc'),
      icon: Brain,
      href: "/technology",
      color: " bg-purple-600/5 hover:bg-purple-600/10",
      bgImage: "/images/tech/ai_innovation.jpg",
      stats: t('home.modules.technology.stats')
    },
    {
      
      title: t('home.modules.export.title'),
      description: t('home.modules.export.desc'),
      icon: BookOpen,
      href: "/export-hub",
      color: " bg-green-600/5 hover:bg-green-600/10",
      bgImage: "/images/eu_symbol.png",
      stats: t('home.modules.export.stats')
    },
    {
      title: t('home.modules.tourism.title'),
      description: t('home.modules.tourism.desc'),
      icon: Plane,
      href: "/tourism",
         color: " bg-yellow-500/5 hover:bg-yellow-500/10",
      bgImage: "/images/hwange_elephants.jpg",
      stats: t('home.modules.tourism.stats')
    },
    {
      title: t('home.modules.investment.title'),
      description: t('home.modules.investment.desc'),
      icon: TrendingUp,
      href: "/investment",
      color: " bg-red-600/5 hover:bg-red-600/10",
      bgImage: "/images/minerals_mining.png",
      stats: t('home.modules.investment.stats')
    },
    {
      title: t('home.modules.trade.title'),
      description: t('home.modules.trade.desc'),
      icon: Package,
      href: "/trade",
      color: " bg-slate-800/5 hover:bg-slate-800/10",
      bgImage: "/images/african_trade.jpg",
      stats: t('home.modules.trade.stats')
    },
    {
      title: t('home.modules.success.title'),
      description: t('home.modules.success.desc'),
      icon: Award,
      href: "/success-stories",
      color: " bg-zim-gold/5 hover:bg-zim-gold/10",
      bgImage: "/images/partnership_handshake.png",
      stats: t('home.modules.success.stats')
    }
  ];



  return (
    
    <Layout>
      {/* Hero Section with Rotating Background */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        {/* Rotating Background Images */}
        <AnimatePresence initial={false}>
          <motion.div
            key={currentBgIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => window.scrollTo({top: 800, behavior: "smooth"})}
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.1 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${heroBackgrounds[currentBgIndex]}')`,
              }}
            />
            {/* Overlay removed from here */}
          </motion.div>
        </AnimatePresence>
        
        {/* Animated background elements retained for depth */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 container text-center text-white flex flex-col items-center justify-center py-12">

          <div className="flex justify-center mb-6 slide-up">
            <div className="relative min-w-max"> 
              <img
                src="/images/made_in_zimbabwe.png"
                alt={t("home.made_in_zimbabwe_alt")}
                className="h-24 md:h-36 w-auto object-contain drop-shadow-2xl relative z-10" 
              />
              <div className="absolute -inset-6 bg-white/10 rounded-full blur-2xl -z-10" />
            </div>
          </div>
          
            <h1 className="!text-7xl sm:text-8xl md:text-[10rem] lg:text-[12rem] font-bold mb-4 tracking-tighter leading-none px-4 hero-text-shadow slide-up"style={{ animationDelay: '0.1s' }}>
              {t('home.hero_title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-3 max-w-4xl mx-auto font-semibold px-4 text-secondary slide-up" style={{ animationDelay: '0.2s' }}>
              {t('home.hero_subtitle')}
            </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 slide-up" style={{ animationDelay: '0.5s' }}>
            <Link href="/technology">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                {t('home.technology')} 
              </Button>
            </Link>
            <Link href="/export-hub">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                {t('home.export_hub')}
              </Button>
            </Link>
            <Link href="/tourism">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                {t('home.tourism')}
              </Button>
            </Link>
            <Link href="/investment">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm shadow-xl">
                {t('home.investments')} 
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Optional: Remove or keep this bottom fade-to-background gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ZIGD Introduction */}
      <section id="zigd-platform" className="py-0 bg-background relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto">
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="relative py-6 px-8 md:px-16 rounded-[2rem] overflow-hidden text-center group shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-zim-green via-zim-black to-zim-red opacity-90 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-[url('/images/carbon-fibre.png')] opacity-10" />
              
              <div className="relative z-10 max-w-3xl mx-auto space-y-3"> {/* Reduced space-y from 4 to 3 */}
                {/* Reduced Icon from h-10 to h-8 */}
                <Globe className="h-8 w-8 text-zim-gold mx-auto mb-1" />
                
                {/* Heading: Reduced from text-2xl/3xl to text-lg/xl (2 units) */}
                <h3 className="text-lg md:text-xl font-bold text-white leading-snug px-4">
                  {t('home.objective_desc')}
                </h3>
                
                <div className="flex items-center justify-center gap-4"> {/* Reduced gap from 6 to 4 */}
                  <div className="h-px w-8 bg-zim-gold/50" />
                  
                  {/* Label: Reduced from text-sm to text-[10px] (Approx 2 units) */}
                  <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                    {t('home.objective_title')}
                  </p>
                  
                  <div className="h-px w-8 bg-zim-gold/50" />
                </div>
              </div>
            </motion.div>
                    
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="pt-8 pb-12 bg-gradient-to-b from-muted/30 to-background">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> {/* Reduced gap from 8 to 6 */}
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className={`overflow-hidden border-2 ${module.color} group hover:shadow-xl transition-all duration-500 h-full`}>
                    <div className="relative h-56 overflow-hidden"> {/* Reduced height from 64 to 56 */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                        style={{ backgroundImage: `url('${module.bgImage}')` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                      </div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <div className="bg-white/10 backdrop-blur-lg p-3 rounded-xl mb-2 inline-block border border-white/20 shadow-2xl">
                          <Icon className="h-8 w-8 text-white" /> {/* Reduced icon from 10 to 8 */}
                        </div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className="bg-zim-gold backdrop-blur-md border border-white/20 text-zim-black text-xs font-bold px-3 py-1.5 rounded-full shadow-xl">
                          {module.stats} {/* Reduced text-sm to text-xs */}
                        </span>
                      </div>
                    </div>

                    <CardHeader className="pb-2 pt-4"> {/* Reduced pb-3/pt-6 */}
                      {/* Reduced Title from text-2xl/3xl to text-lg/xl */}
                      <CardTitle className="text-lg md:text-xl font-bold group-hover:text-primary transition-colors mb-2">
                        {module.title}
                      </CardTitle>
                      {/* Reduced Description from text-base/lg to text-sm/base */}
                      <CardDescription className="text-sm md:text-base leading-snug">
                        {module.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-1 pb-4"> {/* Reduced pt-2/pb-6 */}
                      <Link href={module.href}>
                        <Button 
                          className="w-full group/btn font-bold text-base py-5" /* Reduced text-lg to text-base and py-6 to py-5 */
                          size="sm"
                          onClick={() => {
                            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                          }}
                        >
                          {t('home.explore_now')}
                          <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1.5 transition-transform" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

{/* CTA Section - Maintaining bg-primary */}
<section className="py-10 bg-primary text-primary-foreground">
  <div className="container">
    <div className="text-center">
      <h2 className="text-xl md:text-2xl font-bold mb-2">
        {t('home.ready_to_connect_title')}
      </h2>
      <p className="text-sm md:text-base opacity-90 mb-6 max-w-xl mx-auto">
        {t('home.ready_to_connect_subtitle')}
      </p>

      {/* items-center prevents stretching, gap-4 keeps consistent spacing */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            {/* Added w-44 (or your preferred width) to match both buttons */}
            <Button size="default" variant="secondary" className="w-44">
              {t("home.inquiry_btn")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
            <ContactForm 
              title={t("home.inquiry_title")}
              module="general" 
            />
          </DialogContent>
        </Dialog>

        <Link href="/success-stories">
          {/* Matches the w-44 above for perfect symmetry */}
          <Button 
            size="default" 
            variant="outline" 
            className="w-44 bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold"
          >
            {t('home.success_stories')}
          </Button>
        </Link>
      </div>
    </div>
  </div>
</section>


    </Layout>
  );
}
