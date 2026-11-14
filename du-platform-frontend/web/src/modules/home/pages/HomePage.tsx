import Layout from "@/components/Layout";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, Brain, Landmark, HeartHandshake, ShoppingBag } from "lucide-react";
import MainPageHero from "@/modules/home/components/MainPageHero";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";

const modules = [
  {
    key: "shop",
    href: "/shop",
    image: "/images/pages/shop/crafts_binga_baskets_01.jpg",
    icon: ShoppingBag,
  },
  {
    key: "care",
    href: "/care",
    image: "/images/pages/care/family-gathering.webp",
    icon: HeartHandshake,
  },
  {
    key: "onesa",
    href: "/onesa",
    image: "/images/pages/technology/ai_innovation.webp",
    icon: Brain,
  },
  {
    key: "business",
    href: "/business-guides",
    image: "/images/pages/investment/horticulture.jpg",
    icon: Landmark,
  },
];

export default function Home() {
  const { t } = useTranslation();

  return (
    <Layout>
      <MainPageHero />
      <div className="home-landing">
        <DiscoverySection
          id="explore-platform"
          title={t("home.discovery.title")}
        >
          <SwipeRail label={t("home.discovery.title")}>
            {modules.map(module => (
              <DiscoveryTile
                key={module.key}
                title={t(`home.tiles.${module.key}.title`)}
                icon={module.icon}
                image={module.image}
                imageAlt=""
                footer={
                  <Link className="home-module-link" href={module.href}>
                    {t(`home.tiles.${module.key}.stats`)}
                    <span className="discovery-tile-plus" aria-hidden="true">
                      <ArrowRight />
                    </span>
                  </Link>
                }
              >
                <p>{t(`home.tiles.${module.key}.description`)}</p>
              </DiscoveryTile>
            ))}
          </SwipeRail>
        </DiscoverySection>
      </div>
    </Layout>
  );
}
