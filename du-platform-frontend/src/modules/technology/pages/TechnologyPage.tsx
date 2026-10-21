import { useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Globe,
  Shield,
  TrendingUp,
  Lightbulb,
  Network,
  BarChart3,
  Building2,
  MapPin,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import SubPageHero from "@/components/SubPageHero";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";

export default function Technology() {
  const { t } = useTranslation();

  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/technology/ai_innovation.webp",
        badge: t("tech.hero.badge1") || "Powered by Onesa",
        badgeIcon: Brain,
        title: t("tech.hero.title1") || "AI help, with Zimbabwe in focus",
        subtitle:
          t("tech.hero.subtitle1") ||
          "Onesa powers practical assistance on Diaspora Unlocked: ask questions, explore products and plan your next steps.",
        highlight: t("tech.hero.highlight1") || "Ask, explore, plan",
      },
      {
        image: "/images/pages/technology/partnership_handshake.png",
        badge: t("tech.hero.badge2") || "Contextual Intelligence",
        badgeIcon: Lightbulb,
        title:
          t("tech.hero.title2") || "Local questions, clearer starting points",
        subtitle:
          t("tech.hero.subtitle2") ||
          "Zimbabwe-focused content helps shape answers. Check important details with the relevant provider or official source.",
        highlight: t("tech.hero.highlight2") || "Localized Knowledge",
      },
      {
        image: "/images/pages/technology/zim_tech_map.jpg",
        badge: t("tech.hero.badge3") || "Explore ideas",
        badgeIcon: Globe,
        title:
          t("tech.hero.title3") || "Better questions for business research",
        subtitle:
          t("tech.hero.subtitle3") ||
          "Use Onesa to explain unfamiliar terms and prepare questions about a project. It does not verify returns or assess investment suitability.",
        highlight: t("tech.hero.highlight3") || "Research with context",
      },
      {
        image: "/images/pages/technology/zim_tech_map.jpg",
        badge: t("tech.hero.badge4") || "Education 5.0",
        badgeIcon: TrendingUp,
        title: t("tech.hero.title4") || "Innovation in Classrooms",
        subtitle:
          t("tech.hero.subtitle4") ||
          "Explore ideas for learning and digital skills. These are sector themes, not a classroom service offered here.",
        highlight: t("tech.hero.highlight4") || "Future Skills",
      },
      {
        image: "/images/pages/shared/export_port_01.jpg",
        badge: t("tech.hero.badge5") || "Smart Logistics",
        badgeIcon: Network,
        title: t("tech.hero.title5") || "Technology for Logistics",
        subtitle:
          t("tech.hero.subtitle5") ||
          "Explore questions about distribution and cross-border trade. Shipment tracking and customs clearance are not provided here.",
        highlight: t("tech.hero.highlight5") || "Connected Supply Chains",
      },
      {
        image: "/images/pages/technology/minerals_mining.png",
        badge: t("tech.hero.badge6") || "Industrial AI",
        badgeIcon: BarChart3,
        title: t("tech.hero.title6") || "Tech in Mining Operations",
        subtitle:
          t("tech.hero.subtitle6") ||
          "Explore how data could support mining operations. Specialist monitoring and geological analysis are not available on this site.",
        highlight: t("tech.hero.highlight6") || "Operational Efficiency",
      },
      {
        image: "/images/pages/technology/horticulture.jpg",
        badge: t("tech.hero.badge7") || "Agritech Growth",
        badgeIcon: MapPin,
        title: t("tech.hero.title7") || "Smarter Farming Systems",
        subtitle:
          t("tech.hero.subtitle7") ||
          "Explore digital agriculture ideas. This site does not provide crop monitoring, soil tests or live weather alerts.",
        highlight: t("tech.hero.highlight7") || "Climate-Smart Agriculture",
      },
      {
        image: "/images/pages/technology/partnership_handshake.png",
        badge: t("tech.hero.badge8") || "Diaspora Builders",
        badgeIcon: Building2,
        title: t("tech.hero.title8") || "Tech Talent Across Borders",
        subtitle:
          t("tech.hero.subtitle8") ||
          "Use your experience abroad to explore ideas for Zimbabwe. Start with project information and practical questions.",
        highlight: t("tech.hero.highlight8") || "Global Collaboration",
      },
    ],
    [t]
  );

  const sectors = [
    {
      title: t("tech.sectors.mining.title") || "Mining & Resources",
      image: "/images/pages/technology/minerals_mining.png",
      description:
        t("tech.sectors.mining.desc") ||
        "Questions to explore about data use in mining, with specialist advice before operational decisions.",
      details: [
        t("tech.sectors.mining.d1") ||
          "Research mineral-market information sources",
        t("tech.sectors.mining.d2") ||
          "Prepare questions about safety and environmental requirements",
      ],
    },
    {
      title: t("tech.sectors.farming.title") || "Precision Farming",
      image: "/images/pages/technology/horticulture.jpg",
      description:
        t("tech.sectors.farming.desc") ||
        "Explore questions about agricultural planning and the information a grower needs.",
      details: [
        t("tech.sectors.farming.d1") ||
          "Understand crop-planning terms and considerations",
        t("tech.sectors.farming.d2") ||
          "Identify questions for local agronomists",
      ],
    },
    {
      title: t("tech.sectors.logistics.title") || "Smart Logistics",
      image: "/images/pages/shared/export_port_01.jpg",
      description:
        t("tech.sectors.logistics.desc") ||
        "Research delivery routes and the practical steps involved in moving goods.",
      details: [
        t("tech.sectors.logistics.d1") ||
          "Prepare questions about routes and lead times",
        t("tech.sectors.logistics.d2") ||
          "Check customs requirements with the relevant authority",
      ],
    },
    {
      title: t("tech.sectors.education.title") || "Future Education",
      image: "/images/pages/technology/digital-classroom.jpg",
      description:
        t("tech.sectors.education.desc") ||
        "Use AI explanations to explore a subject or plan further learning.",
      details: [
        t("tech.sectors.education.d1") ||
          "Ask for an explanation of unfamiliar concepts",
        t("tech.sectors.education.d2") ||
          "Find questions and topics for further study",
      ],
    },
  ];

  const diasporaUseCases = [
    {
      icon: Globe,
      title:
        t("tech.diaspora_use_cases.relocation.title") || "Find your bearings",
      detail:
        t("tech.diaspora_use_cases.relocation.detail") ||
        "Ask about places, local customs and practical questions to research before a visit or return.",
    },
    {
      icon: TrendingUp,
      title:
        t("tech.diaspora_use_cases.investment.title") ||
        "Understand project information",
      detail:
        t("tech.diaspora_use_cases.investment.detail") ||
        "Ask for plain-language explanations of sector terms and questions to take to a promoter or independent adviser.",
    },
    {
      icon: BarChart3,
      title:
        t("tech.diaspora_use_cases.business_intelligence.title") ||
        "Explore products and ideas",
      detail:
        t("tech.diaspora_use_cases.business_intelligence.detail") ||
        "Use Onesa to explore product information and organise questions before sending an enquiry.",
    },
    {
      icon: Network,
      title: t("tech.diaspora_use_cases.collaboration.title") || "Plan a visit",
      detail:
        t("tech.diaspora_use_cases.collaboration.detail") ||
        "Discuss destinations and interests, then turn them into a draft itinerary with indicative budgets.",
    },
  ];

  const onesaVisionTiles = [
    {
      icon: Lightbulb,
      title:
        t("tech.onesa_matter.tiles.illuminate.title") ||
        "One platform, many applications",
      detail:
        t("tech.onesa_matter.tiles.illuminate.detail") ||
        "Onesa is a modular AI platform for European and international applications. Diaspora Unlocked is one of them.",
    },
    {
      icon: Globe,
      title:
        t("tech.onesa_matter.tiles.africa_centric.title") ||
        "Zimbabwe-focused help",
      detail:
        t("tech.onesa_matter.tiles.africa_centric.detail") ||
        "This application adds Zimbabwean content, language support and local context to help you ask more relevant questions.",
    },
    {
      icon: Shield,
      title:
        t("tech.onesa_matter.tiles.sovereignty.title") ||
        "Practical next steps",
      detail:
        t("tech.onesa_matter.tiles.sovereignty.detail") ||
        "Get explanations, explore products and draft travel ideas. Use the answers as a starting point for your own checks.",
    },
    {
      icon: TrendingUp,
      title:
        t("tech.onesa_matter.tiles.growth.title") || "Built to develop further",
      detail:
        t("tech.onesa_matter.tiles.growth.detail") ||
        "The aim is to make assistance more useful over time. Industry examples below show areas to explore, not specialist services already available here.",
    },
  ];

  return (
    <Layout>
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} />
      </section>
      <DiscoverySection
        id="onesa-intro"
        title={t("tech.onesa_matter.title", {
          defaultValue: "Onesa powers the assistance here",
        })}
        description={t("tech.onesa_matter.headline", {
          defaultValue:
            "A general-purpose AI platform, applied to your Zimbabwe questions.",
        })}
        action={
          <Button
            asChild
            className="bg-zim-gold text-slate-950 hover:bg-yellow-300"
          >
            <Link href="/onesa-ai-chat">
              {t("tech.chat_with_onesa", { defaultValue: "Chat with Onesa" })}
            </Link>
          </Button>
        }
      >
        <SwipeRail
          label={t("tech.onesa_matter.title", {
            defaultValue: "Onesa powers the assistance here",
          })}
        >
          {onesaVisionTiles.map((tile, index) => (
            <DiscoveryTile
              key={tile.title}
              title={tile.title}
              icon={tile.icon}
              image={
                [
                  "/images/pages/technology/ai_innovation.webp",
                  "/images/pages/shared/export_port_01.jpg",
                  "/images/pages/home/partnership_handshake.png",
                  "/images/pages/shared/manufacturing_factory.jpg",
                ][index]
              }
            >
              <p>{tile.detail}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
        <div id="technology-onesa-vision" className="discovery-introduction">
          <details className="editorial-details">
            <summary>
              {t("tech.onesa_matter.read_vision", {
                defaultValue: "How Onesa and Diaspora Unlocked fit together",
              })}
            </summary>
            <div className="mt-5 space-y-5">
              <p className="text-white/75 text-sm leading-relaxed mb-4">
                {t("tech.onesa_matter.p1") ||
                  "Onesa is a modular, general-purpose AI platform for European and international applications."}{" "}
                {t("tech.onesa_matter.p2") ||
                  "Diaspora Unlocked is one application powered by Onesa. It brings Zimbabwe-focused content and workflows into the conversations and planning tools on this site."}
              </p>
              <p className="text-white/75 text-sm leading-relaxed mb-4">
                {t("tech.onesa_matter.p3") ||
                  "Start with a question about a product, a destination or a project. Ask for an explanation or a starting plan you can refine."}{" "}
                {t("tech.onesa_matter.p4") ||
                  "Language and local context support belong to this application's Zimbabwe focus. They do not limit the wider Onesa platform to one country or industry."}
              </p>
              <p className="text-white/85 text-sm leading-relaxed font-medium">
                {t("tech.onesa_matter.p5") ||
                  "AI answers can be incomplete or mistaken. Check prices, availability, requirements and important decisions with the relevant provider or official source."}
              </p>
            </div>
          </details>
        </div>
      </DiscoverySection>
      <DiscoverySection
        id="technology-diaspora-use-cases"
        title={t("tech.diaspora_ai.title", {
          defaultValue: "How Diaspora Unlocked Uses AI",
        })}
        description={t("tech.diaspora_ai.subtitle", {
          defaultValue:
            "Use Onesa for explanations, discovery and planning across this platform. It helps you prepare; providers confirm the details.",
        })}
      >
        <SwipeRail
          label={t("tech.diaspora_ai.title", {
            defaultValue: "How Diaspora Unlocked Uses AI",
          })}
        >
          {diasporaUseCases.map((item, index) => (
            <DiscoveryTile
              key={item.title}
              title={item.title}
              icon={item.icon}
              image={
                [
                  "/images/pages/tourism/victoria_falls.webp",
                  "/images/pages/investment/rbz_building.webp",
                  "/images/pages/shared/export_port_01.jpg",
                  "/images/pages/home/partnership_handshake.png",
                ][index]
              }
            >
              <p>{item.detail}</p>
            </DiscoveryTile>
          ))}
        </SwipeRail>
      </DiscoverySection>
      <DiscoverySection
        id="technology-industries"
        title={t("tech.sectors_title", {
          defaultValue: "Technology ideas by sector",
        })}
        description={t("tech.sectors_subtitle", {
          defaultValue:
            "Explore where technology could help. These are ideas to research; specialist industry tools are not offered here.",
        })}
      >
        <SwipeRail
          label={t("tech.sectors_title", {
            defaultValue: "Technology ideas by sector",
          })}
        >
          {sectors.map(sector => (
            <DiscoveryTile
              key={sector.title}
              title={sector.title}
              image={sector.image}
            >
              <p>{sector.description}</p>
              <ul className="list-disc space-y-2 pl-4">
                {sector.details.map(detail => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </DiscoveryTile>
          ))}
        </SwipeRail>
      </DiscoverySection>
    </Layout>
  );
}
