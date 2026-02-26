import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Globe, Shield, TrendingUp, Lightbulb, CheckCircle, Tractor, Pickaxe, Truck, GraduationCap, Network, BarChart3, Wallet, Cpu, Signal, Building2, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import SubPageHero from "@/components/SubPageHero";

export default function Technology() {
  const { t } = useTranslation();
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [showInnovationHubs, setShowInnovationHubs] = useState(false);

  const heroSlides = useMemo(() => [
    {
      image: "/images/pages/technology/ai_innovation.jpg",
      badge: t('tech.hero.badge1') || "Future of Innovation",
      badgeIcon: Brain,
      title: t('tech.hero.title1') || "Onesa AI: Illuminating Zimbabwe",
      subtitle: t('tech.hero.subtitle1') || "The first AI model built specifically for the Zimbabwean context.",
      highlight: t('tech.hero.highlight1') || "Built for Zimbabwe",
      buttons: [
        {
          text: t('tech.chat_with_onesa') || "Chat with Onesa",
          variant: "primary",
          link: "/onesa-ai-chat",
          showArrow: true,
        },
      ]
    },
    {
      image: "/images/pages/home/partnership_handshake.png",
      badge: t('tech.hero.badge2') || "Contextual Intelligence",
      badgeIcon: Lightbulb,
      title: t('tech.hero.title2') || "Deep Contextual Understanding",
      subtitle: t('tech.hero.subtitle2') || "Unlike general AI, Onesa understands the nuances of life and business in Zimbabwe.",
      highlight: t('tech.hero.highlight2') || "Localized Knowledge"
    },
    {
      image: "/images/pages/technology/zim_tech_map.jpg",
      badge: t('tech.hero.badge3') || "Investor Tools",
      badgeIcon: Globe,
      title: t('tech.hero.title3') || "Smart Investment Brainstorming",
      subtitle: t('tech.hero.subtitle3') || "Assess risks and generate business ideas that actually succeed in the local market.",
      highlight: t('tech.hero.highlight3') || "Data-Driven Success"
    },
    {
      image: "/images/pages/technology/zim_tech_map.jpg",
      badge: t("tech.hero.badge4") || "Education 5.0",
      badgeIcon: TrendingUp,
      title: t("tech.hero.title4") || "Innovation in Classrooms",
      subtitle: t("tech.hero.subtitle4") || "Digital learning and skills development are powering Zimbabwe's next generation of tech talent.",
      highlight: t("tech.hero.highlight4") || "Future Skills"
    },
    {
      image: "/images/pages/trade/export_port1.jpg",
      badge: t("tech.hero.badge5") || "Digital Trade",
      badgeIcon: Network,
      title: t("tech.hero.title5") || "Technology for Logistics",
      subtitle: t("tech.hero.subtitle5") || "Smarter export and supply-chain systems create more reliable access to regional and global markets.",
      highlight: t("tech.hero.highlight5") || "Connected Trade"
    },
    {
      image: "/images/pages/shared/minerals_mining.png",
      badge: t("tech.hero.badge6") || "Industrial AI",
      badgeIcon: BarChart3,
      title: t("tech.hero.title6") || "Tech in Mining Operations",
      subtitle: t("tech.hero.subtitle6") || "Data-driven operations, predictive maintenance, and process optimization improve output and safety.",
      highlight: t("tech.hero.highlight6") || "Operational Efficiency"
    },
    {
      image: "/images/pages/shared/horticulture.jpg",
      badge: t("tech.hero.badge7") || "Agritech Growth",
      badgeIcon: MapPin,
      title: t("tech.hero.title7") || "Smarter Farming Systems",
      subtitle: t("tech.hero.subtitle7") || "Precision agriculture and real-time monitoring support stronger yields and food security outcomes.",
      highlight: t("tech.hero.highlight7") || "Climate-Smart Agriculture"
    },
    {
      image: "/images/pages/home/partnership_handshake.png",
      badge: t("tech.hero.badge8") || "Diaspora Builders",
      badgeIcon: Building2,
      title: t("tech.hero.title8") || "Tech Talent Across Borders",
      subtitle: t("tech.hero.subtitle8") || "Diaspora professionals contribute capital, mentorship, and practical execution support for local startups.",
      highlight: t("tech.hero.highlight8") || "Global Collaboration"
    }
  ], [t]);

  useEffect(() => {
    const heroTimer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(heroTimer);
  }, [heroSlides.length]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#technology-hubs") {
      setShowInnovationHubs(true);
    }
  }, []);

 const introData = {
  icon: Brain,
  title: "tech.objective_title",
  description: "tech.objective_subtitle"
 };

  const sectors = [
    {
      title: t('tech.sectors.mining.title') || "Mining & Resources",
      image: "/images/pages/shared/minerals_mining.png",
      description: t('tech.sectors.mining.desc') || "Leveraging AI for geological data analysis and regulatory compliance in Zimbabwe's vast mineral sector.",
      details: [t('tech.sectors.mining.d1') || "Real-time mineral pricing and market trends", t('tech.sectors.mining.d2') || "Environmental and safety compliance monitoring"]
    },
    {
      title: t('tech.sectors.farming.title') || "Precision Farming",
      image: "/images/pages/shared/horticulture.jpg",
      description: t('tech.sectors.farming.desc') || "Transforming agriculture through data-driven crop management and weather pattern prediction.",
      details: [t('tech.sectors.farming.d1') || "Soil health analysis and crop yield optimization", t('tech.sectors.farming.d2') || "Localized weather alerts and pest control advice"]
    },
    {
      title: t('tech.sectors.logistics.title') || "Smart Logistics",
      image: "/images/pages/trade/export_port1.jpg",
      description: t('tech.sectors.logistics.desc') || "Optimizing supply chains and cross-border trade routes through the Zimbabwean corridor.",
      details: [t('tech.sectors.logistics.d1') || "Route optimization for regional distribution", t('tech.sectors.logistics.d2') || "Real-time tracking and border clearance assistance"]
    },
    {
      title: t('tech.sectors.education.title') || "Future Education",
      image: "/images/pages/wikimedia/digital-classroom.jpg",
      description: t('tech.sectors.education.desc') || "Bridging the digital divide through AI-powered personalized learning and vocational training.",
      details: [t('tech.sectors.education.d1') || "Adaptive learning platforms for local schools", t('tech.sectors.education.d2') || "Technical skill development for the digital economy"]
    }
  ];

  const diasporaUseCases = [
    {
      icon: Globe,
      title: t("tech.diaspora_use_cases.relocation.title") || "Relocation & Reintegration",
      detail: t("tech.diaspora_use_cases.relocation.detail") || "Get practical guidance on housing, legal setup, schooling options, and service providers before arrival."
    },
    {
      icon: TrendingUp,
      title: t("tech.diaspora_use_cases.investment.title") || "Investment Screening",
      detail: t("tech.diaspora_use_cases.investment.detail") || "Compare opportunities by sector, expected returns, regulatory readiness, and market demand signals."
    },
    {
      icon: BarChart3,
      title: t("tech.diaspora_use_cases.business_intelligence.title") || "Business Intelligence",
      detail: t("tech.diaspora_use_cases.business_intelligence.detail") || "Generate market-entry briefs for exports, pricing benchmarks, and demand snapshots by destination market."
    },
    {
      icon: Network,
      title: t("tech.diaspora_use_cases.collaboration.title") || "Diaspora Collaboration",
      detail: t("tech.diaspora_use_cases.collaboration.detail") || "Coordinate mentors, co-investors, and operators across countries using shared project context."
    }
  ];

  const onesaVisionTiles = [
    {
      icon: Lightbulb,
      title: t("tech.onesa_matter.tiles.illuminate.title") || "Onesa Means Illuminate",
      detail:
        t("tech.onesa_matter.tiles.illuminate.detail") ||
        "Onesa is built to bring practical clarity for how people and businesses can grow in Zimbabwe and across Africa.",
    },
    {
      icon: Globe,
      title: t("tech.onesa_matter.tiles.africa_centric.title") || "Africa-Centric Intelligence",
      detail:
        t("tech.onesa_matter.tiles.africa_centric.detail") ||
        "Models grounded in African languages, markets, and realities create more relevant and useful outcomes.",
    },
    {
      icon: Shield,
      title: t("tech.onesa_matter.tiles.sovereignty.title") || "AI Sovereignty",
      detail:
        t("tech.onesa_matter.tiles.sovereignty.detail") ||
        "Owning our data, models, and infrastructure protects long-term strategic independence and resilience.",
    },
    {
      icon: TrendingUp,
      title: t("tech.onesa_matter.tiles.growth.title") || "Future-Ready Growth",
      detail:
        t("tech.onesa_matter.tiles.growth.detail") ||
        "Onesa supports innovation, investment confidence, and stronger digital participation for future generations.",
    },
  ];

  const digitalMomentum = [
    {
      icon: Signal,
      title: t("tech.momentum.connectivity.title") || "Connectivity Expansion",
      detail:
        t("tech.momentum.connectivity.detail") ||
        "Internet penetration is now above 80%, with market shifts from new broadband entrants and rapid 5G rollout.",
    },
    {
      icon: Cpu,
      title: t("tech.momentum.ai_strategy.title") || "National AI Strategy (2026-2030)",
      detail:
        t("tech.momentum.ai_strategy.detail") ||
        "Zimbabwe now has a formal AI strategy focused on practical deployment in priority sectors and public service delivery.",
    },
    {
      icon: Wallet,
      title: t("tech.momentum.digital_payments.title") || "Digital Payments at Scale",
      detail:
        t("tech.momentum.digital_payments.detail") ||
        "Mobile money remains the dominant rail for transactions, creating strong demand for fintech tooling and integrations.",
    },
  ];

  const fintechSandboxPhases = [
    t("tech.fintech.phases.pre_application") || "Pre-application",
    t("tech.fintech.phases.application") || "Application and evaluation",
    t("tech.fintech.phases.testing") || "Testing in a controlled live environment",
    t("tech.fintech.phases.exit") || "Exit and deployment decision",
  ];

  const innovationHubs = [
    {
      name: "Impact Hub Harare",
      focus:
        t("tech.hubs.impact_hub") ||
        "Social innovation, youth entrepreneurship, mentorship, and incubation programs.",
      city: t("tech.hubs.cities.harare") || "Harare",
      url: "https://harare.impacthub.net/",
    },
    {
      name: "Eight2Five Innovation Hub",
      focus:
        t("tech.hubs.eight2five") ||
        "CBD innovation center supporting startup acceleration and venture-building programs.",
      city: t("tech.hubs.cities.harare") || "Harare",
      url: "https://www.oldmutual.co.zw/eight2five-innovation-hub/",
    },
    {
      name: "Stanbic Incubator Hub",
      focus:
        t("tech.hubs.stanbic") ||
        "Capacity-building support, workspace access, and ecosystem partnership opportunities.",
      city: t("tech.hubs.cities.harare") || "Harare",
      url: "https://www.stanbicbank.co.zw/zimbabwe/personal/products-and-services/bank-with-us/our-innovative-hub",
    },
    {
      name: "HIT Innovation Hub",
      focus:
        t("tech.hubs.hit") ||
        "Industry 4.0 commercialization with focus on IoT, AI, and big-data solutions.",
      city: t("tech.hubs.cities.harare") || "Harare",
      url: "https://www.hit-ttlcc.ac.zw/",
    },
    {
      name: "ZCHPC Incubation Hub",
      focus:
        t("tech.hubs.zchpc") ||
        "High-performance computing and AI use cases for agriculture, health, and research.",
      city: t("tech.hubs.cities.harare") || "Harare",
      url: "https://www.zchpc.ac.zw/",
    },
    {
      name: "B2C Coworking",
      focus:
        t("tech.hubs.b2c") ||
        "Urban coworking and accelerator-style support for practical local problem-solving startups.",
      city: t("tech.hubs.cities.harare") || "Harare",
      url: "https://b2c.co.zw/",
    },
    {
      name: "The TechVillage",
      focus:
        t("tech.hubs.techvillage") ||
        "Bulawayo-based startup community and innovation hub with accelerator activities and founder support programs.",
      city: t("tech.hubs.cities.bulawayo") || "Bulawayo",
      url: "https://www.techvillage.org.zw/",
    },
    {
      name: "NUST Innovation Hub & Technovation",
      focus:
        t("tech.hubs.nust") ||
        "University-driven innovation and commercialization ecosystem supporting youth-led enterprise and industry-focused solutions.",
      city: t("tech.hubs.cities.bulawayo") || "Bulawayo",
      url: "https://www.nust.ac.zw/",
    },
    {
      name: "MSU Innovation Hub",
      focus:
        t("tech.hubs.msu") ||
        "Midlands-based incubation and commercialization platform supporting entrepreneurs, SMEs, and applied research spin-outs.",
      city: t("tech.hubs.cities.gweru") || "Gweru",
      url: "https://hub.msu.ac.zw/",
    },
    {
      name: "The Digital Village",
      focus:
        t("tech.hubs.digital_village") ||
        "Community-focused innovation space in Mutare providing collaborative workspace, training, and digital-business support.",
      city: t("tech.hubs.cities.mutare") || "Mutare",
      url: "https://www.digitalvillagezw.com/",
    },
  ];

  return (
    <Layout>
      
      {/* Hero Section */}
      <section id="hero" >
        <SubPageHero 
          heroSlides={heroSlides} 
          intro={introData} 
          />
      </section>

    {/* Onesa Intro - Glassy UI */}
    <section id="onesa-intro" className="p-5 bg-slate-950 relative overflow-hidden">
      <div className="container relative z-10 px-6 mx-auto">
        {/* Unified Onesa glass container, aligned to full content width */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02]  shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group"
          >
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />

            {/* Top row: Onesa intro, status, and demo preview */}
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="w-full md:w-1/2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zim-gold/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-zim-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight">{t("tech.onesa_name") || "Onesa AI"}</h3>
                    <span className="text-zim-gold text-[9px] uppercase font-black tracking-widest border-l border-zim-gold/30 pl-3">
                      {t("tech.ai_status") || "Beta Version"}
                    </span>
                  </div>
                </div>

                <div className="bg-white/[0.02] p-5 rounded-2xl border border-white/10 space-y-3 relative">
                  <p className="text-white/40 italic text-[11px] font-medium leading-relaxed">
                    "{t("tech.ai_demo_question") || "What are some high ROI investment opportunities in Zimbabwe's agriculture sector right now?"}"
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-zim-gold flex-shrink-0 flex items-center justify-center text-zim-black font-black text-[10px] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                      O
                    </div>
                    <p className="text-[13px] text-white/90 leading-relaxed font-light">
                      {t("tech.ai_demo_response") || "Zimbabwe's agriculture sector is currently seeing high growth in horticulture exports. Based on current trends, investing in cold-chain logistics for blueberry exports from the Eastern Highlands offers a high ROI with moderate risk..."}
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-zim-gold/20 to-transparent" />
                </div>
              </div>

              <div className="w-full md:w-1/2 text-center md:text-left space-y-4">
                <Badge className="bg-zim-gold/10 text-zim-gold border border-zim-gold/20 text-[10px] font-black uppercase tracking-widest">
                  {t("tech.onesa_meaning_badge") || "Onesa = Illuminate"}
                </Badge>
                <p className="text-sm text-white/60 leading-relaxed font-light">
                  {t("tech.onesa_desc1") || "Onesa AI is our proprietary model designed to illuminate the way on how to live, invest, and thrive in Zimbabwe. While general AI models often lack local nuance, Onesa is built from the ground up to understand the Zimbabwean context better than any other model."}
                </p>

                <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                  <div className="flex items-center gap-3 bg-white/[0.02] px-4 py-2 rounded-full border border-white/10">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-zim-gold" />
                      <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{t("tech.onesa_usp1") || "Contextual Understanding"}</span>
                    </div>
                    <div className="h-3 w-[1px] bg-white/10" />
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-zim-gold" />
                      <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">{t("tech.onesa_usp2") || "Accurate Language Translation"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom row: Why Onesa AI matters and value pillars */}
            <div id="technology-onesa-vision" className="relative z-10 mt-10 pt-8 border-t border-white/10">
              <div className="space-y-8">
                <div>
                  <div className="flex flex-col items-center gap-3 mb-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Sparkles className="h-6 w-6 text-zim-gold" />
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {t("tech.onesa_matter.title") || "Why Onesa AI Matters"}
                      </h3>
                    </div>
                    <Link href="/onesa-ai-chat">
                      <Button className="shrink-0 bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                        {t('tech.chat_with_onesa') || "Chat with Onesa"}
                      </Button>
                    </Link>
                  </div>
                  <p className="max-w-3xl mx-auto text-center text-white/75 text-sm leading-relaxed mb-4">
                    {t("tech.onesa_matter.headline") || "Africa deserves AI that understands Africa."}
                  </p>
                  <p className="text-white/75 text-sm leading-relaxed mb-4">
                    {t("tech.onesa_matter.p1") ||
                      "Across the world, AI is reshaping economies, industries, and societies at incredible speed. Yet most models are built on data, priorities, and contexts that often miss African realities. For Africa to fully participate in the global digital economy, we need Africa-centric models that understand our languages, cultures, business environments, and development priorities."}
                     
                     {t("tech.onesa_matter.p2") ||
                      "At Diaspora Unlocked, we believe Africa should not only consume AI. Africa must help build it. That belief is exactly why we began developing Onesa AI: to create intelligent systems that are truly relevant to African markets, African data environments, and African economic transformation goals."}
                  </p>
                  <p className="text-white/75 text-sm leading-relaxed mb-4">
                    {t("tech.onesa_matter.p3") ||
                      "We also know this journey is not easy. Training AI models demands serious infrastructure, computing power, data preparation, and world-class talent. The costs are high, and the barriers are real. We chose to move forward anyway because Africa's long-term future depends on technological ownership, digital independence, and the ability to shape our own digital ecosystems."}
                     
                     {t("tech.onesa_matter.p4") ||
                      "AI sovereignty is becoming one of the defining global conversations of this era. Nations that control their data, their models, and their digital infrastructure will be better positioned to protect their economies, accelerate innovation, and preserve strategic independence. Africa must be in that future, not as observers, but as creators and leaders."}
                  </p>
                  <p className="text-white/85 text-sm leading-relaxed font-medium">
                    {t("tech.onesa_matter.p5") ||
                      "Onesa AI is our commitment to that future. This is bigger than technology. It is about opportunity, resilience, and building systems that serve future generations across the continent and the diaspora."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {onesaVisionTiles.map((tile) => (
                    <div key={tile.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 h-full">
                      <div className="flex items-center gap-2 mb-3">
                        <tile.icon className="h-4 w-4 text-zim-gold" />
                        <h3 className="text-white font-black text-sm tracking-tight">{tile.title}</h3>
                      </div>
                      <p className="text-white/70 text-xs leading-relaxed">{tile.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>

    {/* Diaspora Use Cases */}
    <section id="technology-diaspora-use-cases" className="p-5 bg-slate-950 relative overflow-hidden">
      <div className="container relative z-10 px-6 mx-auto">
        <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500">
          <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <Globe className="h-6 w-6 text-zim-gold" />
              <h3 className="text-xl font-black text-white tracking-tight">{t("tech.diaspora_ai.title") || "How Diaspora Unlocked Uses AI"}</h3>
            </div>
            <p className="text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">
              {t("tech.diaspora_ai.subtitle") || "Onesa AI is built to support the full diaspora journey, from reconnecting and returning to evaluating opportunities and operating businesses."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {diasporaUseCases.map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-zim-gold/10 border border-zim-gold/20">
                    <item.icon className="h-5 w-5 text-zim-gold" />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">{item.title}</h3>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Sector Transformation - Cinematic Glass Grid */}
    <section id="technology-industries" className="p-5 bg-slate-950 relative overflow-hidden">
      {/* Background glow for depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="container relative z-10 px-6 mx-auto">
        <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
          <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <BarChart3 className="h-6 w-6 text-zim-gold" />
              <h3 className="text-xl font-black text-white tracking-tight">
              {t('tech.sectors_title') || "Powering Key Industries"}
              </h3>
            </div>
            <p className="text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">
              {t('tech.sectors_subtitle') || "Onesa AI provides specialized intelligence to optimize Zimbabwe's most critical economic sectors."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {sectors.map((sector, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
              >
                {/* Standardized glass card style */}
                <div className="relative h-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02]">
                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Image Section */}
                    <div className="sm:w-2/5 h-44 sm:h-auto relative overflow-hidden rounded-l-[2rem]">
                      <img
                        src={sector.image}
                        alt={sector.title}
                        className="h-full w-full object-cover saturate-[0.85] group-hover:saturate-100 group-hover:scale-105 transition-all duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                    </div>

                    {/* Content Section */}
                    <div className="p-8 sm:w-3/5 flex flex-col justify-center">
                      <h3 className="text-lg font-black text-white tracking-tight mb-2 group-hover:text-zim-gold transition-colors">
                        {sector.title}
                      </h3>
                      <p className="text-[13px] text-white/60 mb-5 leading-relaxed font-light">
                        {sector.description}
                      </p>
                      
                      <ul className="space-y-2.5">
                        {sector.details.map((detail, dIdx) => (
                          <li key={dIdx} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-white/80">
                            <div className="h-1.5 w-1.5 rounded-full bg-zim-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Innovation Hubs */}
    {showInnovationHubs && (
      <section id="technology-hubs" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="mb-10 text-center">
              <h2 className="text-xl font-black text-white tracking-tight">
                {t("tech.hubs.title") || "Startup Incubators and Innovation Hubs (Zimbabwe)"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {innovationHubs.map((hub) => (
                <div key={hub.name} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-zim-gold" />
                    <h3 className="text-lg font-black text-white tracking-tight">{hub.name}</h3>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mb-3">{hub.focus}</p>
                  <div className="flex items-center justify-between gap-2 text-white/50 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{hub.city}{t("tech.hubs.location_suffix") || ", Zimbabwe"}</span>
                    </div>
                    <a href={hub.url} target="_blank" rel="noopener noreferrer" className="text-zim-gold hover:text-white transition-colors font-semibold">
                      {t("tech.hubs.visit_site") || "Visit site"}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )}

    {/* Digital Transformation Snapshot */}
    <section id="technology-momentum" className="p-5 bg-slate-950 relative overflow-hidden">
      <div className="container relative z-10 px-6 mx-auto">
        <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
          <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
          <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <Signal className="h-6 w-6 text-zim-gold" />
              <h3 className="text-xl font-black text-white tracking-tight">
              {t("tech.momentum.title") || "Zimbabwe Technology Momentum (2026)"}
              </h3>
            </div>
            <p className="text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">
              {t("tech.momentum.subtitle") ||
                "Zimbabwe is moving from technology consumption to local solution creation, led by fintech, agritech, and AI adoption."}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {digitalMomentum.map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-zim-gold/10 border border-zim-gold/20">
                    <item.icon className="h-5 w-5 text-zim-gold" />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">{item.title}</h3>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-zim-gold/10 border border-zim-gold/20">
                  <Building2 className="h-5 w-5 text-zim-gold" />
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {t("tech.momentum.hubs.title") || "Innovation Hubs and Incubators"}
                </h3>
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-5">
                {t("tech.momentum.hubs.detail") || "Explore startup incubators and innovation hubs across Zimbabwe and open the full hub directory."}
              </p>
              <Button
                className="bg-zim-gold text-zim-black hover:bg-white font-bold text-xs md:text-sm rounded-full px-5 h-10 whitespace-normal"
                onClick={() => {
                  setShowInnovationHubs(true);
                  setTimeout(() => {
                    const target = document.getElementById("technology-hubs");
                    target?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 0);
                }}
              >
                {t("tech.hubs.open_button") || "Tech Hubs in Zimbabwe"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Fintech Regulatory Environment */}
    <section id="technology-fintech-regulation" className="pt-5 pb-10 bg-slate-950 relative overflow-hidden">
      <div className="container relative z-10 px-6 mx-auto">
        <div className="relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group">
          <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
          <div className="mb-10 text-center">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-zim-gold" />
              <h3 className="text-xl font-black text-white tracking-tight">
                {t("tech.fintech.title") || "Fintech Regulatory Requirements (RBZ)"}
              </h3>
            </div>
            <p className="mt-4 text-white/75 text-sm leading-relaxed max-w-3xl mx-auto">
              {t("tech.fintech.subtitle") ||
                "Fintech solutions are regulated through RBZ supervision, sandbox testing, and licensing obligations for payment and financial service operations."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
              <h4 className="text-lg font-black text-white tracking-tight mb-4">{t("tech.fintech.sandbox_title") || "Regulatory Sandbox"}</h4>
              <p className="text-white/70 text-sm mb-4">
                {t("tech.fintech.sandbox_detail") ||
                  "Startups can test innovations in a monitored environment for up to 24 months. Cryptocurrency and digital-currency testing is excluded."}
              </p>
              <div className="flex flex-wrap gap-2">
                {fintechSandboxPhases.map((phase) => (
                  <Badge key={phase} className="bg-white/5 text-white/70 border border-white/10">{phase}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
              <h4 className="text-lg font-black text-white tracking-tight mb-4">{t("tech.fintech.licensing_title") || "Licensing and Operating Requirements"}</h4>
              <ul className="space-y-3">
                <li className="text-white/75 text-sm">{t("tech.fintech.l1") || "Register legal entity first (typically Private Limited) before regulated fintech operations."}</li>
                <li className="text-white/75 text-sm">{t("tech.fintech.l2") || "Plan for PSP licensing costs and ongoing compliance obligations."}</li>
                <li className="text-white/75 text-sm">{t("tech.fintech.l3") || "Some financial products require minimum capital thresholds and fit-and-proper controls."}</li>
                <li className="text-white/75 text-sm">{t("tech.fintech.l4") || "Mobile-wallet and bank-connected services usually require partnership with a locally licensed bank."}</li>
              </ul>
            </div>
          </div>

          <Link href="/regulations#investment-compliance">
            <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
              {t("tech.more_compliance_information") || "More Compliance Information"}
            </Button>
          </Link>
        </div>
      </div>
    </section>



    </Layout>
  );
}
