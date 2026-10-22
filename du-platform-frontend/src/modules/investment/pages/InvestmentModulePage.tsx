import { useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import InstantImage from "@/components/InstantImage";
import {
  DollarSign,
  CheckCircle,
  Globe,
  Building,
  Leaf,
  Shield,
  Gem,
  Repeat,
  Target,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import SubPageHero from "@/components/SubPageHero";
import { Link } from "wouter";

export default function Investment() {
  const { t } = useTranslation();
  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/investment/rbz_building.webp",
        badge: t("investment.hero.badge1") || "Explore Zimbabwe",
        badgeIcon: Shield,
        title: t("investment.hero.title1") || "Understand the opportunities",
        titleHighlight: t("investment.hero.highlight1") || "in Zimbabwe",
        subtitle:
          t("investment.hero.subtitle1") ||
          "Read project profiles, compare sectors and prepare questions before taking an investment further.",
      },
      {
        image: "/images/pages/investment/masuwe_sez.png",
        badge: t("investment.hero.badge2") || "Masuwe SEZ",
        badgeIcon: Globe,
        title: t("investment.hero.title2") || "Explore the Masuwe project",
        titleHighlight: t("investment.hero.highlight2") || "Prime Location",
        subtitle:
          t("investment.hero.subtitle2") ||
          "Read about a tourism and hospitality project in the Victoria Falls area. Confirm current plans with the listed promoter.",
      },
      {
        image: "/images/pages/investment/vfex_logo.png",
        badge: t("investment.hero.badge3") || "VFEX",
        badgeIcon: Repeat,
        title: t("investment.hero.title3") || "Stock Exchange",
        titleHighlight: t("investment.hero.highlight3") || "Global Access",
        subtitle:
          t("investment.hero.subtitle3") ||
          "Explore Zimbabwe's capital-market landscape. Trading and account opening are handled by licensed providers.",
      },
      {
        image: "/images/pages/investment/horticulture.jpg",
        badge: t("investment.hero.badge4") || "Horticulture",
        badgeIcon: Leaf,
        title: t("investment.hero.title4") || "Horticulture projects",
        titleHighlight:
          t("investment.hero.highlight4") || "Agriculture & exports",
        subtitle:
          t("investment.hero.subtitle4") ||
          "Explore agriculture and processing profiles. Check market access, operating costs and project status with the promoter.",
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
          "Explore hospitality project information near Zimbabwe's visitor destinations.",
      },
      {
        image: "/images/pages/investment/partnership_handshake.png",
        badge: t("investment.hero.badge8") || "Diaspora Flows",
        badgeIcon: DollarSign,
        title: t("investment.hero.title8") || "Research your next step",
        titleHighlight:
          t("investment.hero.highlight8") || "Project information",
        subtitle:
          t("investment.hero.subtitle8") ||
          "Use these profiles as a starting point for research and direct enquiries. This site does not pool capital or process investments.",
      },
    ],
    [t]
  );

  const businessIdeas = [
    {
      key: "mining",
      icon: Gem,
      source: "https://www.chamines.co.zw/home/MiningAffairs",
    },
    {
      key: "farming",
      icon: Leaf,
      source:
        "https://tradezimbabwe.com/gokwe-chilli-farmers-target-export-markets/",
    },
    {
      key: "construction",
      icon: Building,
      source: "https://www.hararecity.co.zw/services/about/building-permits",
    },
  ];

  const collectiveModelSteps = [
    t("investment.collective_model.s1") ||
      "Browse sector profiles and read what each project describes.",
    t("investment.collective_model.s2") ||
      "Prepare questions about ownership, current status, costs and participation terms.",
    t("investment.collective_model.s3") ||
      "Request current documents from the promoter and check them with independent advisers.",
    t("investment.collective_model.s4") ||
      "Agree any investment directly through the appropriate legal and financial channels, outside this site.",
  ];
  const europeFocusAreas = [
    {
      title: t("investment.eu_focus.energy.title") || "Green Energy",
      detail:
        t("investment.eu_focus.energy.detail") ||
        "GET.invest Zimbabwe launched in May 2025 with EU and German funding to support clean-energy finance. Check the programme's current eligibility criteria at the source below.",
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
        "EIB report, 2 October 2025: €60 million lent to Zimbabwean banks over five years, including €20 million to Stanbic in March 2025. These are external bank programmes.",
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
        "The European Commission lists €165 million in grants for its Zimbabwe partnership for 2021–2027. This is a cooperation allocation, not money raised through Diaspora Unlocked.",
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

  const collectiveStepTitles = [
    t("investment.crowdfunding_steps.browse", {
      defaultValue: "Read profiles",
    }),
    t("investment.crowdfunding_steps.invest", {
      defaultValue: "Prepare questions",
    }),
    t("investment.crowdfunding_steps.track", {
      defaultValue: "Check documents",
    }),
    t("investment.crowdfunding_steps.returns", {
      defaultValue: "Decide independently",
    }),
  ];
  return (
    <Layout>
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} />
      </section>
      <DiscoverySection
        id="collective-model"
        title={t("investment.collective_model.title", {
          defaultValue: "How to explore an opportunity",
        })}
        description={t("investment.collective_model.subtitle", {
          defaultValue:
            "Start with information, then check the documents and terms independently before making any commitment.",
        })}
      >
        <SwipeRail
          label={t("investment.collective_model.title", {
            defaultValue: "How to explore an opportunity",
          })}
        >
          {collectiveModelSteps.map((item, index) => (
            <DiscoveryTile
              key={item}
              title={collectiveStepTitles[index]}
              number={index + 1}
            >
              <p>{item}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
      </DiscoverySection>
      <DiscoverySection
        id="active-projects"
        title={t("investment.sectors_title", {
          defaultValue: "Explore project profiles",
        })}
        description={t("investment.sectors_subtitle", {
          defaultValue:
            "Browse sector ideas and listed promoters. Current availability, financial terms and approvals require independent confirmation.",
        })}
      >
        <div className="discovery-callout">
          <InstantImage
            src="/images/pages/investment/rbz_building.webp"
            alt=""
            draggable={false}
            loading="lazy"
            wrapperClassName="discovery-callout-image bg-slate-900"
            className="h-full w-full object-cover"
          />
          <div className="discovery-callout-content">
            <p>
              {t("investment.sectors_info", {
                defaultValue:
                  "Read project descriptions and identify questions for the listed promoter. These profiles do not confirm an offer to invest, project availability or financial performance.",
              })}
            </p>
            <Button
              asChild
              className="mt-6 bg-zim-gold text-slate-950 hover:bg-yellow-300"
            >
              <Link href="/investment/opportunities">
                {t("investment.sectors_explore", {
                  defaultValue: "Browse project profiles",
                })}
              </Link>
            </Button>
          </div>
        </div>
      </DiscoverySection>
      <DiscoverySection
        id="investment-innovation-opportunities"
        title={t("investment.opportunities.title")}
        description={t("investment.opportunities.subtitle")}
      >
        <SwipeRail label={t("investment.opportunities.title")}>
          {businessIdeas.map(item => (
            <DiscoveryTile
              key={item.key}
              title={t(`investment.opportunities.${item.key}.title`)}
              icon={item.icon}
              footer={
                <a
                  href={item.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-zim-gold underline underline-offset-4 hover:text-yellow-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zim-gold"
                >
                  {t(`investment.opportunities.${item.key}.source`)}
                </a>
              }
            >
              <p>{t(`investment.opportunities.${item.key}.summary`)}</p>
              <dl className="business-idea-details">
                {(["start", "budget", "checks"] as const).map(field => (
                  <div key={field}>
                    <dt>{t(`investment.opportunities.labels.${field}`)}</dt>
                    <dd>
                      {t(`investment.opportunities.${item.key}.${field}`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </DiscoveryTile>
          ))}
        </SwipeRail>
        <aside className="discovery-support-panel">
          <h3 className="text-lg font-semibold mb-4">
            {t("investment.opportunities.plan.title")}
          </h3>
          <p className="mb-5 text-sm leading-7">
            {t("investment.opportunities.plan.intro")}
          </p>
          <ul className="space-y-3">
            {["budget", "people", "agreement", "oversight"].map(item => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-7"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-1 h-4 w-4 shrink-0 text-amber-700"
                />
                <span>{t(`investment.opportunities.plan.${item}`)}</span>
              </li>
            ))}
          </ul>
          <Button
            asChild
            className="mt-6 h-auto min-h-11 whitespace-normal bg-zim-gold text-slate-950 hover:bg-yellow-300"
          >
            <Link href="/regulations#due-diligence-checklist">
              {t("investment.opportunities.plan.cta")}
            </Link>
          </Button>
          <p className="mt-5 text-sm leading-7">
            {t("investment.opportunities.plan.note")}
          </p>
        </aside>
      </DiscoverySection>
      <DiscoverySection
        id="eu-partnerships"
        title={t("investment.eu_focus.title", {
          defaultValue: "External programmes to research",
        })}
        description={t("investment.eu_focus.subtitle", {
          defaultValue:
            "European programmes provide useful context for Zimbabwe's economy. Sources checked on 21 October 2026; they do not establish funding or endorsement for projects listed here.",
        })}
      >
        <ul className="discovery-partners mb-6">
          {europePartners.map(partner => (
            <li key={partner}>{partner}</li>
          ))}
        </ul>
        <SwipeRail
          label={t("investment.eu_focus.title", {
            defaultValue: "External programmes to research",
          })}
        >
          {europeFocusAreas.map((item, index) => (
            <DiscoveryTile
              key={item.title}
              title={item.title}
              icon={[Leaf, Building, DollarSign, Shield, Globe, Gem][index]}
            >
              <p>{item.detail}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
        <aside className="discovery-support-panel">
          <h3 className="text-lg font-semibold mb-4">
            {t("investment.eu_focus.eib_takeaways_title", {
              defaultValue: "EIB Practical Takeaways for Diaspora Investors",
            })}
          </h3>
          <ul className="space-y-3">
            {eibTakeaways.map(point => (
              <li
                key={point}
                className="flex items-start gap-3 text-sm leading-7"
              >
                <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </aside>
        <div className="mt-8 flex flex-wrap gap-3 ">
          <a
            href="https://www.get-invest.eu/about/country-windows/zimbabwe/"
            className="max-w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full h-auto min-h-9 max-w-full whitespace-normal py-2 leading-5">
              {t("investment.eu_focus.source_getinvest") ||
                "GET.invest Zimbabwe · checked 21 Oct 2026"}
            </Button>
          </a>
          <a
            href="https://international-partnerships.ec.europa.eu/countries/zimbabwe_en"
            className="max-w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full h-auto min-h-9 max-w-full whitespace-normal py-2 leading-5">
              {t("investment.eu_focus.source_eu") ||
                "European Commission · checked 21 Oct 2026"}
            </Button>
          </a>
          <a
            href="https://www.eib.org/en/essays/agriculture-africa-affordable-finance-women-zimbabwe-small-business"
            className="max-w-full"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full h-auto min-h-9 max-w-full whitespace-normal py-2 leading-5">
              {t("investment.eu_focus.source_eib") || "EIB report · 2 Oct 2025"}
            </Button>
          </a>
        </div>
      </DiscoverySection>
    </Layout>
  );
}
