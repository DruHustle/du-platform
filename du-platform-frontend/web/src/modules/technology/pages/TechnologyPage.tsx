import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Brain,
  Camera,
  ClipboardList,
  GraduationCap,
  Leaf,
  MapPin,
  Package,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import DiscoveryHero from "@/components/discovery/DiscoveryHero";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";

const tools = [
  {
    key: "chat",
    icon: Brain,
    image: "/images/pages/technology/ai_innovation.webp",
    href: "/onesa-ai-chat",
  },
  {
    key: "trip",
    icon: MapPin,
    image: "/images/pages/tourism/victoria_falls.webp",
    href: "/travel/planner",
  },
  {
    key: "vr",
    icon: Camera,
    image: "/images/pages/technology/virtual-demo-preview.webp",
    href: "/travel/virtual-experience",
  },
  {
    key: "ar",
    icon: ClipboardList,
    image: "/images/pages/tourism/great_zimbabwe.jpeg",
    href: "/travel/augmented-experience",
  },
];
const ideas = [
  {
    key: "farming",
    icon: Leaf,
    image: "/images/pages/technology/horticulture.jpg",
  },
  {
    key: "stock",
    icon: Package,
    image: "/images/pages/shop/food_dried_mango_1.jpg",
  },
  {
    key: "jobs",
    icon: Wrench,
    image: "/images/pages/investment/harare-construction.webp",
  },
  {
    key: "skills",
    icon: GraduationCap,
    image: "/images/pages/technology/digital-classroom.jpg",
  },
];
const actionClass =
  "h-auto min-h-11 max-w-full whitespace-normal bg-zim-gold text-slate-950 hover:bg-yellow-300";

export default function Technology() {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="technology-landing">
        <DiscoveryHero
          eyebrow={t("tech.landing.eyebrow")}
          title={t("tech.landing.title")}
          highlight={t("tech.landing.highlight")}
          description={t("tech.landing.description")}
          principle={t("tech.landing.principle")}
          image="/images/pages/technology/ai_innovation.webp"
          imageAlt={t("tech.landing.image_alt")}
          caption={t("tech.landing.caption")}
        >
          <Button asChild className={actionClass}>
            <Link href="/onesa-ai-chat">
              {t("tech.chat_with_onesa")}
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-11 max-w-full whitespace-normal border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"
          >
            <a href="#onesa-intro">{t("tech.landing.tools_cta")}</a>
          </Button>
        </DiscoveryHero>

        <DiscoverySection
          id="onesa-intro"
          title={t("tech.tools.title")}
          description={t("tech.tools.subtitle")}
        >
          <SwipeRail label={t("tech.tools.title")}>
            {tools.map(tool => (
              <DiscoveryTile
                key={tool.key}
                title={t("tech.tools." + tool.key + ".title")}
                icon={tool.icon}
                image={tool.image}
                imageAlt={t("tech.tools." + tool.key + ".image_alt")}
                footer={
                  <Button asChild className={actionClass}>
                    <Link href={tool.href}>
                      {t("tech.tools." + tool.key + ".cta")}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                      />
                    </Link>
                  </Button>
                }
              >
                <p>{t("tech.tools." + tool.key + ".description")}</p>
              </DiscoveryTile>
            ))}
          </SwipeRail>
          <div id="technology-onesa-vision" className="discovery-introduction">
            <details className="editorial-details">
              <summary>{t("tech.about.title")}</summary>
              <div className="mt-5 space-y-4 text-sm leading-7">
                <p>{t("tech.about.platform")}</p>
                <p>{t("tech.about.application")}</p>
              </div>
            </details>
          </div>
        </DiscoverySection>

        <DiscoverySection
          id="technology-diaspora-use-cases"
          title={t("tech.steps.title")}
          description={t("tech.steps.subtitle")}
        >
          <ol className="discovery-plan-grid">
            {["ask", "organise", "check"].map((key, index) => (
              <li key={key}>
                <span className="discovery-step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{t("tech.steps." + key + ".title")}</h3>
                <p>{t("tech.steps." + key + ".description")}</p>
              </li>
            ))}
          </ol>
        </DiscoverySection>

        <DiscoverySection
          id="technology-industries"
          title={t("tech.ideas.title")}
          description={t("tech.ideas.subtitle")}
        >
          <SwipeRail label={t("tech.ideas.title")}>
            {ideas.map(idea => (
              <DiscoveryTile
                key={idea.key}
                title={t("tech.ideas." + idea.key + ".title")}
                icon={idea.icon}
                image={idea.image}
                imageAlt={t("tech.ideas." + idea.key + ".image_alt")}
              >
                <p>{t("tech.ideas." + idea.key + ".description")}</p>
                <dl className="technology-prompt">
                  <dt>{t("tech.ideas.prompt_label")}</dt>
                  <dd>{t("tech.ideas." + idea.key + ".prompt")}</dd>
                </dl>
              </DiscoveryTile>
            ))}
          </SwipeRail>
          <div className="discovery-plan-action">
            <p>{t("tech.ideas.next")}</p>
            <Button asChild className={actionClass}>
              <Link href="/investment#investment-innovation-opportunities">
                {t("tech.ideas.cta")}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
          <p className="discovery-note">
            {t("tech.note")}{" "}
            <a
              href="/licenses/business-images.html"
              className="underline underline-offset-4 hover:text-slate-950"
            >
              {t("common.image_credits")}
            </a>
          </p>
        </DiscoverySection>
      </div>
    </Layout>
  );
}
