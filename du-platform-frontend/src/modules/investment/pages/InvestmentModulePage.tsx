import { useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  Globe,
  Building,
  Leaf,
  Shield,
  Gem,
  Repeat,
  FileText,
  Target,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";
import { Link } from "wouter";

export default function Investment() {
  const { t } = useTranslation();
  const crowdfundingSubtitle =
    t("investment.crowdfunding_subtitle") ||
    "Micro-investment in vetted projects with smaller amounts, transparent participation, and visible real-world impact.";
  const crowdfundingStepSubtitle =
    t("investment.crowdfunding_steps_subtitle") ||
    "Micro-investment in vetted projects with smaller amounts and see real impact.";

  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/investment/rbz_building.webp",
        badge: t("investment.hero.badge1") || "RBZ Initiatives",
        badgeIcon: Shield,
        title: t("investment.hero.title1") || "Diaspora Investment",
        titleHighlight: t("investment.hero.highlight1") || "National Growth",
        subtitle:
          t("investment.hero.subtitle1") ||
          "Supporting national development through diaspora engagement.",
      },
      {
        image: "/images/pages/investment/masuwe_sez.png",
        badge: t("investment.hero.badge2") || "Masuwe SEZ",
        badgeIcon: Globe,
        title: t("investment.hero.title2") || "Invest in Masuwe SEZ",
        titleHighlight: t("investment.hero.highlight2") || "Prime Location",
        subtitle:
          t("investment.hero.subtitle2") ||
          "Strategic hospitality opportunities near Victoria Falls.",
      },
      {
        image: "/images/pages/investment/vfex_logo.png",
        badge: t("investment.hero.badge3") || "VFEX",
        badgeIcon: Repeat,
        title: t("investment.hero.title3") || "Stock Exchange",
        titleHighlight: t("investment.hero.highlight3") || "Global Access",
        subtitle:
          t("investment.hero.subtitle3") ||
          "Invest in offshore-listed African companies.",
      },
      {
        image: "/images/pages/investment/horticulture.jpg",
        badge: t("investment.hero.badge4") || "Horticulture",
        badgeIcon: Leaf,
        title: t("investment.hero.title4") || "Green Gold",
        titleHighlight: t("investment.hero.highlight4") || "High ROI",
        subtitle:
          t("investment.hero.subtitle4") ||
          "High-value fruit exports driving growth.",
      },
      {
        image: "/images/pages/investment/minerals_mining.png",
        badge: t("investment.hero.badge5") || "Mining",
        badgeIcon: Gem,
        title: t("investment.hero.title5") || "Mineral Wealth",
        titleHighlight: t("investment.hero.highlight5") || "Strategic Assets",
        subtitle:
          t("investment.hero.subtitle5") ||
          "Gold, Platinum, and Lithium opportunities.",
      },
      {
        image: "/images/pages/shared/manufacturing_factory.jpg",
        badge: t("investment.hero.badge6") || "Manufacturing Upside",
        badgeIcon: Building,
        title: t("investment.hero.title6") || "Value-Added Manufacturing",
        titleHighlight:
          t("investment.hero.highlight6") || "Export-Ready Capacity",
        subtitle:
          t("investment.hero.subtitle6") ||
          "Light manufacturing and processing projects create jobs and stronger regional competitiveness.",
      },
      {
        image: "/images/pages/tourism/victoria_falls.webp",
        badge: t("investment.hero.badge7") || "Tourism Capital",
        badgeIcon: Target,
        title: t("investment.hero.title7") || "Hospitality Growth Corridors",
        titleHighlight: t("investment.hero.highlight7") || "Visitor Economy",
        subtitle:
          t("investment.hero.subtitle7") ||
          "Tourism-linked projects near major attractions can unlock recurring foreign-currency demand.",
      },
      {
        image: "/images/pages/investment/partnership_handshake.png",
        badge: t("investment.hero.badge8") || "Diaspora Flows",
        badgeIcon: DollarSign,
        title: t("investment.hero.title8") || "Build Lasting Assets",
        titleHighlight:
          t("investment.hero.highlight8") || "Structured Investment",
        subtitle:
          t("investment.hero.subtitle8") ||
          "Explore pooled, trackable, and productive investment opportunities.",
      },
    ],
    [t]
  );

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
      title:
        t("tech.opportunities.ecommerce.title") || "E-commerce & Logistics",
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

  const collectiveModelSteps = [
    t("investment.collective_model.s1") ||
      "Create an investor profile and complete verification checks.",
    t("investment.collective_model.s2") ||
      "Join vetted opportunities with clear minimum-ticket participation.",
    t("investment.collective_model.s3") ||
      "Pool capital with other diaspora investors through structured terms.",
    t("investment.collective_model.s4") ||
      "Track project updates, milestones, and performance on one dashboard.",
  ];
  const europeFocusAreas = [
    {
      title: t("investment.eu_focus.energy.title") || "Green Energy",
      detail:
        t("investment.eu_focus.energy.detail") ||
        "GET.invest Zimbabwe (launched in May 2025 with EU and Germany funding) supports clean-energy project finance, with strong focus on solar and diversifying hydro-dependent generation.",
    },
    {
      title:
        t("investment.eu_focus.agri.title") || "Agriculture and Value Chains",
      detail:
        t("investment.eu_focus.agri.detail") ||
        "EU partnership programmes prioritise horticulture and traditional grains, climate-smart agriculture, adaptation to EU export requirements, and finance access for agribusiness SMEs.",
    },
    {
      title:
        t("investment.eu_focus.sme.title") || "Private Sector and SME Finance",
      detail:
        t("investment.eu_focus.sme.detail") ||
        "EIB-backed lines through local banks expanded affordable finance for SMEs; reported EIB lending in recent years includes EUR 60 million, including EUR 20 million to Stanbic in March 2025.",
    },
    {
      title:
        t("investment.eu_focus.social.title") ||
        "Health, Gender, and Social Programs",
      detail:
        t("investment.eu_focus.social.detail") ||
        "Team Europe programmes include gender equality and women empowerment actions, with practical support such as financial-literacy and access-to-finance pathways for women and youth.",
    },
    {
      title:
        t("investment.eu_focus.biodiversity.title") ||
        "Biodiversity and Resilience",
      detail:
        t("investment.eu_focus.biodiversity.detail") ||
        "Partnerships also support biodiversity and conservation-linked resilience, including trans-frontier conservation areas relevant to sustainable local economic development.",
    },
    {
      title:
        t("investment.eu_focus.gateway.title") ||
        "Global Gateway Partnership Envelope",
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
        <SubPageHero heroSlides={heroSlides} />
      </section>

      {/* How it Works - Glass Dashboard */}
      <section className="editorial-section bg-slate-950">
        <div className="container px-6 mx-auto">
          <div className="content-panel editorial-panel text-white/80 p-8 md:p-10">
            <div className="section-heading mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Repeat className="h-6 w-6 text-zim-gold" />
                <h2 className="page-section-title">
                  {t("investment.crowdfunding_title") ||
                    "Crowdfunding Opportunities"}
                </h2>
              </div>
              <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                {crowdfundingSubtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title:
                    t("investment.crowdfunding_steps.browse") ||
                    "Browse Projects",
                  icon: FileText,
                },
                {
                  title:
                    t("investment.crowdfunding_steps.invest") ||
                    "Invest Your Share",
                  icon: DollarSign,
                },
                {
                  title:
                    t("investment.crowdfunding_steps.track") ||
                    "Track Performance",
                  icon: TrendingUp,
                },
                {
                  title:
                    t("investment.crowdfunding_steps.returns") ||
                    "Receive Returns",
                  icon: CheckCircle,
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="surface-card p-5 shadow-none transition-all duration-500 hover:bg-slate-950/60 hover:shadow-none group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <step.icon className="h-4 w-4 text-zim-gold" />
                    <h3 className="text-sm font-black tracking-tight text-white">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-white/70">
                    {crowdfundingStepSubtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Collective Model */}
      <section
        id="collective-model"
        className="editorial-section bg-slate-950 relative overflow-hidden"
      >
        <div className="container relative z-10 px-6 mx-auto">
          <div className="content-panel editorial-panel text-white/80 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-zim-gold" />
              <h2 className="page-section-title">
                {t("investment.collective_model.title") ||
                  "How Diaspora Collective Investing Works"}
              </h2>
            </div>
            <p className=" text-sm leading-relaxed mb-8 max-w-3xl mx-auto">
              {t("investment.collective_model.subtitle") ||
                "Diaspora Unlocked is designed for pooled investing so small and medium investors can access opportunities that typically require larger ticket sizes."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collectiveModelSteps.map(item => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-white/[0.02] text-white/80 p-4  text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Active Projects - Cinematic Glass Grid */}
      <section
        id="active-projects"
        className="editorial-section bg-slate-950 relative overflow-hidden"
      >
        <div className="container relative z-10 px-6 mx-auto">
          <div className="content-panel editorial-panel text-white/80 p-8 md:p-10">
            <div className="text-center">
              <div className="flex items-center gap-3 mb-4">
                <Target className="h-6 w-6 text-zim-gold" />
                <h2 className="page-section-title">
                  {t("investment.sectors_title") ||
                    "Active Investment Opportunities"}
                </h2>
              </div>
              <p className="text-sm  max-w-3xl mx-auto font-light leading-relaxed">
                {t("investment.sectors_subtitle") ||
                  "Carefully vetted projects with government support and transparent tracking."}
              </p>
              <p className="text-xs  max-w-3xl mx-auto font-light leading-relaxed mt-3">
                {t("investment.sectors_info", {
                  defaultValue:
                    "Explore structured opportunities across tourism, agriculture, manufacturing, digital infrastructure, and renewable energy. Each tile includes ownership context, minimum ticket size, expected return range, and risk profile.",
                })}
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  type="button"
                  className="rounded-full bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] px-7"
                >
                  <Link href="/investment/opportunities">
                    {t("investment.sectors_explore", {
                      defaultValue: "Explore Opportunities",
                    })}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Innovation opportunities */}
      <section
        id="investment-innovation-opportunities"
        className="editorial-section bg-slate-950 relative overflow-hidden"
      >
        <div className="container relative z-10 px-6 mx-auto">
          <div className="content-panel editorial-panel text-white/80 p-8 md:p-10">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="h-6 w-6 text-zim-gold" />
              <h2 className="page-section-title">
                {t("tech.opportunities.title") ||
                  "Top Opportunities for Investment and Innovation"}
              </h2>
            </div>
            <p className="text-sm  max-w-3xl mx-auto font-light leading-relaxed text-center mb-8">
              {t("investment.opportunities.subtitle") ||
                "These priority areas can unlock stronger returns when paired with compliant execution, practical partnerships, and sector expertise."}
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                {innovationOpportunityAreas.map(item => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/10 bg-white/[0.02] text-white/80 p-4"
                  >
                    <p className="text-zim-gold text-xs uppercase font-black tracking-widest mb-2">
                      {item.title}
                    </p>
                    <p className=" text-sm leading-relaxed">{item.driver}</p>
                  </div>
                ))}
              </div>

              <div className="xl:col-span-5 rounded-xl border border-white/10 bg-white/[0.02] text-white/80 p-5">
                <h4 className="text-lg font-black text-white tracking-tight mb-4">
                  {t("tech.challenges.title") ||
                    "Critical Challenges to Address"}
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
                  {innovationChallenges.map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-zim-gold mt-1 shrink-0" />
                      <span className=" text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* European Investment Partnerships */}
      <section
        id="eu-partnerships"
        className="editorial-section bg-slate-950 relative overflow-hidden"
      >
        <div className="container relative z-10 px-6 mx-auto">
          <div className="content-panel editorial-panel text-white/80 p-8 md:p-10">
            <div className="section-heading mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Globe className="h-6 w-6 text-zim-gold" />
                <h2 className="page-section-title">
                  {t("investment.eu_focus.title") ||
                    "European Partnership Capital in Zimbabwe"}
                </h2>
              </div>
              <p className="text-sm  max-w-3xl mx-auto mt-4 font-light leading-relaxed">
                {t("investment.eu_focus.subtitle") ||
                  "European institutions under Team Europe are active in Zimbabwe across energy, agriculture, SME finance, health, and digital infrastructure."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {europePartners.map(partner => (
                <Badge
                  key={partner}
                  className="bg-white/5  border border-white/10 text-[10px] uppercase font-black tracking-wider px-3 py-1"
                >
                  {partner}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {europeFocusAreas.map(item => (
                <div
                  key={item.title}
                  className="surface-card text-white/80 p-7"
                >
                  <h3 className="text-lg font-black text-white tracking-tight mb-3">
                    {item.title}
                  </h3>
                  <p className=" text-sm leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 surface-card text-white/80 p-7">
              <h4 className="text-lg font-black text-white tracking-tight mb-4">
                {t("investment.eu_focus.eib_takeaways_title") ||
                  "EIB Practical Takeaways for Diaspora Investors"}
              </h4>
              <ul className="space-y-3">
                {eibTakeaways.map(point => (
                  <li key={point} className="flex items-start gap-3  text-sm">
                    <CheckCircle className="h-4 w-4 text-zim-gold mt-1 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <a
                href="https://www.get-invest.eu/about/country-windows/zimbabwe/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("investment.eu_focus.source_getinvest") ||
                    "Source: GET.invest Zimbabwe"}
                </Button>
              </a>
              <a
                href="https://international-partnerships.ec.europa.eu/countries/zimbabwe_en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("investment.eu_focus.source_eu") ||
                    "Source: EU International Partnerships"}
                </Button>
              </a>
              <a
                href="https://www.eib.org/en/essays/agriculture-africa-affordable-finance-women-zimbabwe-small-business"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full">
                  {t("investment.eu_focus.source_eib") ||
                    "Source: EIB Zimbabwe Essay"}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
