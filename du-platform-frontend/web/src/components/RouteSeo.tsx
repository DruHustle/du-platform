import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  localizeRouteSeo,
  openGraphLocale,
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

export default function RouteSeo({ pathname, search }: RouteSeoProps) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined")
      return;

    const seo = resolveRouteSeo({ pathname, search });
    const language = i18n.resolvedLanguage || "en";
    const { title, description } = localizeRouteSeo(seo, language, key => t(key));
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
      openGraphLocale(language),
    );
    upsertMetaTag("name", "twitter:title", title);
    upsertMetaTag("name", "twitter:description", description);
    upsertLinkTag("canonical", canonicalUrl);
  }, [pathname, search, i18n.resolvedLanguage, t]);

  return null;
}
