import { useEffect } from "react";
import { resolveRouteSeo, resolveCanonicalUrl } from "@shared/routeSeo";

type RouteSeoProps = {
  pathname: string;
  search: string;
};

function upsertMetaTag(attribute: "name" | "property", key: string, content: string) {
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
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

export default function RouteSeo({ pathname, search }: RouteSeoProps) {
  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const seo = resolveRouteSeo({ pathname, search });
    const siteUrl =
      String(import.meta.env.VITE_SITE_URL || window.location.origin || "")
        .trim()
        .replace(/\/+$/, "") || window.location.origin;
    const canonicalUrl = resolveCanonicalUrl(siteUrl, seo.canonicalPath);

    document.title = seo.title;
    upsertMetaTag("name", "description", seo.description);
    upsertMetaTag("name", "robots", seo.robots);
    upsertMetaTag("property", "og:title", seo.socialTitle ?? seo.title);
    upsertMetaTag("property", "og:description", seo.socialDescription ?? seo.description);
    upsertMetaTag("property", "og:url", canonicalUrl);
    upsertMetaTag("name", "twitter:title", seo.socialTitle ?? seo.title);
    upsertMetaTag("name", "twitter:description", seo.socialDescription ?? seo.description);
    upsertLinkTag("canonical", canonicalUrl);
  }, [pathname, search]);

  return null;
}
