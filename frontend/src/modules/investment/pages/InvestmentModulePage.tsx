import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/ContactForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, Users, DollarSign, CheckCircle, Award, Brain, ArrowRight, Globe, Building, Leaf, Shield, Gem, Repeat, FileText, Target, Lightbulb, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";
import { Link } from "wouter";

export default function Investment() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
        { text: t('investment.hero.rbz_currency') || "Choose USD or ZiG Investment Paths", variant: "outline", link: "/regulations#currency-settlement" }
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
      badge: t("investment.hero.badge6") || "Manufacturing Upside",
      badgeIcon: Building,
      title: t("investment.hero.title6") || "Value-Added Manufacturing",
      titleHighlight: t("investment.hero.highlight6") || "Export-Ready Capacity",
      subtitle: t("investment.hero.subtitle6") || "Light manufacturing and processing projects create jobs and stronger regional competitiveness.",
      buttons: []
    },
    {
      image: "/images/pages/tourism/victoria_falls.jpg",
      badge: t("investment.hero.badge7") || "Tourism Capital",
      badgeIcon: Target,
      title: t("investment.hero.title7") || "Hospitality Growth Corridors",
      titleHighlight: t("investment.hero.highlight7") || "Visitor Economy",
      subtitle: t("investment.hero.subtitle7") || "Tourism-linked projects near major attractions can unlock recurring foreign-currency demand.",
      buttons: []
    },
    {
      image: "/images/pages/data/remittances_impact.png",
      badge: t("investment.hero.badge8") || "Diaspora Flows",
      badgeIcon: DollarSign,
      title: t("investment.hero.title8") || "Channel Remittances to Assets",
      titleHighlight: t("investment.hero.highlight8") || "Structured Investment",
      subtitle: t("investment.hero.subtitle8") || "Convert household remittance strength into pooled, trackable, and productive investment pathways.",
      buttons: []
    }
  ], [t]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentHeroIndex(p => (p + 1) % heroSlides.length), 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);


  const introData = {
    icon: TrendingUp,
    title: t('investment.objective_title') || "Diaspora Collective Investment Model",
    description: t('investment.objective_subtitle') || "Diaspora Unlocked combines technology, skills, and network access so small investors can pool capital and participate in verified Zimbabwe opportunities."
  };

const projects = [
  { 
    id: "masuwe", 
    owner: "Mosi Oa Tunya Development Company",
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
    owner: "Linkdef Soap Manufacturing (Pvt) Ltd",
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
    owner: "National Railways of Zimbabwe",
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
    owner: "Cicada Group",
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
    owner: "Powertel Communications (Pvt) Ltd",
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
    owner: "Solgas Energy Pvt Ltd",
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
  },

  {
    id: "beef_dairy",
    owner: "Agro Strong (Pvt) Ltd",
    sector: "agriculture",
    target: "$420k",
    raised: "$0",
    prog: 18,
    inv: 0,
    min: "$750",
    ret: "13-18%",
    time: "4-6y",
    risk: "moderate",
    ver: true
  },

  {
    id: "agro_park",
    owner: "Goromonzi Agro Industrial Company (GAIC)",
    sector: "agriculture",
    target: "$1.8M",
    raised: "$0",
    prog: 14,
    inv: 0,
    min: "$1,500",
    ret: "15-22%",
    time: "5-8y",
    risk: "moderate",
    ver: true
  },

  {
    id: "data_centres",
    owner: "TelOne (Pvt) Ltd",
    sector: "it",
    target: "$3.2M",
    raised: "$0",
    prog: 9,
    inv: 0,
    min: "$2,000",
    ret: "18-26%",
    time: "6-9y",
    risk: "aggressive",
    ver: true
  },

  {
    id: "vaccine",
    owner: "SIRDC",
    sector: "manufacturing",
    target: "$1.1M",
    raised: "$0",
    prog: 11,
    inv: 0,
    min: "$1,250",
    ret: "12-17%",
    time: "4-7y",
    risk: "moderate",
    ver: true
  },

  {
    id: "roof_tiles",
    owner: "Orangerose Investments",
    sector: "manufacturing",
    target: "$950k",
    raised: "$0",
    prog: 16,
    inv: 0,
    min: "$1,000",
    ret: "14-19%",
    time: "4-6y",
    risk: "moderate",
    ver: true
  },

  {
    id: "radco_solar",
    owner: "RADCO Holdings",
    sector: "energy",
    target: "$4.1M",
    raised: "$0",
    prog: 8,
    inv: 0,
    min: "$2,500",
    ret: "13-18%",
    time: "7-10y",
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
      title: "Masuwe SEZ Construction of Villas Project",
      description:
        "Tourism-linked hospitality infrastructure opportunity in the Victoria Falls growth corridor.",
      highlights: ["SEZ Corridor", "Hospitality Assets", "Tourism Demand"],
    },
    leather: {
      title: "Linkdef Soap Manufacturing Project",
      description:
        "State-of-the-art soap and detergent manufacturing facility aligned to Zimbabwe's industrialization strategy.",
      highlights: ["Import Substitution", "Consumer Goods", "Manufacturing Jobs"],
    },
    apparel: {
      title: "NRZ Concrete Manufacturing Plant Project",
      description:
        "Concrete sleeper manufacturing to support rail infrastructure renewal and domestic industrial supply.",
      highlights: ["Infrastructure Supply", "Industrial Demand", "Rail Modernization"],
    },
    horticulture: {
      title: "CICADA Macadamia and Avocado Plantation",
      description:
        "High-value agriculture and value-addition platform for avocado and macadamia export markets.",
      highlights: ["Export Agriculture", "Value Addition", "Regional Processing"],
    },
    fintech: {
      title: "Powertel Fibre Internet (GPON)",
      description:
        "Fibre broadband infrastructure rollout to improve national digital access and enterprise connectivity.",
      highlights: ["Broadband Expansion", "ICT Infrastructure", "Digital Inclusion"],
    },
    solar: {
      title: "Solgas Energy 60MW Solar PV Plant + BESS",
      description:
        "Utility-scale renewable energy project combining solar generation with battery storage capacity.",
      highlights: ["60MW Solar", "Battery Storage", "Grid Support"],
    },
    beef_dairy: {
      title: "Agro Strong Beef and Dairy Farming Venture",
      description:
        "Integrated livestock project designed to strengthen domestic protein supply and value-added dairy processing.",
      highlights: ["Livestock Scale-Up", "Dairy Value Addition", "Food Security"],
    },
    agro_park: {
      title: "Goromonzi Agro Processing Industrial Park (SEZ)",
      description:
        "Specialized agro-processing cluster targeting export-ready outputs, storage logistics, and value-chain efficiency.",
      highlights: ["Agro Processing", "SEZ Cluster", "Export Readiness"],
    },
    data_centres: {
      title: "TelOne Data Centres Project",
      description:
        "Enterprise-grade data centre capacity expansion for cloud workloads, hosting, and digital public infrastructure.",
      highlights: ["Data Hosting", "Cloud Capacity", "Digital Backbone"],
    },
    vaccine: {
      title: "Foot and Mouth Disease Vaccine Manufacturing Project",
      description:
        "Strategic pharmaceutical manufacturing initiative to localize vaccine production and reduce import dependence.",
      highlights: ["Biotech Production", "Import Substitution", "Veterinary Health"],
    },
    roof_tiles: {
      title: "Orangerose Solar Roof Tile Manufacturing Project",
      description:
        "Local clean-tech manufacturing project for solar roof tiles aligned to distributed energy adoption.",
      highlights: ["Solar Materials", "Local Manufacturing", "Clean Energy"],
    },
    radco_solar: {
      title: "RADCO Solar and Smart City Project",
      description:
        "Large-scale clean energy and smart infrastructure platform supporting sustainable urban and industrial growth.",
      highlights: ["Smart City", "Grid-Scale Solar", "Energy Transition"],
    },
  };

  const innovationOpportunityAreas = [
    {
      title: t("tech.opportunities.ai.title") || "Artificial Intelligence",
      driver:
        t("tech.opportunities.ai.driver") ||
        "Deployment momentum in mining, healthcare, and governance under the national AI strategy.",
    },
    {
      title: t("tech.opportunities.sme.title") || "SME Digitalization",
      driver:
        t("tech.opportunities.sme.driver") ||
        "High demand for affordable inventory tools, payroll automation, and customer support chat systems.",
    },
    {
      title: t("tech.opportunities.cybersecurity.title") || "Cybersecurity",
      driver:
        t("tech.opportunities.cybersecurity.driver") ||
        "Rapid digital adoption is increasing attack surfaces and demand for local security services and skills.",
    },
    {
      title: t("tech.opportunities.ecommerce.title") || "E-commerce & Logistics",
      driver:
        t("tech.opportunities.ecommerce.driver") ||
        "A major gap remains in reliable domestic logistics and last-mile delivery infrastructure.",
    },
  ];

  const innovationChallenges = [
    t("tech.challenges.infrastructure") ||
      "Infrastructure gaps: high internet costs and irregular power supply still constrain startup execution.",
    t("tech.challenges.human_capital") ||
      "Human capital pressure: strong technical talent exists, but retention is difficult due to outward migration.",
    t("tech.challenges.regulation") ||
      "Regulatory complexity: licensing, tax compliance, and approvals can delay product launch in regulated sectors.",
  ];

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
        "Apply for an investment license through the official DIY portal to secure statutory investment protections.",
        "Set up entity structure and appoint a local representative/proxy director for legal notices and operations.",
        "Register qualifying cross-border investments, royalties, and recurring technical fee agreements with RBZ.",
        "Model exchange-rate and settlement exposure across USD and ZiG under the multi-currency framework.",
        "For listed exposure, account for ZSE foreign shareholding limits and assess VFEX USD-based alternatives.",
        "In financial models, include applicable non-resident withholding taxes and export-incentive tax treatment.",
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
  const tourismSectorSnapshot = [
    {
      icon: TrendingUp,
      title: t("investment.tourism.snapshot.performance.title") || "Sector Recovery and Contribution",
      detail:
        t("investment.tourism.snapshot.performance.detail") ||
        "Tourism receipts continue to recover strongly, with the sector targeting multi-billion-dollar contribution and a growing share of national GDP.",
    },
    {
      icon: Globe,
      title: t("investment.tourism.snapshot.attractions.title") || "UNESCO and Wildlife Anchors",
      detail:
        t("investment.tourism.snapshot.attractions.detail") ||
        "Victoria Falls, Mana Pools, Great Zimbabwe, and flagship national parks remain the core demand drivers for international visitors.",
    },
    {
      icon: Building,
      title: t("investment.tourism.snapshot.infrastructure.title") || "Access and Infrastructure Upgrades",
      detail:
        t("investment.tourism.snapshot.infrastructure.detail") ||
        "Road and airport rehabilitation is improving access to key tourism corridors and regional destination circuits.",
    },
  ];
  const tourismGrowthOpportunities = [
    {
      title: t("investment.tourism.opportunities.ecotourism.title") || "Ecotourism and Sustainability",
      detail:
        t("investment.tourism.opportunities.ecotourism.detail") ||
        "Develop eco-lodges and low-impact conservation experiences around premium parks and protected areas.",
    },
    {
      title: t("investment.tourism.opportunities.cbt.title") || "Community-Based Tourism",
      detail:
        t("investment.tourism.opportunities.cbt.detail") ||
        "Scale projects that empower local communities through guided culture tours, performances, and locally owned experiences.",
    },
    {
      title: t("investment.tourism.opportunities.hospitality.title") || "Hospitality and Infrastructure",
      detail:
        t("investment.tourism.opportunities.hospitality.detail") ||
        "Expand quality accommodation and visitor facilities in Harare, Bulawayo, Mutare, and key gateway routes.",
    },
    {
      title: t("investment.tourism.opportunities.gastronomy.title") || "Gastronomy Tourism",
      detail:
        t("investment.tourism.opportunities.gastronomy.detail") ||
        "Build farm-to-table and local cuisine experiences connected to small-scale producers and culinary tourism demand.",
    },
    {
      title: t("investment.tourism.opportunities.adventure.title") || "Adventure Tourism",
      detail:
        t("investment.tourism.opportunities.adventure.detail") ||
        "Grow high-value activities such as rafting, bungee, canoeing, and wilderness expeditions around Victoria Falls and the Zambezi corridor.",
    },
    {
      title: t("investment.tourism.opportunities.regional.title") || "Regional Hub Packaging",
      detail:
        t("investment.tourism.opportunities.regional.detail") ||
        "Position Harare and Bulawayo as gateway hubs for multi-country itineraries including KAZA and cross-border circuits.",
    },
  ];
  const sectorInsights: Record<
    string,
    {
      snapshotTitle: string;
      snapshotSubtitle: string;
      snapshotCards: Array<{ icon: any; title: string; detail: string }>;
      opportunitiesTitle: string;
      opportunities: Array<{ title: string; detail: string }>;
    }
  > = {
    agriculture: {
      snapshotTitle: t("investment.agriculture.snapshot.title") || "Agriculture Snapshot (2026)",
      snapshotSubtitle:
        t("investment.agriculture.snapshot.subtitle") ||
        "Agriculture remains a core export growth pillar, supported by horticulture demand, irrigation upgrades, and value-chain financing.",
      snapshotCards: [
        {
          icon: Leaf,
          title: t("investment.agriculture.snapshot.horticulture.title") || "Horticulture Export Momentum",
          detail:
            t("investment.agriculture.snapshot.horticulture.detail") ||
            "Blueberries, citrus, and premium produce continue to attract regional and EU buyer interest, especially where quality standards are met.",
        },
        {
          icon: TrendingUp,
          title: t("investment.agriculture.snapshot.value_chain.title") || "Value-Chain Expansion",
          detail:
            t("investment.agriculture.snapshot.value_chain.detail") ||
            "Cold-chain, grading, and logistics investments are improving market access and reducing post-harvest losses.",
        },
        {
          icon: Shield,
          title: t("investment.agriculture.snapshot.compliance.title") || "Standards and Compliance Readiness",
          detail:
            t("investment.agriculture.snapshot.compliance.detail") ||
            "Export competitiveness increasingly depends on SPS controls, traceability, and certification pathways.",
        },
      ],
      opportunitiesTitle:
        t("investment.agriculture.opportunities.title") || "Agriculture Investment and Growth Opportunities",
      opportunities: [
        {
          title: t("investment.agriculture.opportunities.irrigation.title") || "Irrigation and Water Efficiency",
          detail:
            t("investment.agriculture.opportunities.irrigation.detail") ||
            "Scale climate-resilient irrigation, storage, and smart-farm systems for more stable yields.",
        },
        {
          title: t("investment.agriculture.opportunities.cold_chain.title") || "Cold Chain and Logistics",
          detail:
            t("investment.agriculture.opportunities.cold_chain.detail") ||
            "Invest in packhouses, refrigerated transport, and aggregation hubs to raise export quality and margins.",
        },
        {
          title: t("investment.agriculture.opportunities.processing.title") || "Agro-Processing",
          detail:
            t("investment.agriculture.opportunities.processing.detail") ||
            "Build local value addition for fruit, grains, and oils to increase retained earnings before export.",
        },
      ],
    },
    manufacturing: {
      snapshotTitle: t("investment.manufacturing.snapshot.title") || "Manufacturing Snapshot (2026)",
      snapshotSubtitle:
        t("investment.manufacturing.snapshot.subtitle") ||
        "Manufacturing is gaining traction through import substitution, regional trade demand, and value-added production.",
      snapshotCards: [
        {
          icon: Building,
          title: t("investment.manufacturing.snapshot.capacity.title") || "Industrial Capacity Rebuild",
          detail:
            t("investment.manufacturing.snapshot.capacity.detail") ||
            "Factory upgrades and SME supplier integration are improving domestic output and reliability.",
        },
        {
          icon: Globe,
          title: t("investment.manufacturing.snapshot.regional.title") || "Regional Market Access",
          detail:
            t("investment.manufacturing.snapshot.regional.detail") ||
            "SADC and COMESA linkages provide growing routes for manufactured exports and contract production.",
        },
        {
          icon: DollarSign,
          title: t("investment.manufacturing.snapshot.fx.title") || "Foreign-Currency Upside",
          detail:
            t("investment.manufacturing.snapshot.fx.detail") ||
            "Export-ready manufacturing can generate recurring FX flows where quality and delivery standards are consistent.",
        },
      ],
      opportunitiesTitle:
        t("investment.manufacturing.opportunities.title") || "Manufacturing Investment and Growth Opportunities",
      opportunities: [
        {
          title: t("investment.manufacturing.opportunities.textiles.title") || "Textiles and Apparel Scale-Up",
          detail:
            t("investment.manufacturing.opportunities.textiles.detail") ||
            "Expand garment and branded manufacturing with stronger quality-control and buyer-linked contracts.",
        },
        {
          title: t("investment.manufacturing.opportunities.leather.title") || "Leather and Finished Goods",
          detail:
            t("investment.manufacturing.opportunities.leather.detail") ||
            "Upgrade tanning and finishing to capture more value in footwear, accessories, and industrial products.",
        },
        {
          title: t("investment.manufacturing.opportunities.packaging.title") || "Packaging and Inputs",
          detail:
            t("investment.manufacturing.opportunities.packaging.detail") ||
            "Local packaging, components, and light engineering can reduce import dependence across sectors.",
        },
      ],
    },
    it: {
      snapshotTitle: t("investment.it.snapshot.title") || "IT & Fintech Snapshot (2026)",
      snapshotSubtitle:
        t("investment.it.snapshot.subtitle") ||
        "Digital adoption, mobile usage, and fintech demand continue to expand opportunities for scalable platforms and services.",
      snapshotCards: [
        {
          icon: Brain,
          title: t("investment.it.snapshot.adoption.title") || "Digital Adoption Growth",
          detail:
            t("investment.it.snapshot.adoption.detail") ||
            "SMEs and consumers increasingly rely on digital channels for payments, commerce, and service access.",
        },
        {
          icon: Repeat,
          title: t("investment.it.snapshot.payments.title") || "Payments and Remittance Rails",
          detail:
            t("investment.it.snapshot.payments.detail") ||
            "Cross-border remittance and digital payments infrastructure remains a strong fintech demand driver.",
        },
        {
          icon: Shield,
          title: t("investment.it.snapshot.regulatory.title") || "Regulatory Maturity",
          detail:
            t("investment.it.snapshot.regulatory.detail") ||
            "Compliance-first models aligned to licensing and AML controls can scale faster and sustain trust.",
        },
      ],
      opportunitiesTitle:
        t("investment.it.opportunities.title") || "IT & Fintech Investment and Growth Opportunities",
      opportunities: [
        {
          title: t("investment.it.opportunities.saas.title") || "SME SaaS and Workflow Tools",
          detail:
            t("investment.it.opportunities.saas.detail") ||
            "Build practical software products for inventory, trade documentation, and operations digitization.",
        },
        {
          title: t("investment.it.opportunities.payments.title") || "Embedded Payments and Wallets",
          detail:
            t("investment.it.opportunities.payments.detail") ||
            "Integrate compliant payment rails into commerce and marketplace products for diaspora and local users.",
        },
        {
          title: t("investment.it.opportunities.ai.title") || "Localized AI and Data Products",
          detail:
            t("investment.it.opportunities.ai.detail") ||
            "Develop local-context AI services for support, compliance guidance, and decision intelligence.",
        },
      ],
    },
    energy: {
      snapshotTitle: t("investment.energy.snapshot.title") || "Energy Snapshot (2026)",
      snapshotSubtitle:
        t("investment.energy.snapshot.subtitle") ||
        "Power reliability remains a strategic priority, creating strong demand for generation, storage, and distributed energy.",
      snapshotCards: [
        {
          icon: TrendingUp,
          title: t("investment.energy.snapshot.demand.title") || "Rising Power Demand",
          detail:
            t("investment.energy.snapshot.demand.detail") ||
            "Industrial and commercial growth continues to increase demand for stable, predictable electricity supply.",
        },
        {
          icon: Leaf,
          title: t("investment.energy.snapshot.renewables.title") || "Renewables Expansion",
          detail:
            t("investment.energy.snapshot.renewables.detail") ||
            "Solar and hybrid projects are expanding as viable options for both grid support and private offtake.",
        },
        {
          icon: FileText,
          title: t("investment.energy.snapshot.bankability.title") || "Project Bankability Focus",
          detail:
            t("investment.energy.snapshot.bankability.detail") ||
            "Clear offtake structures, permitting readiness, and grid integration planning are key to execution success.",
        },
      ],
      opportunitiesTitle: t("investment.energy.opportunities.title") || "Energy Investment and Growth Opportunities",
      opportunities: [
        {
          title: t("investment.energy.opportunities.solar.title") || "Solar Generation Projects",
          detail:
            t("investment.energy.opportunities.solar.detail") ||
            "Utility-scale and embedded solar assets can deliver stable medium-term cash flows with strong demand.",
        },
        {
          title: t("investment.energy.opportunities.storage.title") || "Battery Storage and Reliability",
          detail:
            t("investment.energy.opportunities.storage.detail") ||
            "Storage investments improve uptime, smooth intermittency, and support productive-use energy customers.",
        },
        {
          title: t("investment.energy.opportunities.mini_grids.title") || "Mini-Grids and Productive Use",
          detail:
            t("investment.energy.opportunities.mini_grids.detail") ||
            "Distributed systems can unlock economic activity in underserved zones with industrial and agri demand.",
        },
      ],
    },
  };
  const selectedSectorInfo = activeFilter !== "all" && activeFilter !== "tourism" ? sectorInsights[activeFilter] : null;
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
  const getProjectText = (projectId: string, field: "title" | "description", fallback: string) => {
    const key = `investment.projects.${projectId}.${field}`;
    const translated = t(key);
    if (typeof translated !== "string" || translated.trim().length === 0 || translated === key) {
      return fallback;
    }
    return translated;
  };

  return (
    <Layout>
      {/* Hero Section */}
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} intro={introData} />
      </section>

      {/* How it Works - Glass Dashboard */}
      <section className="p-5 bg-slate-950">
        <div className="container px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Repeat className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">{t('investment.crowdfunding_title') || "Crowdfunding Opportunities"}</h3>
              </div>
             <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">{t('investment.crowdfunding_subtitle') || "Micro-investment in vetted projects with smaller amounts and see real impact."}</p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { title: t("investment.crowdfunding_steps.browse") || "Browse Projects", emoji: "🧭" },
                { title: t("investment.crowdfunding_steps.invest") || "Invest Your Share", emoji: "💵" },
                { title: t("investment.crowdfunding_steps.track") || "Track Performance", emoji: "📈" },
                { title: t("investment.crowdfunding_steps.returns") || "Receive Returns", emoji: "✅" }
              ].map((step, i) => (
                <div key={i} className="relative pt-10 group">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-zim-gold text-zim-black rounded-full flex items-center justify-center font-black z-20 shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                    {i + 1}
                  </div>
                  <div className="outer-glass-panel h-full rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 text-center transition-all duration-500 hover:bg-slate-950/60 hover:-translate-y-2">
                    <div className="p-4 bg-white/5 rounded-2xl w-fit mx-auto mb-6 group-hover:bg-zim-gold/10 transition-colors">
                      <span className="text-4xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">{step.emoji}</span>
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight mb-3">{step.title}</h3>
                    <p className="text-white/40 text-[12px] leading-relaxed font-light">{t('investment.crowdfunding_subtitle') || "Micro-investment in vetted projects with smaller amounts and see real impact."}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Collective Model */}
      <section id="collective-model" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="flex items-center justify-center gap-3 mb-5">
              <Users className="h-6 w-6 text-zim-gold" />
              <h3 className="text-xl font-black text-white tracking-tight">
                {t("investment.collective_model.title") || "How Diaspora Collective Investing Works"}
              </h3>
            </div>
            <p className="text-white/75 text-sm leading-relaxed mb-8 max-w-3xl mx-auto">
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

      {/* Active Projects - Cinematic Glass Grid */}
      <section id="active-projects" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Target className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">{t('investment.sectors_title') || "Active Investment Opportunities"}</h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {t("investment.sectors_subtitle") || "Carefully vetted projects with government support and transparent tracking."}
              </p>
              <p className="text-xs text-white/55 max-w-3xl mx-auto font-light leading-relaxed mt-3">
                {t("investment.sectors_info", {
                  defaultValue:
                    "Explore structured opportunities across tourism, agriculture, manufacturing, digital infrastructure, and renewable energy. Each tile includes ownership context, minimum ticket size, expected return range, and risk profile.",
                })}
              </p>
              <div className="mt-8">
                <Link href="/investment/opportunities">
                  <Button
                    type="button"
                    className="rounded-full bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] px-7"
                  >
                    {t("investment.sectors_explore", { defaultValue: "Explore Opportunities" })}
                  </Button>
                </Link>
              </div>
            </div>

            {activeFilter === "tourism" && (
              <div className="mt-10 space-y-10">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
                  <div className="mb-10 text-center">
                    <h2 className="section-title-compact">
                      {t("investment.tourism.snapshot.title") || "Zimbabwe Tourism Snapshot (2026)"}
                    </h2>
                    <p className="text-sm text-white/75 max-w-3xl mx-auto mt-4 font-light leading-relaxed">
                      {t("investment.tourism.snapshot.subtitle") ||
                        "Tourism is on a strong recovery path, supported by iconic assets, growing demand, and continued infrastructure upgrades."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tourismSectorSnapshot.map((item) => (
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

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
                  <div className="mb-10 text-center">
                    <h2 className="section-title-compact">
                      {t("investment.tourism.opportunities.title") || "Tourism Investment and Growth Opportunities"}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tourismGrowthOpportunities.map((item) => (
                      <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                        <h3 className="text-lg font-black text-white tracking-tight mb-3">{item.title}</h3>
                        <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedSectorInfo && (
              <div className="mt-10 space-y-10">
                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
                  <div className="mb-10 text-center">
                    <h2 className="section-title-compact">{selectedSectorInfo.snapshotTitle}</h2>
                    <p className="text-sm text-white/75 max-w-3xl mx-auto mt-4 font-light leading-relaxed">
                      {selectedSectorInfo.snapshotSubtitle}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {selectedSectorInfo.snapshotCards.map((item) => (
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

                <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
                  <div className="mb-10 text-center">
                    <h2 className="section-title-compact">{selectedSectorInfo.opportunitiesTitle}</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedSectorInfo.opportunities.map((item) => (
                      <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                        <h3 className="text-lg font-black text-white tracking-tight mb-3">{item.title}</h3>
                        <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Directories - Dual Glass Panels */}
      <section className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
              <div className="mb-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <FileText className="h-6 w-6 text-zim-gold" />
              <h3 className="text-xl font-black text-white tracking-tight">{t('investment.database_title') || "Trade & Investment Databases and Registries"}</h3>
            </div>
             <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">{t('investment.database_subtitle') || "Databases and registry of verified trade and investment entities in Zimbabwe. Verification done by third-party entities."}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="outer-glass-panel relative p-7 rounded-[2rem] border border-white/10 bg-white/[0.02] overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zim-gold/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-4 mb-5">
                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-zim-gold/10 transition-colors">
                  <span className="text-3xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">🗂️</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{t('investment.ntir_title') || "National Trade & Investment Register (NTIR)"}</h3>
                  <p className="text-xs text-zim-gold/60 font-black uppercase tracking-[0.2em]">
                    {t("investment.ntir_label") || "National Directory"}
                  </p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-6">{t('investment.ntir_subtitle') || "Official registry of verified trade and investment entities in Zimbabwe."}</p>
              <Link href="/ntir">
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full px-6">
                  {t('investment.ntir_button') || "Search NTIR Database."}
                </Button>
              </Link>
            </div>

            <div className="outer-glass-panel relative p-7 rounded-[2rem] border border-white/10 bg-white/[0.02] overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-zim-green/5 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-4 mb-5">
                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-zim-gold/10 transition-colors">
                  <span className="text-3xl drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]">🌱</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">{t('investment.hdc_title') || "Horticultural Development Council"}</h3>
                  <p className="text-xs text-zim-green/60 font-black uppercase tracking-[0.2em]">
                    {t("investment.hdc_label") || "Horticulture Council"}
                  </p>
                </div>
              </div>
              <p className="text-white/50 text-sm font-light leading-relaxed mb-4">{t('investment.hdc_subtitle') || "Overseeing quality and standards for horticultural exports."}</p>
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
        </div>
      </section>

     {/* Innovation opportunities */}
      <section id="investment-innovation-opportunities" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="flex items-center justify-center gap-3 mb-5">
              <Lightbulb className="h-6 w-6 text-zim-gold" />
              <h3 className="text-xl font-black text-white tracking-tight">
                {t("tech.opportunities.title") || "Top Opportunities for Investment and Innovation"}
              </h3>
            </div>
            <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed text-center mb-8">
              {t("investment.opportunities.subtitle") ||
                "These priority areas can unlock stronger returns when paired with compliant execution, practical partnerships, and sector expertise."}
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                {innovationOpportunityAreas.map((item) => (
                  <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-zim-gold text-xs uppercase font-black tracking-widest mb-2">{item.title}</p>
                    <p className="text-white/75 text-sm leading-relaxed">{item.driver}</p>
                  </div>
                ))}
              </div>

              <div className="xl:col-span-5 rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h4 className="text-lg font-black text-white tracking-tight mb-4">
                  {t("tech.challenges.title") || "Critical Challenges to Address"}
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
                  {innovationChallenges.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-zim-gold mt-1 shrink-0" />
                      <span className="text-white/75 text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* European Investment Partnerships */}
      <section id="eu-partnerships" className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="mb-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-5">
                <Globe className="h-6 w-6 text-zim-gold" />
                <h3 className="text-xl font-black text-white tracking-tight">
                  {t("investment.eu_focus.title") || "European Partnership Capital in Zimbabwe"}
                </h3>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto mt-4 font-light leading-relaxed">
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
                <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
                  <h3 className="text-lg font-black text-white tracking-tight mb-3">{item.title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.02] p-7">
              <h4 className="text-lg font-black text-white tracking-tight mb-4">
                {t("investment.eu_focus.eib_takeaways_title") || "EIB Practical Takeaways for Diaspora Investors"}
              </h4>
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
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("investment.eu_focus.source_getinvest") || "Source: GET.invest Zimbabwe"}
                </Button>
              </a>
              <a href="https://international-partnerships.ec.europa.eu/countries/zimbabwe_en" target="_blank" rel="noopener noreferrer">
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("investment.eu_focus.source_eu") || "Source: EU International Partnerships"}
                </Button>
              </a>
              <a href="https://www.eib.org/en/essays/agriculture-africa-affordable-finance-women-zimbabwe-small-business" target="_blank" rel="noopener noreferrer">
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("investment.eu_focus.source_eib") || "Source: EIB Zimbabwe Essay"}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>


      {/* Regulatory Snapshot */}
      <section className="pt-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container px-6 mx-auto">
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            <div className="flex items-start justify-between gap-6 flex-col md:flex-row">
              <div className="space-y-3 max-w-3xl mx-auto">
                <h3 className="text-xl font-black text-white tracking-tight">
                  {t("investment.regulatory_snapshot.title") || "Investment Regulation Snapshot"}
                </h3>
                <p className="text-white/75 text-sm leading-relaxed">
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

    </Layout>
  );
}
