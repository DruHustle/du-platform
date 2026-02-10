import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Quote, TrendingUp, Users, DollarSign, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function SuccessStories() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const heroSlides = [
    {
      image: "/images/partnership_handshake.png",
      badge: t('success.hero.badge1'),
      title: t('success.hero.title1'),
      subtitle: t('success.hero.subtitle1'),
      highlight: t('success.hero.highlight1')
    }
  ];

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, []);

  const stories = [
    {
      title: "Leather Goods Export Success",
      category: "Export",
      image: "/images/leather_products.jpg",
      impact: {
        revenue: "$2.5M",
        jobs: "150+",
        markets: "3 countries"
      },
      story: "A group of Zimbabwean diaspora professionals in Germany connected local leather manufacturers with European retailers. The diaspora network provided market intelligence on German consumer preferences, direct introductions to retail buyers, quality assurance guidance, and ongoing product development support.",
      testimonial: "The ZIGD platform connected us with diaspora members who understood both our craftsmanship and European market demands. Within 18 months, we went from local sales to exporting to three European countries.",
      author: "Tendai Moyo",
      role: "Managing Director, Zimbabwe Leather Collective"
    },
    {
      title: "Organic Horticulture Breakthrough",
      category: "Export",
      image: "/images/horticulture.jpg",
      impact: {
        revenue: "$850K",
        jobs: "85",
        markets: "Germany, Netherlands"
      },
      story: "A small-scale farming cooperative achieved EU organic certification with support from diaspora agronomists. The project now exports high-value vegetables to European supermarkets, with diaspora members providing technical expertise, certification guidance, and buyer connections.",
      testimonial: "We never imagined our small farm could meet European standards. The diaspora experts walked us through every step of organic certification and connected us directly with buyers.",
      author: "Grace Ncube",
      role: "Chairperson, Mazowe Organic Farmers Cooperative"
    },
    {
      title: "Tourism Lodge Investment",
      category: "Investment",
      image: "/images/victoria_falls.jpg",
      impact: {
        revenue: "$1.2M annually",
        jobs: "45",
        investors: "280 diaspora"
      },
      story: "Through ZIGD's crowdfunding platform, 280 diaspora investors pooled $500K to develop an eco-lodge near Victoria Falls. The lodge now generates steady returns while providing employment and supporting local communities. Diaspora investors receive quarterly dividends and enjoy preferential booking rates.",
      testimonial: "I invested $2,000 from the UK and now I'm part-owner of a beautiful lodge in my homeland. The transparency through NTIR gave me confidence, and the returns have exceeded expectations.",
      author: "Simba Chikwanha",
      role: "Diaspora Investor, London"
    },
    {
      title: "Stone Sculpture Export Network",
      category: "Trade",
      image: "/images/arts_crafts.jpg",
      impact: {
        revenue: "$450K",
        jobs: "60 artisans",
        markets: "USA, Canada, UK"
      },
      story: "Zimbabwean sculptors gained access to North American art markets through diaspora gallery owners and art dealers. The network provides market insights, handles logistics, and promotes Zimbabwean art at international exhibitions. Sales have tripled in two years.",
      testimonial: "Our sculptures are now displayed in galleries across three continents. The diaspora network understood both our artistic vision and international market dynamics.",
      author: "Patrick Mavros",
      role: "Master Sculptor, Harare"
    },
    {
      title: "Tech Startup Diaspora Funding",
      category: "Investment",
      image: "/images/tech_startup.jpg",
      impact: {
        revenue: "$3.5M valuation",
        jobs: "35",
        investors: "120 diaspora"
      },
      story: "A Harare-based fintech startup raised $750K from diaspora investors through ZIGD's investment platform. The company developed a mobile payment solution for rural areas, now serving 500K+ users. Diaspora investors provided both capital and technical mentorship.",
      testimonial: "Diaspora funding came with more than money—we gained advisors who understood Silicon Valley standards and African market realities. Their guidance was invaluable.",
      author: "Tafadzwa Chidavaenzi",
      role: "CEO, PayMoyo Technologies"
    },
    {
      title: "Honey Export Cooperative",
      category: "Export",
      image: "/images/honey_export.jpg",
      impact: {
        revenue: "$320K",
        jobs: "120 beekeepers",
        markets: "EU markets"
      },
      story: "Rural beekeepers formed a cooperative to export organic honey to Europe. Diaspora food scientists helped achieve EU certification, while diaspora business professionals secured contracts with specialty food retailers. The cooperative now supports 120 families.",
      testimonial: "From selling honey by the roadside to exporting to European supermarkets—the diaspora network made this transformation possible through technical support and market connections.",
      author: "Rudo Makoni",
      role: "Secretary, Masvingo Honey Cooperative"
    },
    {
      title: "Heritage Tourism Package Success",
      category: "Tourism",
      image: "/images/great_zimbabwe.jpeg",
      impact: {
        revenue: "$680K",
        tourists: "1,200+ diaspora",
        jobs: "28"
      },
      story: "A tourism operator developed specialized diaspora homecoming packages through ZIGD's platform. The packages combine family visits with cultural tourism, attracting over 1,200 diaspora tourists annually. The business employs local guides, drivers, and hospitality staff.",
      testimonial: "We created experiences that help diaspora reconnect with their roots while supporting local communities. ZIGD's platform gave us visibility to our target market.",
      author: "Chipo Mutasa",
      role: "Director, Heritage Trails Zimbabwe"
    },
    {
      title: "Macadamia Nut Processing Plant",
      category: "Investment",
      image: "/images/macadamia_nuts.jpg",
      impact: {
        revenue: "$1.8M",
        jobs: "95",
        investors: "340 diaspora"
      },
      story: "Diaspora crowdfunding enabled construction of Zimbabwe's first macadamia processing plant. The facility processes nuts from 200+ small-scale farmers, adding value before export. Government procurement contracts provide stable demand while export markets drive growth.",
      testimonial: "We raised $1.2M from diaspora investors who believed in value-addition. Now we're creating jobs, supporting farmers, and exporting premium products to Asia and Europe.",
      author: "Ngoni Sibanda",
      role: "Operations Manager, Zim Macadamia Processors"
    }
  ];

  const impactMetrics = [
    {
      icon: DollarSign,
      value: "$11.3M+",
      label: "Total Economic Impact",
      description: "Revenue generated across all success stories"
    },
    {
      icon: Users,
      value: "700+",
      label: "Jobs Created",
      description: "Direct employment opportunities"
    },
    {
      icon: TrendingUp,
      value: "1,000+",
      label: "Diaspora Investors",
      description: "Active participants in projects"
    },
    {
      icon: Award,
      value: "15+",
      label: "Markets Accessed",
      description: "International markets reached"
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
                backgroundImage: `url('${heroSlides[currentHeroIndex].image}')`,
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
                  {heroSlides[currentHeroIndex].badge}
                </Badge>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 hero-text-shadow leading-tight">
                {heroSlides[currentHeroIndex].title}
              </h1>
              <p className="text-xl md:text-2xl mb-6 text-white/90 leading-relaxed font-medium max-w-3xl">
                {heroSlides[currentHeroIndex].subtitle}
              </p>
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="h-6 w-6 text-zim-green" />
                <span className="text-2xl font-bold text-zim-gold">{heroSlides[currentHeroIndex].highlight}</span>
              </div>
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

      {/* Impact Metrics */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Collective Impact</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Measurable results from diaspora-driven initiatives across trade, tourism, and investment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {impactMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow border-t-4 border-t-primary">
                  <CardHeader>
                    <div className="mx-auto p-3 bg-primary/10 rounded-lg w-fit mb-3">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{metric.value}</div>
                    <CardTitle className="text-lg">{metric.label}</CardTitle>
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

      {/* Success Stories */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Success Stories</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Inspiring examples of diaspora collaboration driving economic growth
            </p>
          </div>

          <div className="space-y-12">
            {stories.map((story, index) => (
              <Card key={index} className="overflow-hidden border-t-4 border-t-accent hover:shadow-xl transition-shadow">
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Image */}
                  <div className="relative h-64 md:h-auto overflow-hidden">
                    <img 
                      src={story.image} 
                      alt={story.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-secondary text-secondary-foreground">
                        {story.category}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="md:col-span-2 p-6 space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-3">{story.title}</h3>
                      
                      {/* Impact Metrics */}
                      <div className="flex flex-wrap gap-4 mb-4">
                        {Object.entries(story.impact).map(([key, value], idx) => (
                          <div key={idx} className="text-center">
                            <p className="text-lg font-bold text-primary">{value}</p>
                            <p className="text-xs text-muted-foreground capitalize">{key}</p>
                          </div>
                        ))}
                      </div>

                      <p className="text-muted-foreground mb-4">{story.story}</p>
                    </div>

                    {/* Testimonial */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Quote className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                        <div>
                          <p className="italic text-sm mb-2">"{story.testimonial}"</p>
                          <p className="text-sm font-semibold">{story.author}</p>
                          <p className="text-xs text-muted-foreground">{story.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA with Modal */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <Card className="max-w-3xl mx-auto text-center border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Share Your Success Story</CardTitle>
              <CardDescription className="text-base">
                Have a success story to share? We'd love to feature your journey and inspire others.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="text-lg px-8">
                    Submit Your Story
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <ContactForm
                    title="Share Your Success Story"
                    description="Tell us about your diaspora-driven success and how we can feature it."
                    module="success-story"
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Be Part of the Next Success Story
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto opacity-95">
            Whether you're an investor, exporter, or diaspora professional, there's a role for you in Zimbabwe's economic transformation
          </p>
        </div>
      </section>
    </Layout>
  );
}
