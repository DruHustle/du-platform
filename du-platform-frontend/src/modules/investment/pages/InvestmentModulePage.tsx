import { useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import InstantImage from "@/components/InstantImage";
import {
  TrendingUp,
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

  const investmentSteps = [
    {
      title: t("investment.crowdfunding_steps.browse", {
        defaultValue: "Browse Projects",
      }),
      icon: FileText,
      image: "/images/pages/investment/masuwe_sez.png",
    },
    {
      title: t("investment.crowdfunding_steps.invest", {
        defaultValue: "Invest Your Share",
      }),
      icon: DollarSign,
      image: "/images/pages/investment/partnership_handshake.png",
    },
    {
      title: t("investment.crowdfunding_steps.track", {
        defaultValue: "Track Performance",
      }),
      icon: TrendingUp,
      image: "/images/pages/shared/manufacturing_factory.jpg",
    },
    {
      title: t("investment.crowdfunding_steps.returns", {
        defaultValue: "Receive Returns",
      }),
      icon: CheckCircle,
      image: "/images/pages/investment/horticulture.jpg",
    },
  ];
  return (
    <Layout>
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} />
      </section>
      <DiscoverySection
        title={t("investment.crowdfunding_title", {
          defaultValue: "Crowdfunding Opportunities",
        })}
        description={crowdfundingSubtitle}
      >
        <SwipeRail
          label={t("investment.crowdfunding_title", {
            defaultValue: "Crowdfunding Opportunities",
          })}
        >
          {investmentSteps.map(step => (
            <DiscoveryTile
              key={step.title}
              title={step.title}
              image={step.image}
              icon={step.icon}
            >
              <p>{crowdfundingStepSubtitle}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
      </DiscoverySection>
      <DiscoverySection
        id="collective-model"
        title={t("investment.collective_model.title", {
          defaultValue: "How Diaspora Collective Investing Works",
        })}
        description={t("investment.collective_model.subtitle", {
          defaultValue:
            "Diaspora Unlocked is designed for pooled investing so small and medium investors can access opportunities that typically require larger ticket sizes.",
        })}
      >
        <SwipeRail
          label={t("investment.collective_model.title", {
            defaultValue: "How Diaspora Collective Investing Works",
          })}
        >
          {collectiveModelSteps.map((item, index) => (
            <DiscoveryTile
              key={item}
              title={investmentSteps[index].title}
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
          defaultValue: "Active Investment Opportunities",
        })}
        description={t("investment.sectors_subtitle", {
          defaultValue:
            "Carefully vetted projects with government support and transparent tracking.",
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
                  "Explore structured opportunities across tourism, agriculture, manufacturing, digital infrastructure, and renewable energy. Each tile includes ownership context, minimum ticket size, expected return range, and risk profile.",
              })}
            </p>
            <Button
              asChild
              className="mt-6 bg-zim-gold text-slate-950 hover:bg-yellow-300"
            >
              <Link href="/investment/opportunities">
                {t("investment.sectors_explore", {
                  defaultValue: "Explore Opportunities",
                })}
              </Link>
            </Button>
          </div>
        </div>
      </DiscoverySection>
      <DiscoverySection
        id="investment-innovation-opportunities"
        title={t("tech.opportunities.title", {
          defaultValue: "Top Opportunities for Investment and Innovation",
        })}
        description={t("investment.opportunities.subtitle", {
          defaultValue:
            "These priority areas can unlock stronger returns when paired with compliant execution, practical partnerships, and sector expertise.",
        })}
      >
        <SwipeRail
          label={t("tech.opportunities.title", {
            defaultValue: "Top Opportunities for Investment and Innovation",
          })}
        >
          {innovationOpportunityAreas.map((item, index) => (
            <DiscoveryTile
              key={item.title}
              title={item.title}
              image={
                [
                  "/images/pages/technology/ai_innovation.webp",
                  "/images/pages/shared/manufacturing_factory.jpg",
                  "/images/pages/technology/digital-classroom.jpg",
                  "/images/pages/shared/export_port_01.jpg",
                ][index]
              }
            >
              <p>{item.driver}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
        <aside className="discovery-support-panel">
          <h3 className="text-lg font-semibold mb-4">
            {t("tech.challenges.title", {
              defaultValue: "Critical Challenges to Address",
            })}
          </h3>
          <ul className="space-y-3">
            {innovationChallenges.map(item => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-7"
              >
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </DiscoverySection>
      <DiscoverySection
        id="eu-partnerships"
        title={t("investment.eu_focus.title", {
          defaultValue: "European Partnership Capital in Zimbabwe",
        })}
        description={t("investment.eu_focus.subtitle", {
          defaultValue:
            "European institutions under Team Europe are active in Zimbabwe across energy, agriculture, SME finance, health, and digital infrastructure.",
        })}
      >
        <ul className="discovery-partners mb-6">
          {europePartners.map(partner => (
            <li key={partner}>{partner}</li>
          ))}
        </ul>
        <SwipeRail
          label={t("investment.eu_focus.title", {
            defaultValue: "European Partnership Capital in Zimbabwe",
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
      </DiscoverySection>
    </Layout>
  );
}
