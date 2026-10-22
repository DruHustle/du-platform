import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import InstantImage from "@/components/InstantImage";
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
    photo: {
      author: "Dariusmutamba",
      url: "https://commons.wikimedia.org/wiki/File:Construction_in_harare_01.jpg",
    },
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
    photo: {
      author: "Mulavu123",
      url: "https://commons.wikimedia.org/wiki/File:Solar_panel_installation.jpg",
    },
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
        <section id="hero" className="investment-hero">
          <div className="investment-inner investment-hero-grid">
            <div>
              <p className="investment-eyebrow">
                {t("investment.landing.eyebrow")}
              </p>
              <h1>
                {t("investment.landing.title")}
                <span>{t("investment.landing.highlight")}</span>
              </h1>
              <p className="investment-hero-description">
                {t("investment.landing.description")}
              </p>
              <div className="investment-actions">
                <Button asChild className={actionClass}>
                  <a href="#investment-innovation-opportunities">
                    {t("investment.landing.ideas_cta")}
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0"
                    />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-auto min-h-11 max-w-full whitespace-normal border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"
                >
                  <a href="#collective-model">
                    {t("investment.landing.plan_cta")}
                  </a>
                </Button>
              </div>
              <p className="investment-hero-principle">
                {t("investment.landing.principle")}
              </p>
            </div>
            <figure className="investment-hero-media">
              <InstantImage
                src="/images/pages/investment/horticulture.jpg"
                alt={t("investment.opportunities.farming.image_alt")}
                priority
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />
              <figcaption>{t("investment.landing.image_caption")}</figcaption>
            </figure>
          </div>
        </section>

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
                    <>
                      <a
                        data-business-source
                        href={item.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="investment-source-link"
                      >
                        {t(`investment.opportunities.${item.key}.source`)}
                      </a>
                      {item.photo && (
                        <p className="business-idea-credit">
                          {t("investment.opportunities.photo_label")}{" "}
                          <a
                            href={item.photo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.photo.author}
                          </a>
                          {" · "}
                          <a
                            href="https://creativecommons.org/licenses/by-sa/4.0/"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            CC BY-SA 4.0
                          </a>
                          {" · "}
                          {t("investment.opportunities.photo_crop")}
                        </p>
                      )}
                    </>
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
          <ol className="investment-plan-grid">
            {["customer", "costs", "agreement", "review"].map((key, index) => (
              <li key={key}>
                <span className="investment-step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{t(`investment.plan.${key}.title`)}</h3>
                <p>{t(`investment.plan.${key}.description`)}</p>
              </li>
            ))}
          </ol>
          <div className="investment-plan-action">
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
          <p className="investment-note">{t("investment.resources.note")}</p>
        </DiscoverySection>
      </div>
    </Layout>
  );
}
