import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Quote, TrendingUp, Users, DollarSign, Award, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";


export default function SuccessStories() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = useMemo(() => [
    {
      image: "/images/partnership_handshake.png",
      badge: t("success.hero.badge1"),
      title: t("success.hero.title1"),
      subtitle: t("success.hero.subtitle1"),
      highlight: t("success.hero.highlight1")
    },
    {
      image: "/images/tech_startup.jpg",
      badge: t("success.hero.badge2"),
      title: t("success.hero.title2"),
      subtitle: t("success.hero.subtitle2"),
      highlight: t("success.hero.highlight2")
    },
    {
      image: "/images/crafts_binga_baskets1.jpg",
      badge: t("success.hero.badge3"),
      title: t("success.hero.title3"),
      subtitle: t("success.hero.subtitle3"),
      highlight: t("success.hero.highlight3")
    },
    {
      image: "/images/eastern_highlands.jpg",
      badge: t("success.hero.badge4"),
      title: t("success.hero.title4"),
      subtitle: t("success.hero.subtitle4"),
      highlight: t("success.hero.highlight4")
    },
    {
      image: "/images/minerals_mining.png",
      badge: t("success.hero.badge5"),
      title: t("success.hero.title5"),
      subtitle: t("success.hero.subtitle5"),
      highlight: t("success.hero.highlight5")
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  const stories = [
    {
      title: t("success.stories.leather_goods.title"),
      category: t("success.stories.leather_goods.category"),
      image: "/images/leather_products.jpg",
      impact: {
        revenue: "$2.5M",
        jobs: "150+",
        markets: "3 countries"
      },
      story: t("success.stories.leather_goods.story"),
      testimonial: t("success.stories.leather_goods.testimonial"),
      author: t("success.stories.leather_goods.author"),
      role: t("success.stories.leather_goods.role")
    },
    {
      title: t("success.stories.horticulture_breakthrough.title"),
      category: t("success.stories.horticulture_breakthrough.category"),
      image: "/images/horticulture.jpg",
      impact: {
        revenue: "$850K",
        jobs: "85",
        markets: "Germany, Netherlands"
      },
      story: t("success.stories.horticulture_breakthrough.story"),
      testimonial: t("success.stories.horticulture_breakthrough.testimonial"),
      author: t("success.stories.horticulture_breakthrough.author"),
      role: t("success.stories.horticulture_breakthrough.role")
    },
    {
      title: t("success.stories.tourism_lodge.title"),
      category: t("success.stories.tourism_lodge.category"),
      image: "/images/victoria_falls.jpg",
      impact: {
        revenue: "$1.2M annually",
        jobs: "45",
        investors: "280 diaspora"
      },
      story: t("success.stories.tourism_lodge.story"),
      testimonial: t("success.stories.tourism_lodge.testimonial"),
      author: t("success.stories.tourism_lodge.author"),
      role: t("success.stories.tourism_lodge.role")
    },
    {
      title: t("success.stories.stone_sculpture.title"),
      category: t("success.stories.stone_sculpture.category"),
      image: "/images/arts_crafts.jpg",
      impact: {
        revenue: "$450K",
        jobs: "60 artisans",
        markets: "USA, Canada, UK"
      },
      story: t("success.stories.stone_sculpture.story"),
      testimonial: t("success.stories.stone_sculpture.testimonial"),
      author: t("success.stories.stone_sculpture.author"),
      role: t("success.stories.stone_sculpture.role")
    },
    {
      title: t("success.stories.tech_startup.title"),
      category: t("success.stories.tech_startup.category"),
      image: "/images/tech_startup.jpg",
      impact: {
        revenue: "$3.5M valuation",
        jobs: "35",
        investors: "120 diaspora"
      },
      story: t("success.stories.tech_startup.story"),
      testimonial: t("success.stories.tech_startup.testimonial"),
      author: t("success.stories.tech_startup.author"),
      role: t("success.stories.tech_startup.role")
    },
    {
      title: t("success.stories.honey_export.title"),
      category: t("success.stories.honey_export.category"),
      image: "/images/honey_export.jpg",
      impact: {
        revenue: "$320K",
        jobs: "120 beekeepers",
        markets: "EU markets"
      },
      story: t("success.stories.honey_export.story"),
      testimonial: t("success.stories.honey_export.testimonial"),
      author: t("success.stories.honey_export.author"),
      role: t("success.stories.honey_export.role")
    },
    {
      title: t("success.stories.heritage_tourism.title"),
      category: t("success.stories.heritage_tourism.category"),
      image: "/images/great_zimbabwe.jpeg",
      impact: {
        revenue: "$680K",
        tourists: "1,200+ diaspora",
        jobs: "28"
      },
      story: t("success.stories.heritage_tourism.story"),
      testimonial: t("success.stories.heritage_tourism.testimonial"),
      author: t("success.stories.heritage_tourism.author"),
      role: t("success.stories.heritage_tourism.role")
    },
    {
      title: t("success.stories.macadamia_nut.title"),
      category: t("success.stories.macadamia_nut.category"),
      image: "/images/macadamia_nuts.jpg",
      impact: {
        revenue: "$1.8M",
        jobs: "95",
        investors: "340 diaspora"
      },
      story: t("success.stories.macadamia_nut.story"),
      testimonial: t("success.stories.macadamia_nut.testimonial"),
      author: t("success.stories.macadamia_nut.author"),
      role: t("success.stories.macadamia_nut.role")
    }
  ];

  const impactMetrics = [
    {
      icon: DollarSign,
      value: "$11.3M+",
      label: t("success.impact_metrics.economic_impact.label"),
      description: t("success.impact_metrics.economic_impact.description")
    },
    {
      icon: Users,
      value: "700+",
      label: t("success.impact_metrics.jobs_created.label"),
      description: t("success.impact_metrics.jobs_created.description")
    },
    {
      icon: TrendingUp,
      value: "1,000+",
      label: t("success.impact_metrics.diaspora_investors.label"),
      description: t("success.impact_metrics.diaspora_investors.description")
    },
    {
      icon: Award,
      value: "15+",
      label: t("success.impact_metrics.markets_accessed.label"),
      description: t("success.impact_metrics.markets_accessed.description")
    }
  ];

  return (
    <Layout>
      {/* Hero Carousel Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
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
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url("${heroSlides[currentHeroIndex]?.image}")`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zim-black/70 via-zim-black/50 to-zim-black/85" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 container text-white">
          <AnimatePresence initial={false}>
            <motion.div
              key={`content-${currentHeroIndex}`}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -30, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Award className="h-8 w-8 text-zim-gold" />
                <Badge className="bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
                  {heroSlides[currentHeroIndex]?.badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex]?.title}
                {heroSlides[currentHeroIndex]?.highlight && (
                  <span className="text-zim-gold italic">{heroSlides[currentHeroIndex]?.highlight}</span>
                )}
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-white/90 leading-relaxed font-medium">
                {heroSlides[currentHeroIndex]?.subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentHeroIndex(idx)}
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentHeroIndex ? 'bg-zim-gold w-8' : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Success Stories Section */}
      <section id="stories" className="py-20 scroll-mt-24">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              {t("success.stories_badge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("success.stories_title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("success.stories_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stories.map((story, index) => (
              <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <img src={story.image} alt={story.title} className="w-full h-48 object-cover rounded-t-lg" />
                <CardHeader className="flex-grow">
                  <Badge variant="secondary" className="w-fit mb-2">{story.category}</Badge>
                  <CardTitle className="text-2xl font-bold mb-2">{story.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-3">{story.story}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                    <div><span className="font-semibold">{t("success.story_card.revenue")}</span> {story.impact.revenue}</div>
                    <div><span className="font-semibold">{t("success.story_card.jobs")}</span> {story.impact.jobs}</div>
                    <div><span className="font-semibold">{t("success.story_card.markets")}</span> {story.impact.markets}</div>
                    {story.impact.investors && <div><span className="font-semibold">{t("success.story_card.investors")}</span> {story.impact.investors}</div>}
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg mb-4">
                    <Quote className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="italic text-muted-foreground text-sm">"{story.testimonial}"</p>
                    <p className="text-right text-xs font-semibold mt-2">
                      {t("success.story_card.testimonial_by", { author: story.author, role: story.role })}
                    </p>
                  </div>
                  <Button variant="outline" className="w-full">
                    {t("success.story_card.view_story")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Metrics Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-zim-gold text-zim-black text-sm font-bold px-6 py-2 rounded-full uppercase tracking-widest">
              {t("success.impact_metrics_badge")}
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("success.impact_metrics_title")}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{t("success.impact_metrics_subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {impactMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={index} className="text-center shadow-lg">
                  <CardHeader>
                    <Icon className="mx-auto h-12 w-12 text-zim-gold mb-4" />
                    <CardTitle className="text-4xl font-bold">{metric.value}</CardTitle>
                    <CardDescription className="text-lg">{metric.label}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-4">{t("success.cta_title")}</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto opacity-90">{t("success.cta_subtitle")}</p>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" className="font-bold text-lg px-10 h-14 shadow-xl group">
                {t("success.cta_button")}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-700 text-white">
              <ContactForm 
                title={t("success.cta_button")}
                module="success-story"
              />
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </Layout>
  );
}
