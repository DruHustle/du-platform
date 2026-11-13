import { useTranslation } from "react-i18next";
import { useShopCatalog } from "../lib/useShopCatalog";

export default function DeliveryCoverage() {
  const { t, i18n } = useTranslation();
  const { status, source, readiness } = useShopCatalog();
  if (status !== "ready" || source !== "db" || !readiness) return null;

  const approved = readiness.commercialReady && readiness.mode === "pilot" && readiness.enforcement === "enforced";
  const codes = approved && Array.isArray(readiness.destinationCountries)
    ? readiness.destinationCountries.filter(code => /^[A-Z]{2}$/.test(code))
    : [];
  const names = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(i18n.resolvedLanguage || "en", { type: "region" })
    : undefined;
  return (
    <p className="mt-2 text-sm leading-relaxed text-slate-300">
      {codes.length
        ? t("shop.delivery_coverage", { countries: codes.map(code => names?.of(code) || code).join(", ") })
        : t("shop.no_delivery_destinations")}
    </p>
  );
}
