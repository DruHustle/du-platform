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
        badge: t("tech.hero.badge1") || "Future of Innovation",
        badgeIcon: Brain,
        title: t("tech.hero.title1") || "Onesa AI: Illuminating Zimbabwe",
        subtitle:
          t("tech.hero.subtitle1") ||
          "The first AI model built specifically for the Zimbabwean context.",
        highlight: t("tech.hero.highlight1") || "Built for Zimbabwe",
      },
      {
        image: "/images/pages/technology/partnership_handshake.png",
        badge: t("tech.hero.badge2") || "Contextual Intelligence",
        badgeIcon: Lightbulb,
        title: t("tech.hero.title2") || "Deep Contextual Understanding",
        subtitle:
          t("tech.hero.subtitle2") ||
          "Unlike general AI, Onesa understands the nuances of life and business in Zimbabwe.",
        highlight: t("tech.hero.highlight2") || "Localized Knowledge",
      },
      {
        image: "/images/pages/technology/zim_tech_map.jpg",
        badge: t("tech.hero.badge3") || "Investor Tools",
        badgeIcon: Globe,
        title: t("tech.hero.title3") || "Smart Investment Brainstorming",
        subtitle:
          t("tech.hero.subtitle3") ||
          "Assess risks and generate business ideas that actually succeed in the local market.",
        highlight: t("tech.hero.highlight3") || "Data-Driven Success",
      },
      {
        image: "/images/pages/technology/zim_tech_map.jpg",
        badge: t("tech.hero.badge4") || "Education 5.0",
        badgeIcon: TrendingUp,
        title: t("tech.hero.title4") || "Innovation in Classrooms",
        subtitle:
          t("tech.hero.subtitle4") ||
          "Digital learning and skills development are powering Zimbabwe's next generation of tech talent.",
        highlight: t("tech.hero.highlight4") || "Future Skills",
      },
      {
        image: "/images/pages/shared/export_port_01.jpg",
        badge: t("tech.hero.badge5") || "Smart Logistics",
        badgeIcon: Network,
        title: t("tech.hero.title5") || "Technology for Logistics",
        subtitle:
          t("tech.hero.subtitle5") ||
          "Smarter export and supply-chain systems create more reliable access to regional and global markets.",
        highlight: t("tech.hero.highlight5") || "Connected Supply Chains",
      },
      {
        image: "/images/pages/technology/minerals_mining.png",
        badge: t("tech.hero.badge6") || "Industrial AI",
        badgeIcon: BarChart3,
        title: t("tech.hero.title6") || "Tech in Mining Operations",
        subtitle:
          t("tech.hero.subtitle6") ||
          "Data-driven operations, predictive maintenance, and process optimization improve output and safety.",
        highlight: t("tech.hero.highlight6") || "Operational Efficiency",
      },
      {
        image: "/images/pages/technology/horticulture.jpg",
        badge: t("tech.hero.badge7") || "Agritech Growth",
        badgeIcon: MapPin,
        title: t("tech.hero.title7") || "Smarter Farming Systems",
        subtitle:
          t("tech.hero.subtitle7") ||
          "Precision agriculture and real-time monitoring support stronger yields and food security outcomes.",
        highlight: t("tech.hero.highlight7") || "Climate-Smart Agriculture",
      },
      {
        image: "/images/pages/technology/partnership_handshake.png",
        badge: t("tech.hero.badge8") || "Diaspora Builders",
        badgeIcon: Building2,
        title: t("tech.hero.title8") || "Tech Talent Across Borders",
        subtitle:
          t("tech.hero.subtitle8") ||
          "Diaspora professionals contribute capital, mentorship, and practical execution support for local startups.",
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
        "Leveraging AI for geological data analysis and regulatory compliance in Zimbabwe's vast mineral sector.",
      details: [
        t("tech.sectors.mining.d1") ||
          "Real-time mineral pricing and market trends",
        t("tech.sectors.mining.d2") ||
          "Environmental and safety compliance monitoring",
      ],
    },
    {
      title: t("tech.sectors.farming.title") || "Precision Farming",
      image: "/images/pages/technology/horticulture.jpg",
      description:
        t("tech.sectors.farming.desc") ||
        "Transforming agriculture through data-driven crop management and weather pattern prediction.",
      details: [
        t("tech.sectors.farming.d1") ||
          "Soil health analysis and crop yield optimization",
        t("tech.sectors.farming.d2") ||
          "Localized weather alerts and pest control advice",
      ],
    },
    {
      title: t("tech.sectors.logistics.title") || "Smart Logistics",
      image: "/images/pages/shared/export_port_01.jpg",
      description:
        t("tech.sectors.logistics.desc") ||
        "Optimizing supply chains and cross-border trade routes through the Zimbabwean corridor.",
      details: [
        t("tech.sectors.logistics.d1") ||
          "Route optimization for regional distribution",
        t("tech.sectors.logistics.d2") ||
          "Real-time tracking and border clearance assistance",
      ],
    },
    {
      title: t("tech.sectors.education.title") || "Future Education",
      image: "/images/pages/technology/digital-classroom.jpg",
      description:
        t("tech.sectors.education.desc") ||
        "Bridging the digital divide through AI-powered personalized learning and vocational training.",
      details: [
        t("tech.sectors.education.d1") ||
          "Adaptive learning platforms for local schools",
        t("tech.sectors.education.d2") ||
          "Technical skill development for the digital economy",
      ],
    },
  ];

  const diasporaUseCases = [
    {
      icon: Globe,
      title:
        t("tech.diaspora_use_cases.relocation.title") ||
        "Relocation & Reintegration",
      detail:
        t("tech.diaspora_use_cases.relocation.detail") ||
        "Get practical guidance on housing, legal setup, schooling options, and service providers before arrival.",
    },
    {
      icon: TrendingUp,
      title:
        t("tech.diaspora_use_cases.investment.title") || "Investment Screening",
      detail:
        t("tech.diaspora_use_cases.investment.detail") ||
        "Compare opportunities by sector, expected returns, regulatory readiness, and market demand signals.",
    },
    {
      icon: BarChart3,
      title:
        t("tech.diaspora_use_cases.business_intelligence.title") ||
        "Business Intelligence",
      detail:
        t("tech.diaspora_use_cases.business_intelligence.detail") ||
        "Generate market-entry briefs for exports, pricing benchmarks, and demand snapshots by destination market.",
    },
    {
      icon: Network,
      title:
        t("tech.diaspora_use_cases.collaboration.title") ||
        "Diaspora Collaboration",
      detail:
        t("tech.diaspora_use_cases.collaboration.detail") ||
        "Coordinate mentors, co-investors, and operators across countries using shared project context.",
    },
  ];

  const onesaVisionTiles = [
    {
      icon: Lightbulb,
      title:
        t("tech.onesa_matter.tiles.illuminate.title") ||
        "Onesa Means Illuminate",
      detail:
        t("tech.onesa_matter.tiles.illuminate.detail") ||
        "Onesa is built to bring practical clarity for how people and businesses can grow in Zimbabwe and across Africa.",
    },
    {
      icon: Globe,
      title:
        t("tech.onesa_matter.tiles.africa_centric.title") ||
        "Africa-Centric Intelligence",
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

  return (
    <Layout>
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} />
      </section>
      <DiscoverySection
        id="onesa-intro"
        title={t("tech.onesa_matter.title", {
          defaultValue: "Why Onesa AI Matters",
        })}
        description={t("tech.onesa_matter.headline", {
          defaultValue: "Africa deserves AI that understands Africa.",
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
            defaultValue: "Why Onesa AI Matters",
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
                defaultValue: "Read the Onesa AI vision",
              })}
            </summary>
            <div className="mt-5 space-y-5">
              <p className="text-white/75 text-sm leading-relaxed mb-4">
                {t("tech.onesa_matter.p1") ||
                  "Across the world, AI is reshaping economies, industries, and societies at incredible speed. Yet most models are built on data, priorities, and contexts that often miss African realities. For Africa to fully participate in the global digital economy, we need Africa-centric models that understand our languages, cultures, business environments, and development priorities."}{" "}
                {t("tech.onesa_matter.p2") ||
                  "At Diaspora Unlocked, we believe Africa should not only consume AI. Africa must help build it. That belief is exactly why we began developing Onesa AI: to create intelligent systems that are truly relevant to African markets, African data environments, and African economic transformation goals."}
              </p>
              <p className="text-white/75 text-sm leading-relaxed mb-4">
                {t("tech.onesa_matter.p3") ||
                  "We also know this journey is not easy. Training AI models demands serious infrastructure, computing power, data preparation, and world-class talent. The costs are high, and the barriers are real. We chose to move forward anyway because Africa's long-term future depends on technological ownership, digital independence, and the ability to shape our own digital ecosystems."}{" "}
                {t("tech.onesa_matter.p4") ||
                  "AI sovereignty is becoming one of the defining global conversations of this era. Nations that control their data, their models, and their digital infrastructure will be better positioned to protect their economies, accelerate innovation, and preserve strategic independence. Africa must be in that future, not as observers, but as creators and leaders."}
              </p>
              <p className="text-white/85 text-sm leading-relaxed font-medium">
                {t("tech.onesa_matter.p5") ||
                  "Onesa AI is our commitment to that future. This is bigger than technology. It is about opportunity, resilience, and building systems that serve future generations across the continent and the diaspora."}
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
            "Onesa AI is built to support the full diaspora journey, from reconnecting and returning to evaluating opportunities and operating businesses.",
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
          defaultValue: "Powering Key Industries",
        })}
        description={t("tech.sectors_subtitle", {
          defaultValue:
            "Onesa AI provides specialized intelligence to optimize Zimbabwe's most critical economic sectors.",
        })}
      >
        <SwipeRail
          label={t("tech.sectors_title", {
            defaultValue: "Powering Key Industries",
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
