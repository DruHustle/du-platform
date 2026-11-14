import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  PUBLIC_SITE_ORIGIN,
  resolveRouteSeo,
  resolveCanonicalUrl,
} from "@/domain/routeSeo";

type RouteSeoProps = {
  pathname: string;
  search: string;
};

function upsertMetaTag(
  attribute: "name" | "property",
  key: string,
  content: string,
) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLinkTag(rel: string, href: string) {
  let element = document.head.querySelector(
    `link[rel="${rel}"]`,
  ) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

// Use the same translated copy that visitors see when they switch language.
const localizedPages: Record<string, [string, string]> = {
  "/": ["home.hero_title", "home.hero_subtitle"],
  "/shop": ["shop.landing.title", "home.tiles.shop.description"],
  "/shop/products": ["shop.landing.title", "home.tiles.shop.description"],
  "/shop/interest": ["product_interest.title", "product_interest.scope"],
  "/travel": ["travel.title", "travel.description"],
  "/travel/flights": ["travel.flights", "travel.purpose.flights"],
  "/travel/stays": ["travel.stays", "travel.purpose.stays"],
  "/travel/car-hire": ["travel.car-hire", "travel.purpose.car-hire"],
  "/travel/my-trips": ["travel.my-trips", "travel.private-note"],
  "/travel/weather": ["weather.title", "weather.description"],
  "/travel/explore": ["travel.explore-title", "travel.explore-description"],
  "/travel/planner": [
    "tourism.onesa.trip_planner.title",
    "tourism.onesa.trip_planner.subtitle",
  ],
  "/onesa": ["tech.landing.title", "tech.landing.description"],
  "/care": ["care.title", "care.intro"],
  "/business-guides": [
    "investment.landing.title",
    "investment.landing.description",
  ],
  "/login": ["auth.login", "auth.login_subtitle"],
  "/register": ["auth.create_account", "auth.register_subtitle"],
  "/forgot-password": ["auth.forgot.title", "auth.forgot.subtitle"],
  "/reset-password": ["auth.reset.title", "auth.reset.subtitle"],
  "/newsletter": ["newsletter_preferences.manage_title", "newsletter_preferences.confirm_help"],
  "/search": ["search.results.title_default", "search.description"],
  "/legal-notice": ["pilot.operator_title", "pilot.operator_summary"],
  "/delivery-and-returns": ["pilot.procedures_title", "pilot.procedures_summary"],
  "/privacy-policy": ["legal.privacy.title", "legal.privacy.p1"],
  "/terms-of-service": ["legal.terms.title", "legal.terms.p1"],
};
export default function RouteSeo({ pathname, search }: RouteSeoProps) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined")
      return;

    const seo = resolveRouteSeo({ pathname, search });
    const language = i18n.resolvedLanguage || "en";
    const translated = language !== "en" && localizedPages[seo.canonicalPath];
    const guide = seo.canonicalPath.match(
      /^\/business-guides\/([a-z-]+)$/,
    )?.[1];
    const title = translated
      ? `${t(translated[0])} | Diaspora Unlocked`
      : guide && language !== "en"
        ? `${t(`investment.opportunities.${guide}.title`)} | Diaspora Unlocked`
        : seo.title;
    const description = translated
      ? t(translated[1])
      : guide && language !== "en"
        ? t(`investment.opportunities.${guide}.summary`)
        : seo.description;
    const siteUrl =
      String(
        import.meta.env.VITE_SITE_URL ||
          (import.meta.env.PROD
            ? PUBLIC_SITE_ORIGIN
            : window.location.origin) ||
          "",
      )
        .trim()
        .replace(/\/+$/, "") || window.location.origin;
    const canonicalUrl = resolveCanonicalUrl(siteUrl, seo.canonicalPath);

    document.title = title;
    upsertMetaTag("name", "description", description);
    upsertMetaTag("name", "robots", seo.robots);
    upsertMetaTag("property", "og:title", title);
    upsertMetaTag("property", "og:description", description);
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag(
      "property",
      "og:locale",
      (
        { en: "en_ZW", de: "de_DE", sn: "sn_ZW", nd: "nd_ZW" } as Record<
          string,
          string
        >
      )[language] || "en_ZW",
    );
    upsertMetaTag("name", "twitter:title", title);
    upsertMetaTag("name", "twitter:description", description);
    upsertLinkTag("canonical", canonicalUrl);
  }, [pathname, search, i18n.resolvedLanguage, t]);

  return null;
}
