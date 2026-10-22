import Layout from "@/components/Layout";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Brain, Landmark, MapPin, ShoppingBag } from "lucide-react";
import MainPageHero from "@/modules/home/components/MainPageHero";
import SwipeRail from "@/components/discovery/SwipeRail";
import DiscoveryTile from "@/components/discovery/DiscoveryTile";
import DiscoverySection from "@/components/discovery/DiscoverySection";

const heroBackgrounds = [
  "/images/pages/tourism/victoria_falls.webp",
  "/images/pages/tourism/great_zimbabwe.jpeg",
  "/images/pages/tourism/kariba_sunset.jpg",
];
const modules = [
  {
    key: "shop",
    href: "/shop",
    image: "/images/pages/shop/zimbabwe_shop_hero.webp",
    icon: ShoppingBag,
  },
  {
    key: "technology",
    href: "/technology",
    image: "/images/pages/technology/ai_innovation.webp",
    icon: Brain,
  },
  {
    key: "investment",
    href: "/investment",
    image: "/images/pages/investment/horticulture.jpg",
    icon: Landmark,
  },
  {
    key: "tourism",
    href: "/tourism",
    image: "/images/pages/tourism/victoria_falls.webp",
    icon: MapPin,
  },
];

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion || heroPaused) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        setCurrentBgIndex(index => (index + 1) % heroBackgrounds.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [heroPaused, prefersReducedMotion]);

  return (
    <Layout>
      <MainPageHero
        hero={{ currentBgIndex, heroBackgrounds }}
        paused={heroPaused}
        onTogglePause={() => setHeroPaused(paused => !paused)}
      />
      <div className="home-landing">
        <DiscoverySection
          id="explore-platform"
          title={t("home.discovery.title")}
          description={t("home.discovery.description")}
        >
          <SwipeRail label={t("home.discovery.title")}>
            {modules.map(module => (
              <DiscoveryTile
                key={module.key}
                title={t(`home.tiles.${module.key}.title`)}
                icon={module.icon}
                image={module.image}
                imageAlt={t(`home.tiles.${module.key}.image_alt`)}
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
                <p className="mt-4">{t(`home.tiles.${module.key}.detail`)}</p>
              </DiscoveryTile>
            ))}
          </SwipeRail>
        </DiscoverySection>
      </div>
    </Layout>
  );
}
