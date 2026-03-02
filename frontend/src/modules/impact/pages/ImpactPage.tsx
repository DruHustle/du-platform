import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Quote, TrendingUp, Award, Trophy, Sparkles, Globe, MessageSquare, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";
import { api } from "@/lib/api";

const PROFILE_IMAGE_A =
  "/images/pages/home/partnership_handshake.png";
const PROFILE_IMAGE_B =
  "/images/pages/home/partnership_handshake.png";
const PROFILE_IMAGE_C =
  "/images/pages/home/partnership_handshake.png";
const PROFILE_IMAGE_D =
  "/images/pages/home/partnership_handshake.png";

const DIVERSE_PEOPLE_IMAGES = [
  PROFILE_IMAGE_A,
  PROFILE_IMAGE_B,
  PROFILE_IMAGE_C,
  PROFILE_IMAGE_D,
];

const IMPACT_METRIC_EMOJIS = ["💰", "👥", "📈", "🌍"] as const;
type ImpactMetric = {
  display?: unknown;
  emoji?: string;
  value: string;
  label: string;
  description: string;
};

type ApiStory = {
  id: number;
  title: string;
  category: string;
  image: string;
  story: string;
  testimonial: string;
  author: string;
  role: string;
  revenue: string;
  jobs: string;
  markets: string;
  is_published: 0 | 1;
  display?: boolean | string | number;
};

export default function Impact() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [apiStories, setApiStories] = useState<ApiStory[]>([]);
  const [storiesLoaded, setStoriesLoaded] = useState(false);
  const [storiesLoadFailed, setStoriesLoadFailed] = useState(false);

  const isVisible = (display: unknown) => {
    if (display === true || display === 1) return true;
    if (typeof display === "string") {
      const normalized = display.trim().toLowerCase();
      return ["true", "1", "yes", "on"].includes(normalized);
    }
    return false;
  };

  const normalizeKey = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const normalizePeopleImage = (image: string | undefined, index: number) => {
    if (!image) return DIVERSE_PEOPLE_IMAGES[index % DIVERSE_PEOPLE_IMAGES.length];

    const normalizedSource = image.toLowerCase().replace(/%20/g, " ").replace(/[^a-z0-9]/g, "");
    const peopleSignals = [
      "teammeeting",
      "handshake",
      "womansmiling",
      "manatalaptop",
      "scientistatcomputer",
      "lachendefrau",
      "people",
      "office",
      "portrait",
    ];
    const looksLikePeoplePhoto = peopleSignals.some((signal) => normalizedSource.includes(signal));

    return looksLikePeoplePhoto ? DIVERSE_PEOPLE_IMAGES[index % DIVERSE_PEOPLE_IMAGES.length] : image;
  };

  // --- 1. ALL 5 HERO SLIDES ---
  const heroSlides = useMemo(() => [
    {
      image: PROFILE_IMAGE_A,
      badge: t("impact.hero.badge1") || "Impact Stories",
      badgeIcon: Award,
      title: t("impact.hero.title1") || "Diaspora Driving ",
      subtitle: t("impact.hero.subtitle1") || "Real-world examples of how the Zimbabwean diaspora is making a tangible difference.",
      highlight: t("impact.hero.highlight1") || "Change"
    },
    {
      image: PROFILE_IMAGE_B,
      badge: t("impact.hero.badge2") || "Innovation",
      badgeIcon: Sparkles,
      title: t("impact.hero.title2") || "Tech & Entrepreneurship ",
      subtitle: t("impact.hero.subtitle2") || "Showcasing groundbreaking ventures fueled by diaspora expertise and investment.",
      highlight: t("impact.hero.highlight2") || "Success"
    },
    {
      image: PROFILE_IMAGE_C,
      badge: t("impact.hero.badge3") || "Cultural Exchange",
      badgeIcon: Trophy,
      title: t("impact.hero.title3") || "Preserving Heritage Through ",
      subtitle: t("impact.hero.subtitle3") || "Highlighting initiatives that bring Zimbabwean culture to the global stage.",
      highlight: t("impact.hero.highlight3") || "Trade"
    },
    {
      image: PROFILE_IMAGE_D,
      badge: t("impact.hero.badge4") || "Sustainable Development",
      badgeIcon: Globe,
      title: t("impact.hero.title4") || "Green Initiatives & ",
      subtitle: t("impact.hero.subtitle4") || "Stories of environmental stewardship and upliftment in rural communities.",
      highlight: t("impact.hero.highlight4") || "Community Growth"
    },
    {
      image: "/images/pages/shared/minerals_mining.png",
      badge: t("impact.hero.badge5") || "Resource Mobilization",
      badgeIcon: TrendingUp,
      title: t("impact.hero.title5") || "Unlocking Potential Through ",
      subtitle: t("impact.hero.subtitle5") || "How diaspora capital is transforming key sectors and creating opportunities.",
      highlight: t("impact.hero.highlight5") || "Investment"
    },
    {
      image: "/images/pages/wikimedia/small-honey-jar.jpg",
      badge: "Agri Success",
      badgeIcon: Award,
      title: "Value Chain Transformation",
      subtitle: "Agricultural processing and market access projects are creating income and jobs in rural communities.",
      highlight: "Rural Impact"
    },
    {
      image: "/images/pages/tourism/victoria_falls.jpg",
      badge: "Tourism Returns",
      badgeIcon: Globe,
      title: "Destination-Led Growth",
      subtitle: "Tourism-linked businesses are combining diaspora capital with local operations for sustainable growth.",
      highlight: "Local Enterprise"
    },
    {
      image: "/images/pages/shared/leather_products.jpg",
      badge: "Manufacturing Stories",
      badgeIcon: TrendingUp,
      title: "Export-Ready Production",
      subtitle: "Diaspora-supported manufacturing projects are scaling from local sales to global distribution channels.",
      highlight: "Trade Expansion"
    }
  ], [t]);

  // --- 2. ALL 8 STORIES DATA WITH BOOLEAN SHIELD ---
  const storiesData = useMemo(() => {
    const rawData = t("impact.stories_list", { returnObjects: true });
    
    // Type Guard & Fallback Array
    if (!Array.isArray(rawData)) {
      return [
        {
          display: false,
          title: t("impact.stories.leather_goods.title") || "Leather Goods Export Success",
          category: t("impact.stories.leather_goods.category") || "Export",
          image: "/images/pages/shared/leather_products.jpg",
          impact: { revenue: "$2.5M", jobs: "150+", markets: "3 countries" },
          story: t("impact.stories.leather_goods.story") || "A group of Zimbabwean diaspora professionals in Germany connected local leather manufacturers with European retailers. The diaspora network provided market intelligence on German consumer preferences, direct introductions to retail buyers, quality assurance guidance, and ongoing product development support.",
          testimonial: t("impact.stories.leather_goods.testimonial") || "Diaspora Unlocked connected us with diaspora members who understood both our craftsmanship and European market demands. Within 18 months, we went from local sales to exporting to three European countries.",
          author: t("impact.stories.leather_goods.author") || "Tendai Moyo",
          role: t("impact.stories.leather_goods.role") || "Managing Director, Zimbabwe Leather Collective"
        },
        {
          display: false,
          title: t("impact.stories.horticulture_breakthrough.title") || "Organic Horticulture Breakthrough",
          category: t("impact.stories.horticulture_breakthrough.category") || "Export",
          image: "/images/pages/shared/horticulture.jpg",
          impact: { revenue: "$850K", jobs: "85", markets: "Germany, Netherlands" },
          story: t("impact.stories.horticulture_breakthrough.story") || "A small-scale farming cooperative achieved EU organic certification with support from diaspora agronomists. The project now exports high-value vegetables to European supermarkets, with diaspora members providing technical expertise, certification guidance, and buyer connections.",
          testimonial: t("impact.stories.horticulture_breakthrough.testimonial") || "We never imagined our small farm could meet European standards. The diaspora experts walked us through every step of organic certification and connected us directly with buyers.",
          author: t("impact.stories.horticulture_breakthrough.author") || "Grace Ncube",
          role: t("impact.stories.horticulture_breakthrough.role") || "Chairperson, Mazowe Organic Farmers Cooperative"
        },
        {
          display: false,
          title: t("impact.stories.tourism_lodge.title") || "Tourism Lodge Investment",
          category: t("impact.stories.tourism_lodge.category") || "Investment",
          image: "/images/pages/tourism/victoria_falls.jpg",
          impact: { revenue: "$1.2M annually", jobs: "45", investors: "280 diaspora" },
          story: t("impact.stories.tourism_lodge.story") || "Through Diaspora Unlocked's crowdfunding platform, 280 diaspora investors pooled $500K to develop an eco-lodge near Victoria Falls. The lodge now generates steady returns while providing employment and supporting local communities. Diaspora investors receive quarterly dividends and enjoy preferential booking rates.",
          testimonial: t("impact.stories.tourism_lodge.testimonial") || "I invested $2,000 from the UK and now I'm part-owner of a beautiful lodge in my homeland. The transparency through NTIR gave me confidence, and the returns have exceeded expectations.",
          author: t("impact.stories.tourism_lodge.author") || "Simba Chikwanha",
          role: t("impact.stories.tourism_lodge.role") || "Diaspora Investor, London"
        },
        {
          display: false,
          title: t("impact.stories.stone_sculpture.title") || "Stone Sculpture Export Network",
          category: t("impact.stories.stone_sculpture.category") || "Trade",
          image: "/images/pages/wikimedia/faces-4.jpg",
          impact: { revenue: "$450K", jobs: "60 artisans", markets: "USA, CAN, UK" },
          story: t("impact.stories.stone_sculpture.story") || "Zimbabwean sculptors gained access to North American art markets through diaspora gallery owners and art dealers. The network provides market insights, handles logistics, and promotes Zimbabwean art at international exhibitions. Sales have tripled in two years.",
          testimonial: t("impact.stories.stone_sculpture.testimonial") || "Our sculptures are now displayed in galleries across three continents. The diaspora network understood both our artistic vision and international market dynamics.",
          author: t("impact.stories.stone_sculpture.author") || "Patrick Mavros",
          role: t("impact.stories.stone_sculpture.role") || "Master Sculptor, Harare"
        },
        {
          display: false,
          title: t("impact.stories.tech_startup.title") || "Tech Startup Diaspora Funding",
          category: t("impact.stories.tech_startup.category") || "Investment",
          image: PROFILE_IMAGE_D,
          impact: { revenue: "$3.5M valuation", jobs: "35", investors: "120 diaspora" },
          story: t("impact.stories.tech_startup.story") || "A Harare-based fintech startup raised $750K from diaspora investors through Diaspora Unlocked's investment platform. The company developed a mobile payment solution for rural areas, now serving 500K+ users. Diaspora investors provided both capital and technical mentorship.",
          testimonial: t("impact.stories.tech_startup.testimonial") || "Diaspora funding came with more than money—we gained advisors who understood Silicon Valley standards and African market realities. Their guidance was invaluable.",
          author: t("impact.stories.tech_startup.author") || "Tafadzwa Chidavaenzi",
          role: t("impact.stories.tech_startup.role") || "CEO, PayMoyo Technologies"
        },
        {
          display: false,
          title: t("impact.stories.honey_export.title") || "Honey Export Cooperative",
          category: t("impact.stories.honey_export.category") || "Export",
          image: "/images/pages/wikimedia/small-honey-jar.jpg",
          impact: { revenue: "$320K", jobs: "120 beekeepers", markets: "EU markets" },
          story: t("impact.stories.honey_export.story") || "Rural beekeepers formed a cooperative to export organic honey to Europe. Diaspora food scientists helped achieve EU certification, while diaspora business professionals secured contracts with specialty food retailers. The cooperative now supports 120 families.",
          testimonial: t("impact.stories.honey_export.testimonial") || "From selling honey by the roadside to exporting to European supermarkets—the diaspora network made this transformation possible through technical support and market connections.",
          author: t("impact.stories.honey_export.author") || "Rudo Makoni",
          role: t("impact.stories.honey_export.role") || "Secretary, Masvingo Honey Cooperative"
        },
        {
          display: false,
          title: t("impact.stories.heritage_tourism.title") || "Heritage Tourism Package Success",
          category: t("impact.stories.heritage_tourism.category") || "Tourism",
          image: "/images/pages/tourism/great_zimbabwe.jpeg",
          impact: { revenue: "$680K", tourists: "1,200+ diaspora", jobs: "28" },
          story: t("impact.stories.heritage_tourism.story") || "A tourism operator developed specialized diaspora homecoming packages through Diaspora Unlocked's platform. The packages combine family visits with cultural tourism, attracting over 1,200 diaspora tourists annually. The business employs local guides, drivers, and hospitality staff.",
          testimonial: t("impact.stories.heritage_tourism.testimonial") || "We created experiences that help diaspora reconnect with their roots while supporting local communities. Diaspora Unlocked gave us visibility to our target market.",
          author: t("impact.stories.heritage_tourism.author") || "Chipo Mutasa",
          role: t("impact.stories.heritage_tourism.role") || "Director, Heritage Trails Zimbabwe"
        },
        {
          display: false,
          title: t("impact.stories.macadamia_nut.title") || "Macadamia Nut Processing Plant",
          category: t("impact.stories.macadamia_nut.category") || "Investment",
          image: "/images/pages/wikimedia/macadamia-nuts.jpg",
          impact: { revenue: "$1.8M", jobs: "95", investors: "340 diaspora" },
          story: t("impact.stories.macadamia_nut.story") || "Diaspora crowdfunding enabled construction of Zimbabwe's first macadamia processing plant. The facility processes nuts from 200+ small-scale farmers, adding value before export. Government procurement contracts provide stable demand while export markets drive growth.",
          testimonial: t("impact.stories.macadamia_nut.testimonial") || "We raised $1.2M from diaspora investors who believed in value-addition. Now we're creating jobs, supporting farmers, and exporting premium products to Asia and Europe.",
          author: t("impact.stories.macadamia_nut.author") || "Ngoni Sibanda",
          role: t("impact.stories.macadamia_nut.role") || "Operations Manager, Zim Macadamia Processors"
        }
      ];
    }
    return rawData;
  }, [t]);

  useEffect(() => {
    api
      .get("/impact")
      .then(({ data }) => {
        setApiStories(Array.isArray(data?.stories) ? data.stories : []);
        setStoriesLoadFailed(false);
        setStoriesLoaded(true);
      })
      .catch(() => {
        setApiStories([]);
        setStoriesLoadFailed(true);
        setStoriesLoaded(true);
      });
  }, []);

  // --- 3. IMPACT METRICS DATA ---
  const impactData = useMemo(() => {
    const normalizeMetric = (metric: any): ImpactMetric => ({
      display: metric?.display,
      emoji: typeof metric?.emoji === "string" ? metric.emoji : undefined,
      value: String(metric?.value ?? ""),
      label: String(metric?.label ?? ""),
      description: String(metric?.description ?? ""),
    });

    const rawMetrics = t("impact.metrics_list", { returnObjects: true });
    if (Array.isArray(rawMetrics)) {
      return rawMetrics.map(normalizeMetric).filter((metric) => metric.value && metric.label);
    }

    return [
      { display: false, emoji: "💰", value: "$11.3M+", label: "Total Economic Impact", description: "Revenue generated across all impact stories" },
      { display: false, emoji: "👥", value: "700+", label: "Jobs Created", description: "Direct employment opportunities" },
      { display: false, emoji: "📈", value: "1,000+", label: "Diaspora Investors", description: "Active participants in projects" },
      { display: false, emoji: "🌍", value: "15+", label: "Markets Accessed", description: "International markets reached" },
    ];
  }, [t]);

  const regionalBreakdown = [
    { region: "South Africa", population: "1.5 - 2.0 Million", percentage: "43%", flag: "🇿🇦" },
    { region: "United Kingdom", population: "500K - 1.0 Million", percentage: "22%", flag: "🇬🇧" },
    { region: "Botswana", population: "500K+", percentage: "14%", flag: "🇧🇼" },
    { region: "United States", population: "300K - 500K", percentage: "9%", flag: "🇺🇸" },
    { region: "Australia", population: "50K - 100K", percentage: "3%", flag: "🇦🇺" },
    { region: "Canada", population: "50K - 100K", percentage: "2%", flag: "🇨🇦" },
    { region: "Germany", population: "30K - 50K", percentage: "1%", flag: "🇩🇪" },
    { region: "Other Countries", population: "200K+", percentage: "6%", flag: "🌍" },
  ];

  const remittanceImpact = [
    { sector: "Education", percentage: "28%", amount: "$504M", icon: "📚" },
    { sector: "Housing & Construction", percentage: "24%", amount: "$432M", icon: "🏠" },
    { sector: "Healthcare", percentage: "18%", amount: "$324M", icon: "🏥" },
    { sector: "Business Investment", percentage: "17%", amount: "$306M", icon: "💼" },
    { sector: "Food & Basic Needs", percentage: "13%", amount: "$234M", icon: "🛒" },
  ];

  const remittance2025TotalBillions = 1.8;
  const remittance2024TotalBillions = remittance2025TotalBillions * 0.92;

  const percentageToShare = (percentage: string) => {
    const numeric = Number(String(percentage || "").replace(/[^\d.]/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return numeric / 100;
  };

  const formatRemittanceByShare = (share: number, totalBillions: number) => {
    const valueBillions = share * totalBillions;
    if (valueBillions >= 1) return `$${valueBillions.toFixed(2)}B`;
    return `$${Math.round(valueBillions * 1000)}M`;
  };

  // Build a hide-list from localized content so display=false is honored
  // even when stories are loaded from the API.
  const hiddenStoryTitles = new Set(
    (Array.isArray(storiesData) ? storiesData : [])
      .filter((s: any) => !isVisible(s?.display))
      .map((s: any) => normalizeKey(s?.title))
      .filter(Boolean)
  );
  const hiddenStorySignatures = new Set(
    (Array.isArray(storiesData) ? storiesData : [])
      .filter((s: any) => !isVisible(s?.display))
      .map((s: any) => `${normalizeKey(s?.category)}|${normalizeKey(s?.author)}`)
      .filter((key) => key !== "|")
  );

  // Derived filtered lists
  const activeStories = (!storiesLoaded || storiesLoadFailed)
    ? storiesData
        .filter((s: any) => isVisible(s?.display))
        .map((story: any, index: number) => ({
          ...story,
          image: normalizePeopleImage(story?.image, index),
        }))
    : apiStories
        .filter(
          (story) =>
            story.is_published !== 0 &&
            isVisible(story.display) &&
            !hiddenStoryTitles.has(normalizeKey(story.title)) &&
            !hiddenStorySignatures.has(`${normalizeKey(story.category)}|${normalizeKey(story.author)}`)
        )
        .map((story, index) => ({
          title: story.title,
          category: story.category,
          image: normalizePeopleImage(story.image, index),
          story: story.story,
          testimonial: story.testimonial,
          author: story.author,
          role: story.role,
          impact: { revenue: story.revenue, jobs: story.jobs, markets: story.markets },
        }));
  const activeMetrics = impactData.filter((m: any) => isVisible(m?.display));

  const introData = { icon: Trophy, title: t('impact.objective_title') || "Impact", description: t('impact.objective_subtitle') || "Showcasing the tangible impact of diaspora engagement across various sectors and communities in Zimbabwe." };

  return (
    <Layout>
      <SubPageHero heroSlides={heroSlides} intro={introData} />

      {/* IMPACT STORIES SECTION  - currently dissabled*/}
      {activeStories.length > 0 && (
        <section id="stories" className="p-5 bg-slate-950 relative overflow-hidden scroll-mt-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />
          <div className="container relative z-10 px-6 mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-xl font-black text-white tracking-tight">{t("impact.stories_title") || "Inspiring Impact"}</h2>
              <p className="text-sm  max-w-3xl mx-auto font-light leading-relaxed mt-4">{t("impact.stories_subtitle") || "Explore the impactful contributions of the Zimbabwean diaspora across various sectors."}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {activeStories.map((story, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 30 }} 
                  whileInView={{ opacity: 1, y: 0 }} 
                  viewport={{ once: true }} 
                  className="group relative flex flex-col h-full rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02]  shadow-2xl transition-all duration-500 hover:bg-slate-950/60 hover:-translate-y-2"
                >
                  <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none z-20" />
                  <div className="relative h-64 overflow-hidden">
                    <img src={story?.image} alt={story?.title} className="w-full h-full object-cover saturate-[0.8] group-hover:saturate-100 group-hover:scale-110 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <Badge className="absolute top-6 left-6 bg-zim-gold/10 text-zim-gold border-zim-gold/20 text-[9px] font-black uppercase tracking-widest px-3 py-1 backdrop-blur-xl">
                      {story?.category}
                    </Badge>
                  </div>
                  <div className="p-8 flex-grow space-y-6 relative">
                    <h3 className="text-xl font-black text-white tracking-tight group-hover:text-zim-gold transition-colors leading-tight">{story?.title}</h3>
                    <p className="text-[13px]  leading-relaxed font-light line-clamp-3">{story?.story}</p>
                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black  uppercase tracking-widest">Revenue</p>
                        <p className="text-sm font-black text-zim-gold">{story?.impact?.revenue}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black  uppercase tracking-widest">Jobs</p>
                        <p className="text-sm font-black text-white">{story?.impact?.jobs}</p>
                      </div>
                    </div>
                    <div className="relative p-6 rounded-2xl bg-white/5 border border-white/10">
                      <Quote className="absolute -top-3 -left-3 h-8 w-8" />
                      <p className="italic  text-xs leading-relaxed mb-4 font-light">"{story?.testimonial}"</p>
                      <p className="text-right text-[10px] font-black text-zim-gold uppercase tracking-widest mt-4">— {story?.author}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* IMPACT METRICS SECTION - currently disabled*/}
      {activeMetrics.length > 0 && (
        <section className="p-5 bg-slate-950 border-t border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-zim-gold/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="container relative z-10 px-6 mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-xl font-black text-white tracking-tight">{t("impact.metrics_title") || "Collective Impact"}</h2>
              <p className="text-sm  max-w-3xl mx-auto font-light leading-relaxed mt-4">{t("impact.metrics_subtitle") || "The aggregated impact of diaspora engagement across all featured impact stories."}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {activeMetrics.map((metric, index) => {
                const emoji = metric.emoji || IMPACT_METRIC_EMOJIS[index % IMPACT_METRIC_EMOJIS.length];
                return (
                  <motion.div 
                    key={index} 
                    whileHover={{ y: -5 }} 
                    className="outer-glass-panel relative p-10 rounded-[2rem] border border-white/10 bg-white/[0.02] text-center group overflow-hidden shadow-2xl"
                  >
                    <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none z-20" />
                    <div className="mx-auto h-20 w-20 p-4 bg-white/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-zim-gold/10 transition-colors">
                      <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{emoji}</span>
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tighter mb-2 tabular-nums">{metric.value}</h3>
                    <p className="text-[11px] font-black text-zim-gold uppercase tracking-[0.2em]">{metric.label}</p>
                    <p className="text-[12px]  font-light leading-relaxed pt-3">{metric.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section id="contact-cta" className="pt-5 p-10 bg-slate-950">
        <div className="container px-6 mx-auto">
          <div className="outer-glass-panel relative mx-auto p-12 md:p-24 rounded-[2rem] border border-white/10 bg-white/[0.02] text-center overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-zim-gold/10 blur-[120px] pointer-events-none" />
            <div className="relative z-10 space-y-10">
              <div className="mx-auto h-20 w-20 p-4 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-zim-gold/10 transition-colors">
                <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">🏅</span>
              </div>

              <div className="space-y-4 text-center">
                <h2 className="!text-lg md:!text-xl font-black text-white tracking-tight">{t("impact.cta_title") || "Partner with us"}</h2>
                <p className="text-sm  font-light max-w-3xl mx-auto leading-relaxed">{t("impact.cta_subtitle") || "We collaborate with diaspora leaders, institutions, and businesses to scale impact. Let's build together."}</p>
              </div>

              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full px-6">
                    {t("impact.cta_button") || "Start Partnership"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-0 bg-slate-950 border-white/10 overflow-hidden rounded-[2rem]">
                  <ContactForm title={t("impact.cta_title") || "Partner with us"} module="success" />
                </DialogContent>
              </Dialog>

              <div className="pt-8 flex flex-wrap justify-center gap-8">
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

      {/* Diaspora Economic Impact */}
      <section className="px-5 pt-12 pb-5 bg-slate-950 relative overflow-hidden">
        <div className="container px-6 mx-auto">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 md:p-8 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
              <h3 className="text-xl font-black text-white tracking-tight leading-tight">Diaspora Economic Impact</h3>
              <p className="text-sm  font-light leading-relaxed">
                Understanding the significant contribution of the Zimbabwean diaspora to the national economy.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="space-y-5 lg:col-span-7 lg:order-1">
                {remittanceImpact.map((item, index) => (
                  <div key={index} className="space-y-3 group">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                      <span className="flex items-center gap-3">
                        <span className="p-1.5 bg-white/5 rounded-lg group-hover:text-zim-gold transition-colors">{item.icon}</span> {item.sector}
                      </span>
                      <span className="text-white">{item.percentage} <span className=" ml-2 font-light">({item.amount})</span></span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: item.percentage }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "circOut" }}
                        className="bg-zim-gold h-full rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-5 lg:col-span-5 lg:order-2">
                {[
                  { label: "Annual Remittances", val: "$1.8B" },
                  { label: "Global Diaspora", val: "3.5M" },
                  { label: "Investment Potential", val: "$500M", span: true },
                ].map((stat, i) => (
                  <div key={i} className={`p-6 rounded-[2rem] border border-white/10 bg-white/[0.02] transition-all hover:bg-slate-950/60 ${stat.span ? "col-span-2 lg:col-span-1" : ""}`}>
                    <p className="text-base md:text-lg font-black text-zim-gold tracking-tighter mb-2">{stat.val}</p>
                    <p className="text-[10px] font-black  uppercase tracking-widest leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Diaspora Distribution */}
      <section className="pt-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container px-6 mx-auto">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 md:p-8 text-left">
            <div className="mb-7 text-center">
              <h3 className="text-xl font-black text-white tracking-tight">Global Diaspora Distribution</h3>
              <p className="mt-3 text-xs  font-light leading-relaxed">Zimbabwean diaspora residence worldwide</p>
              <p className="mt-2 max-w-3xl mx-auto text-[11px]  font-light leading-relaxed">
                This distribution highlights priority diaspora corridors for trade, remittance flows, and investment outreach planning across major host markets.
              </p>
            </div>

            <div className="relative overflow-x-auto rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl">
              <span className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="bg-white/5">
                    <th className="p-4 md:p-5 text-[9px] font-black  uppercase tracking-widest">Region/Country</th>
                    <th className="p-4 md:p-5 text-[9px] font-black  uppercase tracking-widest">Population</th>
                    <th className="p-4 md:p-5 text-right text-[9px] font-black  uppercase tracking-widest">Percentage</th>
                    <th className="p-4 md:p-5 text-right text-[9px] font-black  uppercase tracking-widest">Remittances 2024</th>
                    <th className="p-4 md:p-5 text-right text-[9px] font-black  uppercase tracking-widest">Remittances 2025</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {regionalBreakdown.map((item, index) => {
                    const share = percentageToShare(item.percentage);
                    return (
                      <motion.tr
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="transition-colors hover:bg-white/5 group cursor-default"
                      >
                        <td className="p-4 md:p-5 flex items-center gap-3">
                          <span className="text-base drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110 duration-500">{item.flag}</span>
                          <span className="text-xs md:text-sm font-bold  group-hover:text-zim-gold transition-colors">{item.region}</span>
                        </td>
                        <td className="p-4 md:p-5 text-[11px]  font-medium tracking-wide">{item.population}</td>
                        <td className="p-4 md:p-5 text-right text-sm font-black text-zim-gold tabular-nums tracking-tight">{item.percentage}</td>
                        <td className="p-4 md:p-5 text-right text-[11px] font-semibold  tabular-nums">{formatRemittanceByShare(share, remittance2024TotalBillions)}</td>
                        <td className="p-4 md:p-5 text-right text-[11px] font-black text-zim-gold tabular-nums">{formatRemittanceByShare(share, remittance2025TotalBillions)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
