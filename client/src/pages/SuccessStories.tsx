import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Quote, TrendingUp, Users, DollarSign, Award, Trophy, Sparkles, Globe, MessageSquare, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";

export default function SuccessStories() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- 1. ALL 5 HERO SLIDES ---
  const heroSlides = useMemo(() => [
    {
      image: "/images/partnership_handshake.png",
      badge: t("success.hero.badge1"),
      badgeIcon: Award,
      title: t("success.hero.title1"),
      subtitle: t("success.hero.subtitle1"),
      highlight: t("success.hero.highlight1")
    },
    {
      image: "/images/tech_startup.jpg",
      badge: t("success.hero.badge2"),
      badgeIcon: Sparkles,
      title: t("success.hero.title2"),
      subtitle: t("success.hero.subtitle2"),
      highlight: t("success.hero.highlight2")
    },
    {
      image: "/images/crafts_binga_baskets1.jpg",
      badge: t("success.hero.badge3"),
      badgeIcon: Trophy,
      title: t("success.hero.title3"),
      subtitle: t("success.hero.subtitle3"),
      highlight: t("success.hero.highlight3")
    },
    {
      image: "/images/eastern_highlands.jpg",
      badge: t("success.hero.badge4"),
      badgeIcon: Globe,
      title: t("success.hero.title4"),
      subtitle: t("success.hero.subtitle4"),
      highlight: t("success.hero.highlight4")
    },
    {
      image: "/images/minerals_mining.png",
      badge: t("success.hero.badge5"),
      badgeIcon: TrendingUp,
      title: t("success.hero.title5"),
      subtitle: t("success.hero.subtitle5"),
      highlight: t("success.hero.highlight5")
    }
  ], [t]);

  // --- 2. ALL 8 STORIES DATA WITH BOOLEAN SHIELD ---
  const storiesData = useMemo(() => {
    const rawData = t("success.stories_list", { returnObjects: true });
    
    // Type Guard & Fallback Array
    if (!Array.isArray(rawData)) {
      return [
        {
          display: false,
          title: t("success.stories.leather_goods.title"),
          category: t("success.stories.leather_goods.category"),
          image: "/images/leather_products.jpg",
          impact: { revenue: "$2.5M", jobs: "150+", markets: "3 countries" },
          story: t("success.stories.leather_goods.story"),
          testimonial: t("success.stories.leather_goods.testimonial"),
          author: t("success.stories.leather_goods.author"),
          role: t("success.stories.leather_goods.role")
        },
        {
          display: false,
          title: t("success.stories.horticulture_breakthrough.title"),
          category: t("success.stories.horticulture_breakthrough.category"),
          image: "/images/horticulture.jpg",
          impact: { revenue: "$850K", jobs: "85", markets: "Germany, Netherlands" },
          story: t("success.stories.horticulture_breakthrough.story"),
          testimonial: t("success.stories.horticulture_breakthrough.testimonial"),
          author: t("success.stories.horticulture_breakthrough.author"),
          role: t("success.stories.horticulture_breakthrough.role")
        },
        {
          display: false,
          title: t("success.stories.tourism_lodge.title"),
          category: t("success.stories.tourism_lodge.category"),
          image: "/images/victoria_falls.jpg",
          impact: { revenue: "$1.2M annually", jobs: "45", investors: "280 diaspora" },
          story: t("success.stories.tourism_lodge.story"),
          testimonial: t("success.stories.tourism_lodge.testimonial"),
          author: t("success.stories.tourism_lodge.author"),
          role: t("success.stories.tourism_lodge.role")
        },
        {
          display: false,
          title: t("success.stories.stone_sculpture.title"),
          category: t("success.stories.stone_sculpture.category"),
          image: "/images/arts_crafts.jpg",
          impact: { revenue: "$450K", jobs: "60 artisans", markets: "USA, CAN, UK" },
          story: t("success.stories.stone_sculpture.story"),
          testimonial: t("success.stories.stone_sculpture.testimonial"),
          author: t("success.stories.stone_sculpture.author"),
          role: t("success.stories.stone_sculpture.role")
        },
        {
          display: false,
          title: t("success.stories.tech_startup.title"),
          category: t("success.stories.tech_startup.category"),
          image: "/images/tech_startup.jpg",
          impact: { revenue: "$3.5M valuation", jobs: "35", investors: "120 diaspora" },
          story: t("success.stories.tech_startup.story"),
          testimonial: t("success.stories.tech_startup.testimonial"),
          author: t("success.stories.tech_startup.author"),
          role: t("success.stories.tech_startup.role")
        },
        {
          display: false,
          title: t("success.stories.honey_export.title"),
          category: t("success.stories.honey_export.category"),
          image: "/images/honey_export.jpg",
          impact: { revenue: "$320K", jobs: "120 beekeepers", markets: "EU markets" },
          story: t("success.stories.honey_export.story"),
          testimonial: t("success.stories.honey_export.testimonial"),
          author: t("success.stories.honey_export.author"),
          role: t("success.stories.honey_export.role")
        },
        {
          display: false,
          title: t("success.stories.heritage_tourism.title"),
          category: t("success.stories.heritage_tourism.category"),
          image: "/images/great_zimbabwe.jpeg",
          impact: { revenue: "$680K", tourists: "1,200+ diaspora", jobs: "28" },
          story: t("success.stories.heritage_tourism.story"),
          testimonial: t("success.stories.heritage_tourism.testimonial"),
          author: t("success.stories.heritage_tourism.author"),
          role: t("success.stories.heritage_tourism.role")
        },
        {
          display: false,
          title: t("success.stories.macadamia_nut.title"),
          category: t("success.stories.macadamia_nut.category"),
          image: "/images/macadamia_nuts.jpg",
          impact: { revenue: "$1.8M", jobs: "95", investors: "340 diaspora" },
          story: t("success.stories.macadamia_nut.story"),
          testimonial: t("success.stories.macadamia_nut.testimonial"),
          author: t("success.stories.macadamia_nut.author"),
          role: t("success.stories.macadamia_nut.role")
        }
      ];
    }
    return rawData;
  }, [t]);

  // --- 3. IMPACT METRICS DATA WITH BOOLEAN SHIELD ---
  const impactData = useMemo(() => {
    const rawMetrics = t("success.impact_metrics_list", { returnObjects: true });
    if (!Array.isArray(rawMetrics)) {
      return [
        { display: false, icon: DollarSign, value: "$11.3M+", label: t("success.impact_metrics.economic_impact.label"), description: t("success.impact_metrics.economic_impact.description") },
        { display: false, icon: Users, value: "700+", label: t("success.impact_metrics.jobs_created.label"), description: t("success.impact_metrics.jobs_created.description") },
        { display: false, icon: TrendingUp, value: "1,000+", label: t("success.impact_metrics.diaspora_investors.label"), description: t("success.impact_metrics.diaspora_investors.description") },
        { display: false, icon: Award, value: "15+", label: t("success.impact_metrics.markets_accessed.label"), description: t("success.impact_metrics.markets_accessed.description") }
      ];
    }
    return rawMetrics;
  }, [t]);

  // Derived filtered lists
  const activeStories = storiesData.filter((s: any) => s?.display !== false);
  const activeMetrics = impactData.filter((m: any) => m?.display !== false);

  const introData = { icon: Trophy, title: t('success.objective_title'), description: t('success.objective_subtitle') };

  return (
    <Layout>
      <SubPageHero heroSlides={heroSlides} intro={introData} />

      {/* SUCCESS STORIES SECTION */}
      {activeStories.length > 0 && (
        <section id="stories" className="py-24 bg-slate-950 relative overflow-hidden scroll-mt-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
          <div className="container relative z-10 px-6 mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">{t("success.stories_title")}</h2>
              <p className="text-base text-white/50 max-w-3xl mx-auto font-light leading-relaxed">{t("success.stories_subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {activeStories.map((story, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 30 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  className="group relative flex flex-col h-full rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-3xl shadow-2xl transition-all duration-500 hover:bg-white/[0.07] hover:-translate-y-2"
                >
                  <span className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none z-20" />
                  <div className="relative h-64 overflow-hidden">
                    <img src={story?.image} alt={story?.title} className="w-full h-full object-cover saturate-[0.8] group-hover:saturate-100 group-hover:scale-110 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <Badge className="absolute top-6 left-6 bg-zim-gold/10 text-zim-gold border-zim-gold/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 backdrop-blur-xl">
                      {story?.category}
                    </Badge>
                  </div>
                  <div className="p-8 flex-grow space-y-6 relative">
                    <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-zim-gold transition-colors leading-tight">{story?.title}</h3>
                    <p className="text-[13px] text-white/50 leading-relaxed font-light line-clamp-3">{story?.story}</p>
                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Revenue</p>
                        <p className="text-sm font-black text-zim-gold">{story?.impact?.revenue}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Jobs</p>
                        <p className="text-sm font-black text-white">{story?.impact?.jobs}</p>
                      </div>
                    </div>
                    <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10">
                      <Quote className="absolute -top-3 -left-3 h-8 w-8 text-zim-gold/20" />
                      <p className="italic text-white/70 text-xs leading-relaxed mb-4 font-light">"{story?.testimonial}"</p>
                      <p className="text-right text-[10px] font-black text-zim-gold uppercase tracking-widest mt-4">— {story?.author}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* IMPACT METRICS SECTION */}
      {activeMetrics.length > 0 && (
        <section className="py-24 bg-slate-950 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="container relative z-10 px-6 mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">{t("success.impact_metrics_title")}</h2>
              <p className="text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t("success.impact_metrics_subtitle")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {activeMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <motion.div 
                    key={index} 
                    whileHover={{ y: -5 }} 
                    className="relative p-10 rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl text-center group overflow-hidden shadow-2xl"
                  >
                    <span className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none z-20" />
                    <div className="mx-auto h-20 w-20 bg-zim-gold/10 rounded-3xl border border-zim-gold/20 flex items-center justify-center mb-8">
                      {Icon && <Icon className="h-10 w-10 text-zim-gold" />}
                    </div>
                    <h3 className="text-5xl font-black text-white tracking-tighter mb-2 tabular-nums">{metric.value}</h3>
                    <p className="text-[11px] font-black text-zim-gold uppercase tracking-[0.2em]">{metric.label}</p>
                    <p className="text-[12px] text-white/40 font-light leading-relaxed pt-3">{metric.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT CTA */}
      <section id="contact-cta" className="py-24 bg-slate-950">
        <div className="container px-6 mx-auto">
          <div className="relative max-w-5xl mx-auto p-12 md:p-24 rounded-[4rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl text-center overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-zim-gold/10 blur-[120px] pointer-events-none" />
            <div className="relative z-10 space-y-10">
              <div className="mx-auto h-20 w-20 bg-zim-gold/10 rounded-3xl flex items-center justify-center border border-zim-gold/20">
                <Award className="h-10 w-10 text-zim-gold" />
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">{t("success.cta_title")}</h2>
                <p className="text-white/50 text-xl font-light max-w-2xl mx-auto">{t("success.cta_subtitle")}</p>
              </div>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-zim-gold text-zim-black hover:bg-white transition-all px-12 h-16 rounded-full font-black text-[12px] uppercase tracking-widest shadow-2xl">
                    {t("success.cta_button")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 bg-slate-950 border-white/10 overflow-hidden rounded-[2.5rem]">
                  <ContactForm title={t("success.cta_title")} module="success" />
                </DialogContent>
              </Dialog>

              <div className="pt-8 flex flex-wrap justify-center gap-8 ">
                <div className="flex items-center gap-2 text-xs font-bold text-white tracking-widest">
                  <Mail className="h-4 w-4" /> 
                  <a href="mailto:info@diasporaunlocked.com" className="hover:text-white transition-colors">info@diasporaunlocked.com</a>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-white tracking-widest">
                  <Phone className="h-4 w-4" /> 
                  <a href="tel:+4915147416152" className="hover:text-white transition-colors">+49 151 474 16152</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}