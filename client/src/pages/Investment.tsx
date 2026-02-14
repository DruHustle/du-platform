import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import InvestmentCalculator from "@/components/InvestmentCalculator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users, DollarSign, CheckCircle, Award, Brain, ArrowRight, Globe, Building, Leaf, ExternalLink, PiggyBank, LucideBanknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Investment() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);

const heroSlides = useMemo(() => [
    {
      image: "/images/rbz_building.png",
      badge: t('investment.hero.badge1'),
      badgeIcon: true,
      title: t('investment.hero.title1'),
      titleHighlight: t('investment.hero.highlight1'),
      subtitle: t('investment.hero.subtitle1'),
      buttons: [
        { text: t('investment.hero.rbz_policy'), variant: "primary" },
        { text: t('investment.hero.rbz_currency'), variant: "outline" }
      ]
    },
    {
      image: "/images/masuwe_sez.png",
      badge: t('investment.hero.badge2'),
      badgeIcon: true,
      title: t('investment.hero.title2'),
      titleHighlight: t('investment.hero.highlight2'),
      subtitle: t('investment.hero.subtitle2'),
      buttons: []
    },
    {
      image: "/images/vfex_logo.png",
      badge: t('investment.hero.badge3'),
      badgeIcon: true,
      title: t('investment.hero.title3'),
      titleHighlight: t('investment.hero.highlight3'),
      subtitle: t('investment.hero.subtitle3'),
      buttons: []
    },
    {
      image: "/images/horticulture.jpg",
      badge: t('investment.hero.badge4'),
      badgeIcon: true,
      title: t('investment.hero.title4'),
      titleHighlight: t('investment.hero.highlight4'),
      subtitle: t('investment.hero.subtitle4'),
      buttons: []
    },
    {
      image: "/images/minerals_mining.png",
      badge: t('investment.hero.badge5'),
      badgeIcon: true,
      title: t('investment.hero.title5'),
      titleHighlight: t('investment.hero.highlight5'),
      subtitle: t('investment.hero.subtitle5'),
      buttons: []
    }
  ], [t]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentHeroIndex(p => (p + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  const projects = [
    { id: "masuwe", sector: "tourism", target: "$1.2B", raised: "$0", prog: 0, inv: 12, min: "$100k", ret: "15-25%", time: "10-15y", risk: "moderate", ver: true },
    { id: "leather", sector: "manufacturing", target: "$250k", raised: "$187k", prog: 75, inv: 342, min: "$500", ret: "12-15%", time: "3-5y", risk: "moderate", ver: true },
    { id: "apparel", sector: "manufacturing", target: "$450k", raised: "$120k", prog: 26, inv: 89, min: "$1k", ret: "18-22%", time: "3-5y", risk: "aggressive", ver: true },
    { id: "horticulture", sector: "agriculture", target: "$150k", raised: "$98k", prog: 65, inv: 218, min: "$300", ret: "10-12%", time: "2-4y", risk: "conservative", ver: true },
    { id: "fintech", sector: "it", target: "$1.5M", raised: "$650k", prog: 43, inv: 112, min: "$2.5k", ret: "25-35%", time: "5-7y", risk: "aggressive", ver: true },
    { id: "solar", sector: "energy", target: "$5M", raised: "$1.2M", prog: 24, inv: 412, min: "$1k", ret: "14-18%", time: "4-6y", risk: "conservative", ver: true }
  ];

  const filtered = projects.filter(p => (activeFilter === "all" || p.sector === activeFilter) && (riskFilter === "all" || p.risk === riskFilter));
  const hdcAssoc = t('investment.hdc_associations', { returnObjects: true }) as string[] || [];

  return (
    <Layout>
{/* Hero Carousel Section */}
  <section className="relative min-h-[500px] md:h-[600px] flex items-center overflow-hidden">
  <AnimatePresence initial={false}>
    <motion.div 
      key={currentHeroIndex} 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 1.5, ease: "easeInOut" }} 
      className="absolute inset-0"
    >
      <motion.div 
        initial={{ scale: 1 }}
        animate={{ scale: 1.1 }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
        className="absolute inset-0 bg-cover bg-center" 
        style={{ backgroundImage: `url('${heroSlides[currentHeroIndex]?.image}')` }} 
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
    </motion.div>
  </AnimatePresence>

  <div className="container relative z-10 text-white">
    <AnimatePresence mode="wait">
      <motion.div
        key={`content-${currentHeroIndex}`}
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 30, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl"
      >
        {/* Updated Badge Logic with Conditional Icon */}
        <div className="flex items-center gap-3 mb-6">
          {heroSlides[currentHeroIndex]?.badgeIcon && (
            <Globe className="h-6 w-6 text-zim-gold" />
          )}
          <Badge className="bg-zim-gold text-zim-black px-6 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
            {heroSlides[currentHeroIndex]?.badge}
          </Badge>
        </div>

        {/* Updated Typography to include Highlight */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] hero-text-shadow">
          {heroSlides[currentHeroIndex]?.title}
          {heroSlides[currentHeroIndex]?.titleHighlight && (
            <span className="text-zim-gold block md:inline ml-0 md:ml-4">
              {heroSlides[currentHeroIndex].titleHighlight}
            </span>
          )}
        </h1>

        <p className="text-xl md:text-2xl mb-10 max-w-2xl text-white/90 font-medium leading-relaxed">
          {heroSlides[currentHeroIndex]?.subtitle}
        </p>

        {/* Dynamic Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-start">
          {heroSlides[currentHeroIndex]?.buttons?.length > 0 ? (
            heroSlides[currentHeroIndex].buttons.map((btn, bIdx) => (
              <Button 
                key={bIdx}
                size="lg" 
                variant={btn.variant === "primary" ? "default" : "outline"}
                className={`rounded-full px-10 h-14 text-lg font-bold group ${
                  btn.variant === "primary" 
                    ? "bg-zim-gold hover:bg-zim-gold/90 text-zim-black border-none" 
                    : "bg-white/10 hover:bg-white/20 text-white border-white/40 backdrop-blur-sm"
                }`} 
              >
                {btn.text}
                {btn.variant === "primary" && (
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                )}
              </Button>
            ))
          ) : (
            /* Fallback if no buttons array exists for a specific slide */
            <Button 
              size="lg" 
              className="bg-zim-gold hover:bg-zim-gold/90 text-zim-black rounded-full px-10 h-14 text-lg font-bold group"
            >
              {t('investment.explore_title')}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  </div>
  
  <div className="absolute bottom-12 left-4 sm:left-12 flex gap-3 z-20">
    {heroSlides.map((_, idx) => (
      <button
        key={idx}
        onClick={() => setCurrentHeroIndex(idx)}
        className={`h-1.5 transition-all duration-500 rounded-full ${
          idx === currentHeroIndex ? 'bg-zim-gold w-16' : 'bg-white/30 w-4 hover:bg-white/60'
        }`}
        aria-label={`Go to slide ${idx + 1}`}
      />
    ))}
  </div>
  
  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
</section>

      {/* Investments Introduction */}
      <section id="export-info" className="py-0 bg-background relative overflow-hidden">
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
              
              <div className="relative z-10 max-w-3xl mx-auto space-y-3">
             <TrendingUp className="h-8 w-8 text-zim-gold mx-auto mb-1" />
                
                <h3 className="text-lg md:text-xl font-bold text-white leading-snug px-4">
                  {t('investment.objective_subtitle')}
                </h3>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="h-px w-8 bg-zim-gold/50" />
                  
                  <p className="text-zim-gold text-[10px] font-black uppercase tracking-[0.2em]">
                    {t('investment.objective_title')}
                  </p>
                  
                  <div className="h-px w-8 bg-zim-gold/50" />
                </div>
              </div>
            </motion.div>
                    
          </div>
        </div>
      </section>


      {/* Projects */}
      <section id="active-projects" className="py-10 bg-muted/20">
        <div className="container">
          <div className="text-center mb-6">
            <h2 className="text-4xl font-bold mb-4">{t('investment.investment_sectors_title')}</h2>
            <div className="flex flex-wrap justify-center gap-2 mt-6">
              {['all', 'tourism', 'agriculture', 'manufacturing', 'it', 'energy'].map(s => (
                <Button key={s} variant={activeFilter === s ? "default" : "outline"} onClick={() => setActiveFilter(s)} className="rounded-full px-6 capitalize">{t(`investment.project_filters.${s}`)}</Button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {filtered.map(p => (
              <Card key={p.id} className="overflow-hidden border-t-4 border-t-zim-gold hover:shadow-xl transition-all">
                <div className="grid md:grid-cols-3 gap-6 p-6">
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="capitalize">{p.sector}</Badge>
                      <Badge className={p.risk === "conservative" ? "bg-green-100 text-green-800" : p.risk === "moderate" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                        {t(`investment.project_filters.${p.risk}`)} {t('investment.project_card.risk')}
                      </Badge>
                      {p.ver && <Badge className="bg-blue-100 text-blue-800"><Award className="h-3 w-3 mr-1" /> {t('investment.project_card.verified')}</Badge>}
                    </div>
                    <CardTitle className="text-2xl">{t(`investment.projects.${p.id}.title`)}</CardTitle>
                    <CardDescription>{t(`investment.projects.${p.id}.description`)}</CardDescription>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {(t(`investment.projects.${p.id}.highlights`, { returnObjects: true }) as string[] || []).map((h, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle className="h-4 w-4 text-zim-green" /> {h}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-xl space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                        <span>{t('investment.project_card.raised', { amount: p.raised })}</span>
                        <span>{p.prog}%</span>
                      </div>
                      <Progress value={p.prog} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><p className="text-muted-foreground">{t('investment.project_filters.min_investment')}</p><p className="font-bold">{p.min}</p></div>
                      <div><p className="text-muted-foreground">{t('investment.project_filters.expected_return')}</p><p className="font-bold text-zim-green">{p.ret}</p></div>
                    </div>
                    <Button className="w-full bg-zim-black text-white h-11">{t('investment.project_card.view_details')}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className=" container text-center">
        <h2 className="text-3xl font-bold mb-6">{t('investment.crowdfunding_title')}</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {['Browse Projects', 'Invest Your Share', 'Track Performance', 'Receive Returns'].map((step, i) => (
            <Card key={i} className="relative pt-8">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-zim-gold text-zim-black rounded-full flex items-center justify-center font-bold">{i + 1}</div>
              <CardHeader><CardTitle className="text-base">{step}</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">{t('investment.crowdfunding_subtitle')}</CardContent>
            </Card>
          ))}
        </div>
      </section>

     {/* NTIR & HDC Directories */}
      <section className="py-10 container">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-t-4 border-t-zim-gold">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Building className="h-8 w-8 text-zim-gold" />
                <CardTitle className="text-xl">{t('investment.ntir_title')}</CardTitle>
              </div>
              <CardDescription>{t('investment.ntir_subtitle')}</CardDescription>
            </CardHeader>
            <CardContent><Button variant="outline" className="w-full">{t('investment.ntir_button')}</Button></CardContent>
          </Card>
          <Card className="border-t-4 border-t-zim-green">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Leaf className="h-8 w-8 text-zim-green" />
                <CardTitle className="text-xl">{t('investment.hdc_title')}</CardTitle>
              </div>
              <CardDescription>{t('investment.hdc_subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {hdcAssoc.slice(0, 5).map((a, i) => <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>)}
                <Badge variant="outline" className="text-[10px]">+{hdcAssoc.length - 5} more</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Calculator */}
      <section className=" bg-muted/30"><div className="container"><InvestmentCalculator /></div></section>


            {/* Contact CTA */}
            <section className="py-12">
              <div className="container">
                <Card className="max-w-2xl mx-auto text-center border-2 border-primary/20 bg-muted/20">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{t("investment.cta_title")}</CardTitle>
                    <CardDescription className="text-sm">
                        {t("investment.cta_subtitle")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                      <DialogTrigger asChild>
                        <Button size="default" className="font-bold px-8 shadow-lg">
                          {t("investment.cta_button")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl p-0">
                        <ContactForm title={t("investment.contact_form_title")} module="investment" />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            </section>
      
            {/* Footer Links CTA */}
            <section className="py-8 bg-primary text-primary-foreground">
              <div className="container text-center">
                  <h2 className="text-xl md:text-2xl font-bold mb-2">{t("investment.explore_title")}</h2>
                  <p className="text-sm mb-6 max-w-2xl mx-auto opacity-90">
                    {t("investment.explore_subtitle")} 
                  </p>
                  <a href="https://zidainvest.com/" target="_blank" rel="noopener noreferrer">
                    <Button size="default" variant="secondary" className="font-bold px-8 shadow-lg">
                      {t("investment.explore_site")} <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
              </div>
            </section>

    </Layout>
  );
}