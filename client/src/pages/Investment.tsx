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
import { Link } from "wouter";

type EconomicStatsResponse = {
  remittances: number;
  gdp: number;
  exportValue: number;
  growthRate: number;
  sectorData?: Array<{ name: string; growth: number }>;
};

export default function Investment() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [economicStats, setEconomicStats] = useState<EconomicStatsResponse>({
    remittances: 1500,
    gdp: 28000,
    exportValue: 4500,
    growthRate: 5.3,
    sectorData: [
      { name: "Mining", growth: 8.2 },
      { name: "Tourism", growth: 6.1 },
      { name: "Agriculture", growth: 4.5 },
      { name: "Manufacturing", growth: 3.2 },
    ],
  });
  const [economicLoading, setEconomicLoading] = useState(true);

  const heroSlides = useMemo(() => [
    {
      image: "/images/pages/investment/rbz_building.png",
      badge: t('investment.hero.badge1') || "RBZ Initiatives",
      badgeIcon: Shield, 
      title: t('investment.hero.title1') || "Diaspora Investment",
      titleHighlight: t('investment.hero.highlight1') || "National Growth",
      subtitle: t('investment.hero.subtitle1') || "Supporting national development through diaspora engagement.",
      buttons: [
        { text: t('investment.hero.rbz_policy') || "Explore policies", variant: "primary", link: "/regulations#investment-compliance" },
        { text: t('investment.hero.rbz_currency') || "Invest in USD or ZiG", variant: "outline", link: "/regulations#currency-settlement" }
      ]
    },
    {
      image: "/images/pages/investment/masuwe_sez.png",
      badge: t('investment.hero.badge2') || "Masuwe SEZ",
      badgeIcon: Globe,
      title: t('investment.hero.title2') || "Invest in Masuwe SEZ",
      titleHighlight: t('investment.hero.highlight2') || "Prime Location",
      subtitle: t('investment.hero.subtitle2') || "Strategic hospitality opportunities near Victoria Falls.",
      buttons: []
    },
    {
      image: "/images/pages/investment/vfex_logo.png",
      badge: t('investment.hero.badge3') || "VFEX",
      badgeIcon: Repeat,
      title: t('investment.hero.title3') || "Stock Exchange",
      titleHighlight: t('investment.hero.highlight3') || "Global Access",
      subtitle: t('investment.hero.subtitle3') || "Invest in offshore-listed African companies.",
      buttons: []
    },
    {
      image: "/images/pages/shared/horticulture.jpg",
      badge: t('investment.hero.badge4') || "Horticulture",
      badgeIcon: Leaf,
      title: t('investment.hero.title4') || "Green Gold",
      titleHighlight: t('investment.hero.highlight4') || "High ROI",
      subtitle: t('investment.hero.subtitle4') || "High-value fruit exports driving growth.",
      buttons: []
    },
    {
      image: "/images/pages/shared/minerals_mining.png",
      badge: t('investment.hero.badge5') || "Mining",
      badgeIcon: Gem,
      title: t('investment.hero.title5') || "Mineral Wealth",
      titleHighlight: t('investment.hero.highlight5') || "Strategic Assets",
      subtitle: t('investment.hero.subtitle5') || "Gold, Platinum, and Lithium opportunities.",
      buttons: []
    },
    {
      image: "/images/pages/trade/manufacturing_factory.jpg",
      badge: "Manufacturing Upside",
      badgeIcon: Building,
      title: "Value-Added Manufacturing",
      titleHighlight: "Export-Ready Capacity",
      subtitle: "Light manufacturing and processing projects create jobs and stronger regional competitiveness.",
      buttons: []
    },
    {
      image: "/images/pages/tourism/victoria_falls.jpg",
      badge: "Tourism Capital",
      badgeIcon: Target,
      title: "Hospitality Growth Corridors",
      titleHighlight: "Visitor Economy",
      subtitle: "Tourism-linked projects near major attractions can unlock recurring foreign-currency demand.",
      buttons: []
    },
    {
      image: "/images/pages/data/remittances_impact.png",
      badge: "Diaspora Flows",
      badgeIcon: DollarSign,
      title: "Channel Remittances to Assets",
      titleHighlight: "Structured Investment",
      subtitle: "Convert household remittance strength into pooled, trackable, and productive investment pathways.",
      buttons: []
    }
  ], [t]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentHeroIndex(p => (p + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const fetchEconomicStats = async () => {
      try {
        const response = await fetch("/api/economic-stats");
        if (!response.ok) throw new Error("Unable to fetch economic data.");
        const liveData: EconomicStatsResponse = await response.json();
        setEconomicStats((prev) => ({
          remittances: liveData.remittances ?? prev.remittances,
          gdp: liveData.gdp ?? prev.gdp,
          exportValue: liveData.exportValue ?? prev.exportValue,
          growthRate: liveData.growthRate ?? prev.growthRate,
          sectorData: liveData.sectorData?.length ? liveData.sectorData : prev.sectorData,
        }));
      } catch {
        // Keep defaults when API is unavailable.
      } finally {
        setEconomicLoading(false);
      }
    };

    fetchEconomicStats();
  }, []);

  const introData = {
    icon: TrendingUp,
    title: t('investment.objective_title') || "Diaspora Collective Investment Model",
    description: t('investment.objective_subtitle') || "Diaspora Unlocked combines technology, skills, and network access so small investors can pool capital and participate in verified Zimbabwe opportunities."
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

  const projectFilterFallbacks: Record<string, string> = {
    all: "All",
    tourism: "Tourism",
    agriculture: "Agriculture",
    manufacturing: "Manufacturing",
    it: "Technology",
    energy: "Energy",
    conservative: "Conservative",
    moderate: "Moderate",
    aggressive: "Aggressive",
  };

  const projectContentFallbacks: Record<
    string,
    { title: string; description: string; highlights: string[] }
  > = {
    masuwe: {
      title: "Masuwe Special Economic Zone",
      description:
        "Large-scale tourism and hospitality opportunity near Victoria Falls with long-term revenue potential.",
      highlights: ["Tourism Infrastructure", "SEZ Incentives", "Long-Term Horizon"],
    },
    leather: {
      title: "Leather Value-Addition Cluster",
      description:
        "Expand export-ready leather processing and finished goods production for regional and EU markets.",
      highlights: ["Export-Oriented", "SME Supplier Network", "Manufacturing Jobs"],
    },
    apparel: {
      title: "Apparel Manufacturing Scale-Up",
      description:
        "Increase local garment production capacity and improve quality compliance for international buyers.",
      highlights: ["Factory Expansion", "Brand Partnerships", "Regional Trade Access"],
    },
    horticulture: {
      title: "Horticulture Export Platform",
      description:
        "Invest in high-value crop production, cold-chain handling, and buyer-ready export operations.",
      highlights: ["Fresh Produce", "Cold Chain", "EU Market Potential"],
    },
    fintech: {
      title: "Diaspora Fintech Platform",
      description:
        "Build digital financial tools for payments, savings, and diaspora-linked investment coordination.",
      highlights: ["Digital Payments", "SME Services", "Scalable Model"],
    },
    solar: {
      title: "Solar Energy Development",
      description:
        "Support power-generation projects addressing supply gaps and improving industrial productivity.",
      highlights: ["Energy Access", "Independent Power", "Sustainable Returns"],
    },
  };

  const filtered = projects.filter(p => (activeFilter === "all" || p.sector === activeFilter) && (riskFilter === "all" || p.risk === riskFilter));
  const hdcAssocRaw = t('investment.hdc_associations', { returnObjects: true });
  const hdcAssoc = Array.isArray(hdcAssocRaw) && hdcAssocRaw.length > 0
    ? (hdcAssocRaw as string[])
    : ["Horticultural Development Council", "ZimTrade", "ZIMRA", "Export Growers", "Cold Chain Partners"];
  const regulatoryChecklistValue = t("investment.regulatory_snapshot.checklist", {
    returnObjects: true,
  });
  const regulatoryChecklist = Array.isArray(regulatoryChecklistValue)
    ? (regulatoryChecklistValue as string[])
    : [
        "Check if your target activity is reserved under Statutory Instrument 215 of 2025 before committing capital.",
        "If operating in a reserved sector, plan compliant local equity restructuring timelines and legal documentation.",
        "Apply for a ZIDA investment license through the DIY portal to secure statutory investment protections.",
        "Set up entity structure and appoint a local representative/proxy director for legal notices and operations.",
        "Register qualifying cross-border investments, royalties, and recurring technical fee agreements with RBZ.",
        "Model exchange-rate and settlement exposure across USD and ZiG under the multi-currency framework.",
        "For listed exposure, account for ZSE foreign shareholding limits and assess VFEX USD-based alternatives.",
        "In financial models, include applicable non-resident withholding taxes and export-incentive tax treatment.",
      ];
  const formatUsdMillions = (value: number) =>
    value >= 1000 ? `$${(value / 1000).toFixed(1)}B` : `$${value.toFixed(0)}M`;
  const topSectors = [...(economicStats.sectorData ?? [])]
    .sort((a, b) => b.growth - a.growth)
    .slice(0, 3);
  const snapshotCards = [
    {
      label: t("investment.economic_snapshot.gdp_growth") || "GDP Growth",
      value: `${economicStats.growthRate.toFixed(1)}%`,
      note: t("investment.economic_snapshot.latest_macro_signal") || "Latest macro signal",
      icon: TrendingUp,
    },
    {
      label: t("investment.economic_snapshot.diaspora_remittances") || "Diaspora Remittances",
      value: formatUsdMillions(economicStats.remittances),
      note: t("investment.economic_snapshot.annual_inflows") || "Annual inflows",
      icon: DollarSign,
    },
    {
      label: t("investment.economic_snapshot.total_exports") || "Total Exports",
      value: formatUsdMillions(economicStats.exportValue),
      note: t("investment.economic_snapshot.external_demand") || "External demand indicator",
      icon: Globe,
    },
    {
      label: t("investment.economic_snapshot.gdp_size") || "GDP Size",
      value: formatUsdMillions(economicStats.gdp),
      note: t("investment.economic_snapshot.economic_scale") || "Economic scale",
      icon: BarChart3,
    },
  ];
  const collectiveModelSteps = [
    t("investment.collective_model.s1") || "Create an investor profile and complete verification checks.",
    t("investment.collective_model.s2") || "Join vetted opportunities with clear minimum-ticket participation.",
    t("investment.collective_model.s3") || "Pool capital with other diaspora investors through structured terms.",
    t("investment.collective_model.s4") || "Track project updates, milestones, and performance on one dashboard.",
  ];
  const europeFocusAreas = [
    {
      title: t("investment.eu_focus.energy.title") || "Green Energy",
      detail:
        t("investment.eu_focus.energy.detail") ||
        "GET.invest Zimbabwe (launched in May 2025 with EU and Germany funding) supports clean-energy project finance, with strong focus on solar and diversifying hydro-dependent generation.",
    },
    {
      title: t("investment.eu_focus.agri.title") || "Agriculture and Value Chains",
      detail:
        t("investment.eu_focus.agri.detail") ||
        "EU partnership programmes prioritise horticulture and traditional grains, climate-smart agriculture, adaptation to EU export requirements, and finance access for agribusiness SMEs.",
    },
    {
      title: t("investment.eu_focus.sme.title") || "Private Sector and SME Finance",
      detail:
        t("investment.eu_focus.sme.detail") ||
        "EIB-backed lines through local banks expanded affordable finance for SMEs; reported EIB lending in recent years includes EUR 60 million, including EUR 20 million to Stanbic in March 2025.",
    },
    {
      title: t("investment.eu_focus.social.title") || "Health, Gender, and Social Programs",
      detail:
        t("investment.eu_focus.social.detail") ||
        "Team Europe programmes include gender equality and women empowerment actions, with practical support such as financial-literacy and access-to-finance pathways for women and youth.",
    },
    {
      title: t("investment.eu_focus.biodiversity.title") || "Biodiversity and Resilience",
      detail:
        t("investment.eu_focus.biodiversity.detail") ||
        "Partnerships also support biodiversity and conservation-linked resilience, including trans-frontier conservation areas relevant to sustainable local economic development.",
    },
    {
      title: t("investment.eu_focus.gateway.title") || "Global Gateway Partnership Envelope",
      detail:
        t("investment.eu_focus.gateway.detail") ||
        "EU-Zimbabwe cooperation under Global Gateway includes a EUR 165 million grant allocation for 2021-2027, with Team Europe partners including EIB and PROPARCO.",
    },
  ];
  const europePartners = [
    "Team Europe",
    "European Investment Bank (EIB Global)",
    "PROPARCO",
    "GIZ / EU Member State Agencies",
  ];
  const eibTakeaways = [
    t("investment.eu_focus.eib_t1") ||
      "Women-led small businesses often face affordability and collateral constraints that limit access to formal credit.",
    t("investment.eu_focus.eib_t2") ||
      "Blended finance and local-bank credit lines can lower borrowing barriers for agriculture-linked SMEs.",
    t("investment.eu_focus.eib_t3") ||
      "Financial literacy and enterprise support services improve investment readiness and loan performance for small businesses.",
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} intro={introData} />
      </section>

      {/* Investor Economic Snapshot */}
      <section id="economic-snapshot" className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-10 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              {t("investment.economic_snapshot.title") || "Investor Economic Snapshot"}
            </h2>
            <p className="text-sm md:text-base text-white/50 max-w-3xl mx-auto font-light leading-relaxed">
              {t("investment.economic_snapshot.subtitle") ||
                "Review growth momentum together with currency, tax, and compliance conditions before allocating capital."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {snapshotCards.map((card) => (
              <div key={card.label} className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6">
                <card.icon className="h-6 w-6 text-zim-gold mb-4" />
                <p className="text-[11px] uppercase tracking-widest text-white/50 font-black">{card.label}</p>
                <p className="text-3xl font-black text-white mt-2">{economicLoading ? "..." : card.value}</p>
                <p className="text-xs text-white/50 mt-2">{card.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 md:p-8">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight mb-4">
              {t("investment.economic_snapshot.top_growth_sectors") || "Top Growth Sectors"}
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {topSectors.map((sector) => (
                <div key={sector.name} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-white font-bold">{sector.name}</p>
                  <p className="text-zim-gold font-black text-lg mt-1">+{sector.growth.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Collective Model */}
      <section id="collective-model" className="pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-zim-gold" />
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
                {t("investment.collective_model.title") || "How Diaspora Collective Investing Works"}
              </h2>
            </div>
            <p className="text-white/65 text-sm md:text-base leading-relaxed mb-8 max-w-3xl">
              {t("investment.collective_model.subtitle") ||
                "Diaspora Unlocked is designed for pooled investing so small and medium investors can access opportunities that typically require larger ticket sizes."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collectiveModelSteps.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-white/80 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* European Investment Partnerships */}
      <section id="eu-partnerships" className="pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">
              {t("investment.eu_focus.title") || "European Partnership Capital in Zimbabwe"}
            </h2>
            <p className="text-sm md:text-base text-white/50 max-w-3xl mx-auto mt-4 font-light leading-relaxed">
              {t("investment.eu_focus.subtitle") ||
                "European institutions under Team Europe are active in Zimbabwe across energy, agriculture, SME finance, health, and digital infrastructure."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {europePartners.map((partner) => (
              <Badge key={partner} className="bg-white/5 text-white/70 border border-white/10 text-[10px] uppercase font-black tracking-wider px-3 py-1">
                {partner}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {europeFocusAreas.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
                <h3 className="text-white font-black mb-3">{item.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6">
            <h3 className="text-white font-black mb-4">
              {t("investment.eu_focus.eib_takeaways_title") || "EIB Practical Takeaways for Diaspora Investors"}
            </h3>
            <ul className="space-y-3">
              {eibTakeaways.map((point) => (
                <li key={point} className="flex items-start gap-3 text-white/75 text-sm">
                  <CheckCircle className="h-4 w-4 text-zim-gold mt-1 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <a href="https://www.get-invest.eu/about/country-windows/zimbabwe/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[10px] rounded-full">
                {t("investment.eu_focus.source_getinvest") || "Source: GET.invest Zimbabwe"}
              </Button>
            </a>
            <a href="https://international-partnerships.ec.europa.eu/countries/zimbabwe_en" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[10px] rounded-full">
                {t("investment.eu_focus.source_eu") || "Source: EU International Partnerships"}
              </Button>
            </a>
            <a href="https://www.eib.org/en/essays/agriculture-africa-affordable-finance-women-zimbabwe-small-business" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[10px] rounded-full">
                {t("investment.eu_focus.source_eib") || "Source: EIB Zimbabwe Essay"}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Active Projects - Cinematic Glass Grid */}
      <section id="active-projects" className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />

        <div className="container relative z-10 px-6 mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.sectors_title') || "Active Investment Opportunities"}</h2>
             <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.calculator_subtitle') || "Forecast returns using real market and project data"}</p>
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
                  {t(`investment.project_filters.${s}`) || projectFilterFallbacks[s] || s}
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
                        {(t(`investment.project_filters.${p.risk}`) || projectFilterFallbacks[p.risk] || p.risk)} {t('investment.project_card.risk') || "Risk Level"}
                      </Badge>
                      {p.ver && <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase font-black px-3 py-1 rounded-full flex items-center gap-1.5"><Award className="h-3 w-3" /> {t('investment.project_card.verified') || "Verified Asset"}</Badge>}
                    </div>
                    
                    <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-zim-gold transition-colors">
                      {t(`investment.projects.${p.id}.title`) || projectContentFallbacks[p.id]?.title || "Investment Opportunity"}
                    </h3>
                    <p className="text-sm text-white/50 font-light leading-relaxed line-clamp-2">
                      {t(`investment.projects.${p.id}.description`) || projectContentFallbacks[p.id]?.description || "Verified opportunity for diaspora investors."}
                    </p>
                    
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {((Array.isArray(t(`investment.projects.${p.id}.highlights`, { returnObjects: true }))
                        ? (t(`investment.projects.${p.id}.highlights`, { returnObjects: true }) as string[])
                        : projectContentFallbacks[p.id]?.highlights) || []).map((h, i) => (
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
                          <span>{t('investment.project_card.raised', { amount: p.raised }) || `Raised: ${p.raised}`}</span>
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
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{t('investment.project_filters.min_investment') || "Min. "}</p>
                          <p className="text-sm font-black text-white">{p.min}</p>
                        </div>
                        <div className="p-3 bg-zim-gold/5 rounded-xl border border-zim-gold/10">
                          <p className="text-[9px] font-black text-zim-gold/40 uppercase tracking-widest">{t('investment.project_filters.expected_return') || "Expected"}</p>
                          <p className="text-sm font-black text-zim-gold">{p.ret}</p>
                        </div>
                      </div>
                    </div>
                    
                    <Link href={`/investment/projects/${p.id}`}>
                      <Button className="w-full mt-4 bg-white text-slate-950 hover:bg-zim-gold hover:text-zim-black transition-all rounded-xl h-12 font-black text-[10px] uppercase tracking-widest shadow-xl">
                        {t('investment.project_card.view_details') || "View Details"}
                      </Button>
                    </Link>
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
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.crowdfunding_title') || "Crowdfunding Opportunities"}</h2>
           <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.crowdfunding_subtitle') || "Micro-investment in vetted projects with smaller amounts and see real impact."}</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { title: 'Browse Projects', emoji: '🧭' },
              { title: 'Invest Your Share', emoji: '💵' },
              { title: 'Track Performance', emoji: '📈' },
              { title: 'Receive Returns', emoji: '✅' }
            ].map((step, i) => (
              <div key={i} className="relative pt-10 group">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-zim-gold text-zim-black rounded-full flex items-center justify-center font-black z-20 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                  {i + 1}
                </div>
                <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center transition-all duration-500 hover:bg-white/[0.06] hover:-translate-y-2">
                  <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto mb-6 group-hover:bg-zim-gold/10 transition-colors">
                    <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{step.emoji}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-3 tracking-tight">{step.title}</h3>
                  <p className="text-white/40 text-[12px] leading-relaxed font-light">{t('investment.crowdfunding_subtitle') || "Micro-investment in vetted projects with smaller amounts and see real impact."}</p>
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
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.database_title') || "Trade & Investment Databases and Registries"}</h2>
             <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.database_subtitle') || "Databases and registry of verified trade and investment entities in Zimbabwe. Verification done by third-party entities."}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative p-10 rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zim-gold/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-5 mb-6">
                <div className="p-4 bg-zim-gold/10 rounded-2xl border border-zim-gold/20">
                  <span className="text-4xl drop-shadow-[0_0_12px_rgba(212,175,55,0.35)]">🗂️</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{t('investment.ntir_title') || "National Trade & Investment Register (NTIR)"}</h3>
                  <p className="text-xs text-zim-gold/60 font-black uppercase tracking-[0.2em]">National Directory</p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-8">{t('investment.ntir_subtitle') || "Official registry of verified trade and investment entities in Zimbabwe."}</p>
              <Link href="/ntir">
                <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white hover:text-zim-black font-black text-[11px] uppercase tracking-widest transition-all">
                  {t('investment.ntir_button') || "Search NTIR Database."}
                </Button>
              </Link>
            </div>

            <div className="relative p-10 rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zim-green/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-5 mb-6">
                <div className="p-4 bg-zim-green/10 rounded-2xl border border-zim-green/20">
                  <span className="text-4xl drop-shadow-[0_0_12px_rgba(34,197,94,0.35)]">🌱</span>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{t('investment.hdc_title') || "Horticultural Development Council"}</h3>
                  <p className="text-xs text-zim-green/60 font-black uppercase tracking-[0.2em]">Horticulture Council</p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-6">{t('investment.hdc_subtitle') || "Overseeing quality and standards for horticultural exports."}</p>
              <div className="flex flex-wrap gap-2">
                {hdcAssoc.slice(0, 5).map((a, i) => (
                  <Badge key={i} className="bg-white/5 text-white/60 border border-white/10 text-[9px] font-bold uppercase px-3 py-1 rounded-full">
                    {a}
                  </Badge>
                ))}
                {hdcAssoc.length > 5 && (
                  <Badge className="bg-white/5 text-white/40 border border-white/10 text-[9px] font-bold px-3 py-1 rounded-full">+{hdcAssoc.length - 5} more</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regulatory Snapshot */}
      <section className="py-10 bg-slate-950 relative overflow-hidden">
        <div className="container px-6 mx-auto">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 md:p-10">
            <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
              <div className="space-y-3 max-w-3xl">
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter">
                  {t("investment.regulatory_snapshot.title") || "Investment Regulation Snapshot"}
                </h2>
                <p className="text-white/60 text-sm md:text-base leading-relaxed">
                  {t("investment.regulatory_snapshot.subtitle") ||
                    "Before investing, verify ownership eligibility, licensing, exchange-control registration, and market-specific limits for foreign participation."}
                </p>
              </div>
              <Link href="/regulations#investment-compliance">
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("investment.regulatory_snapshot.open_full_guide") || "Open Full Guide"}
                </Button>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {regulatoryChecklist.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-white/75 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="pt-10 pb-24 bg-slate-950 relative overflow-hidden">
        <div className="container px-6 mx-auto relative z-10">
            <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">{t('investment.calculator_title') || "Smart Investment Calculator"}</h2>
             <p className="text-sm md:text-base text-white/50 max-w-2xl mx-auto font-light leading-relaxed">{t('investment.calculator_subtitle') || "Forecast returns using real market and project data"}</p>
          </div>
          <InvestmentCalculator />
        </div>
      </section>


    </Layout>
  );
}
