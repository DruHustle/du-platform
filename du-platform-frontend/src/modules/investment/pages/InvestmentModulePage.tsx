import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import DiscoveryHero from "@/components/discovery/DiscoveryHero";
import {
  ArrowRight,
  Building,
  ChevronDown,
  Gem,
  Globe,
  Leaf,
  Package,
  Search,
  Shield,
  Sun,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

const businessIdeas = [
  {
    key: "mining",
    icon: Gem,
    image: "/images/pages/investment/minerals_mining.png",
    source: "https://www.chamines.co.zw/home/MiningAffairs",
  },
  {
    key: "farming",
    icon: Leaf,
    image: "/images/pages/investment/horticulture.jpg",
    source:
      "https://tradezimbabwe.com/gokwe-chilli-farmers-target-export-markets/",
  },
  {
    key: "construction",
    icon: Building,
    image: "/images/pages/investment/harare-construction.webp",
    source: "https://www.hararecity.co.zw/services/about/building-permits",
  },
  {
    key: "food",
    icon: Package,
    image: "/images/pages/shop/food_dried_mango_1.jpg",
    source:
      "https://tradezimbabwe.com/afcfta-opens-new-export-opportunities-for-msmes/",
  },
  {
    key: "solar",
    icon: Sun,
    image: "/images/pages/investment/zimbabwe-solar-installation.webp",
    source:
      "https://www.get-invest.eu/about/country-and-regional-windows/zimbabwe/",
  },
];
const researchPaths = [
  { key: "projects", icon: Building, href: "/investment/opportunities" },
  { key: "directory", icon: Search, href: "/ntir" },
];
const resources = [
  { key: "zida", icon: Shield, href: "https://zidainvest.com/" },
  { key: "zimtrade", icon: Globe, href: "https://tradezimbabwe.com/" },
  {
    key: "energy",
    icon: Sun,
    href: "https://www.get-invest.eu/about/country-and-regional-windows/zimbabwe/",
  },
];
const actionClass =
  "h-auto min-h-11 max-w-full whitespace-normal bg-zim-gold text-slate-950 hover:bg-yellow-300";

export default function Investment() {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="investment-landing">
        <DiscoveryHero
          eyebrow={t("investment.landing.eyebrow")}
          title={t("investment.landing.title")}
          highlight={t("investment.landing.highlight")}
          description={t("investment.landing.description")}
          principle={t("investment.landing.principle")}
          image="/images/pages/investment/horticulture.jpg"
          imageAlt={t("investment.opportunities.farming.image_alt")}
          caption={t("investment.landing.image_caption")}
        >
          <Button asChild className={actionClass}>
            <a href="#investment-innovation-opportunities">
              {t("investment.landing.ideas_cta")}
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-11 max-w-full whitespace-normal border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"
          >
            <a href="#collective-model">{t("investment.landing.plan_cta")}</a>
          </Button>
        </DiscoveryHero>

        <DiscoverySection
          id="investment-innovation-opportunities"
          title={t("investment.opportunities.title")}
          description={t("investment.opportunities.subtitle")}
        >
          <SwipeRail label={t("investment.opportunities.title")}>
            {businessIdeas.map(item => {
              const title = t(`investment.opportunities.${item.key}.title`);
              return (
                <DiscoveryTile
                  key={item.key}
                  title={title}
                  icon={item.icon}
                  image={item.image}
                  imageAlt={t(`investment.opportunities.${item.key}.image_alt`)}
                  footer={
                    <a
                      data-business-source
                      href={item.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="investment-source-link"
                    >
                      {t(`investment.opportunities.${item.key}.source`)}
                    </a>
                  }
                >
                  <p className="business-idea-intro">
                    {t(`investment.opportunities.${item.key}.summary`)}
                  </p>
                  <dl className="business-idea-details business-idea-basics">
                    {(["start", "budget"] as const).map(field => (
                      <div key={field}>
                        <dt>{t(`investment.opportunities.labels.${field}`)}</dt>
                        <dd>
                          {t(`investment.opportunities.${item.key}.${field}`)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <details className="business-idea-more">
                    <summary
                      aria-label={`${t("investment.opportunities.explore")}: ${title}`}
                    >
                      <span>{t("investment.opportunities.explore")}</span>
                      <ChevronDown
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                      />
                    </summary>
                    <dl className="business-idea-details">
                      {(
                        [
                          "customers",
                          "income",
                          "checks",
                          "improvement",
                          "monitor",
                        ] as const
                      ).map(field => (
                        <div key={field}>
                          <dt>
                            {t(`investment.opportunities.labels.${field}`)}
                          </dt>
                          <dd>
                            {t(`investment.opportunities.${item.key}.${field}`)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </DiscoveryTile>
              );
            })}
          </SwipeRail>
        </DiscoverySection>

        <DiscoverySection
          id="collective-model"
          title={t("investment.plan.title")}
          description={t("investment.plan.subtitle")}
        >
          <ol className="discovery-plan-grid">
            {["customer", "costs", "agreement", "review"].map((key, index) => (
              <li key={key}>
                <span className="discovery-step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{t(`investment.plan.${key}.title`)}</h3>
                <p>{t(`investment.plan.${key}.description`)}</p>
              </li>
            ))}
          </ol>
          <div className="discovery-plan-action">
            <p>{t("investment.plan.checklist_description")}</p>
            <Button asChild className={actionClass}>
              <Link href="/regulations#due-diligence-checklist">
                {t("investment.plan.cta")}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
        </DiscoverySection>

        <DiscoverySection
          id="active-projects"
          title={t("investment.research.title")}
          description={t("investment.research.subtitle")}
        >
          <SwipeRail label={t("investment.research.title")} wide>
            {researchPaths.map(item => (
              <DiscoveryTile
                key={item.key}
                icon={item.icon}
                title={t(`investment.research.${item.key}.title`)}
                footer={
                  <Button asChild className={actionClass}>
                    <Link href={item.href}>
                      {t(`investment.research.${item.key}.cta`)}
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0"
                      />
                    </Link>
                  </Button>
                }
              >
                <p>{t(`investment.research.${item.key}.description`)}</p>
              </DiscoveryTile>
            ))}
          </SwipeRail>
        </DiscoverySection>

        <DiscoverySection
          id="eu-partnerships"
          title={t("investment.resources.title")}
          description={t("investment.resources.subtitle")}
        >
          <SwipeRail label={t("investment.resources.title")}>
            {resources.map(item => (
              <DiscoveryTile
                key={item.key}
                icon={item.icon}
                title={t(`investment.resources.${item.key}.title`)}
                footer={
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="investment-source-link"
                  >
                    {t(`investment.resources.${item.key}.cta`)}
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                    />
                  </a>
                }
              >
                <p>{t(`investment.resources.${item.key}.description`)}</p>
              </DiscoveryTile>
            ))}
          </SwipeRail>
          <p className="discovery-note">
            {t("investment.resources.note")}{" "}
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
