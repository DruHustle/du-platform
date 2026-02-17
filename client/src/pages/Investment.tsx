import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import InvestmentCalculator from "@/components/InvestmentCalculator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, Users, DollarSign, CheckCircle, Award, Brain, ArrowRight, Globe, Building, Leaf, ExternalLink, Shield, Gem, Repeat, FileText, Target, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";

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
      badgeIcon: Shield, 
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
      badgeIcon: Globe,
      title: t('investment.hero.title2'),
      titleHighlight: t('investment.hero.highlight2'),
      subtitle: t('investment.hero.subtitle2'),
      buttons: []
    },
    {
      image: "/images/vfex_logo.png",
      badge: t('investment.hero.badge3'),
      badgeIcon: Repeat,
      title: t('investment.hero.title3'),
      titleHighlight: t('investment.hero.highlight3'),
      subtitle: t('investment.hero.subtitle3'),
      buttons: []
    },
    {
      image: "/images/horticulture.jpg",
      badge: t('investment.hero.badge4'),
      badgeIcon: Leaf,
      title: t('investment.hero.title4'),
      titleHighlight: t('investment.hero.highlight4'),
      subtitle: t('investment.hero.subtitle4'),
      buttons: []
    },
    {
      image: "/images/minerals_mining.png",
      badge: t('investment.hero.badge5'),
      badgeIcon: Gem,
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

  const introData = {
    icon: TrendingUp,
    title: t('investment.objective_title'),
    description: t('investment.objective_subtitle')
  };

const projects = [
  { 
    id: "masuwe", 
    sector: "tourism", 
    target: "$25M", 
    raised: "$0", 
    prog: 10, 
    inv: 0, 
    min: "$10k", 
    ret: "14-20%", 
    time: "10-15y", 
    risk: "moderate", 
    ver: true 
  },

  { 
    id: "leather", 
    sector: "manufacturing", 
    target: "$180k", 
    raised: "$0", 
    prog: 35, 
    inv: 0, 
    min: "$500", 
    ret: "12-16%", 
    time: "3-5y", 
    risk: "moderate", 
    ver: true 
  },

  { 
    id: "apparel", 
    sector: "manufacturing", 
    target: "$300k", 
    raised: "$0", 
    prog: 20, 
    inv: 0, 
    min: "$1k", 
    ret: "16-22%", 
    time: "3-5y", 
    risk: "aggressive", 
    ver: true 
  },

  { 
    id: "horticulture", 
    sector: "agriculture", 
    target: "$120k", 
    raised: "$0", 
    prog: 40, 
    inv: 0, 
    min: "$300", 
    ret: "10-14%", 
    time: "2-4y", 
    risk: "conservative", 
    ver: true 
  },

  { 
    id: "fintech", 
    sector: "it", 
    target: "$850k", 
    raised: "$0", 
    prog: 15, 
    inv: 0, 
    min: "$2,500", 
    ret: "22-30%", 
    time: "5-7y", 
    risk: "aggressive", 
    ver: true 
  },

  { 
    id: "solar", 
    sector: "energy", 
    target: "$2.5M", 
    raised: "$0", 
    prog: 12, 
    inv: 0, 
    min: "$1,000", 
    ret: "14-18%", 
    time: "4-6y", 
    risk: "conservative", 
    ver: true 
  }
];

  const filtered = projects.filter(p => (activeFilter === "all" || p.sector === activeFilter) && (riskFilter === "all" || p.risk === riskFilter));
  const hdcAssoc = t('investment.hdc_associations', { returnObjects: true }) as string[] || [];

  return (
    <Layout>
      {/* Hero Section */}
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} intro={introData} />
      </section>

      {/* Active Projects - Cinematic Glass Grid */}
      <section id="active-projects" className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />

        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.sectors_title')}</h2>
             <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.calculator_subtitle')}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {['all', 'tourism', 'agriculture', 'manufacturing', 'it', 'energy'].map(s => (
                <button 
                  key={s} 
                  onClick={() => setActiveFilter(s)} 
                  className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
                    activeFilter === s 
                    ? "bg-zim-gold text-zim-black border-zim-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]" 
                    : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                  }`}
                >
                  {t(`investment.project_filters.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {filtered.map(p => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 hover:bg-white/[0.07]"
              >
                {/* Crispy Edge Finish */}
                <span className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none z-20" />
                
                <div className="grid md:grid-cols-12 gap-6 p-8 relative z-10">
                  <div className="md:col-span-8 space-y-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-zim-gold/10 text-zim-gold border border-zim-gold/20 text-[9px] uppercase font-black px-3 py-1 rounded-full">{p.sector}</Badge>
                      <Badge className={`text-[9px] uppercase font-black px-3 py-1 rounded-full ${p.risk === "conservative" ? "bg-green-500/10 text-green-400" : p.risk === "moderate" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>
                        {t(`investment.project_filters.${p.risk}`)} {t('investment.project_card.risk')}
                      </Badge>
                      {p.ver && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase font-black px-3 py-1 rounded-full flex items-center gap-1.5"><Award className="h-3 w-3" /> {t('investment.project_card.verified')}</Badge>}
                    </div>
                    
                    <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-zim-gold transition-colors">{t(`investment.projects.${p.id}.title`)}</h3>
                    <p className="text-sm text-white/50 font-light leading-relaxed line-clamp-2">{t(`investment.projects.${p.id}.description`)}</p>
                    
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {(t(`investment.projects.${p.id}.highlights`, { returnObjects: true }) as string[] || []).map((h, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
                          <CheckCircle className="h-4 w-4 text-zim-gold opacity-60" /> 
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="md:col-span-4 bg-white/5 rounded-3xl p-6 flex flex-col justify-between border border-white/5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/40">
                          <span>{t('investment.project_card.raised', { amount: p.raised })}</span>
                          <span className="text-zim-gold">{p.prog}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${p.prog}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-zim-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" 
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t('investment.project_filters.min_investment')}</p>
                          <p className="text-sm font-black text-white">{p.min}</p>
                        </div>
                        <div className="p-3 bg-zim-gold/5 rounded-xl border border-zim-gold/10">
                          <p className="text-[9px] font-black text-zim-gold/40 uppercase tracking-widest">{t('investment.project_filters.expected_return')}</p>
                          <p className="text-sm font-black text-zim-gold">{p.ret}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4 bg-white text-slate-950 hover:bg-zim-gold hover:text-zim-black transition-all rounded-xl h-12 font-black text-[10px] uppercase tracking-widest shadow-xl">
                      {t('investment.project_card.view_details')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works - Glass Dashboard */}
      <section className="py-10 bg-slate-950">
        <div className="container px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.crowdfunding_title')}</h2>
           < p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.crowdfunding_subtitle')}</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: 'Browse Projects', icon: Target },
              { title: 'Invest Your Share', icon: DollarSign },
              { title: 'Track Performance', icon: BarChart3 },
              { title: 'Receive Returns', icon: Repeat }
            ].map((step, i) => (
              <div key={i} className="relative pt-10 group">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-zim-gold text-zim-black rounded-full flex items-center justify-center font-black z-20 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  {i + 1}
                </div>
                <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center transition-all duration-500 hover:bg-white/[0.06] hover:-translate-y-2">
                  <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto mb-6 group-hover:bg-zim-gold/10 transition-colors">
                    <step.icon className="h-6 w-6 text-zim-gold" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-white/40 text-[12px] leading-relaxed font-light">{t('investment.crowdfunding_subtitle')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Directories - Dual Glass Panels */}
      <section className="py-10 bg-slate-950">
        <div className="container px-6 mx-auto">

          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.database_title')}</h2>
             <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.database_subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative p-10 rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zim-gold/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-5 mb-6">
                <div className="p-4 bg-zim-gold/10 rounded-2xl border border-zim-gold/20">
                  <Building className="h-8 w-8 text-zim-gold shadow-[0_0_15px_rgba(212,175,55,0.3)]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{t('investment.ntir_title')}</h3>
                  <p className="text-xs text-zim-gold/60 font-black uppercase tracking-[0.2em]">National Directory</p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-8">{t('investment.ntir_subtitle')}</p>
              <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white hover:text-zim-black font-black text-[11px] uppercase tracking-widest transition-all">
                {t('investment.ntir_button')}
              </Button>
            </div>

            <div className="relative p-10 rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zim-green/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-5 mb-6">
                <div className="p-4 bg-zim-green/10 rounded-2xl border border-zim-green/20">
                  <Leaf className="h-8 w-8 text-zim-green shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{t('investment.hdc_title')}</h3>
                  <p className="text-xs text-zim-green/60 font-black uppercase tracking-[0.2em]">Horticulture Council</p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-6">{t('investment.hdc_subtitle')}</p>
              <div className="flex flex-wrap gap-2">
                {hdcAssoc.slice(0, 5).map((a, i) => (
                  <Badge key={i} className="bg-white/5 text-white/60 border border-white/10 text-[9px] font-bold uppercase px-3 py-1 rounded-full">
                    {a}
                  </Badge>
                ))}
                <Badge className="bg-white/5 text-white/40 border border-white/10 text-[9px] font-bold px-3 py-1 rounded-full">+{hdcAssoc.length - 5} more</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="pt-10 pb-24 bg-slate-950 relative overflow-hidden">
        <div className="container px-6 mx-auto relative z-10">
            <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.calculator_title')}</h2>
             <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.calculator_subtitle')}</p>
          </div>
          <InvestmentCalculator />
        </div>
      </section>


    </Layout>
  );
}