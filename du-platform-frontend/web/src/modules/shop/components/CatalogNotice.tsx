import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CatalogNotice({
  status,
  source,
  hasProducts,
  pricingAvailable,
  onRetry,
}: {
  status: "loading" | "ready" | "error";
  source: string | null;
  hasProducts: boolean;
  pricingAvailable: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (status === "ready" && source !== "memory" && pricingAvailable) return null;
  return (
    <div className="catalog-notice" role="status">
      <span>
        {status === "ready"
          ? source === "memory"
            ? t("shop.availability.demo", { defaultValue: "Sample catalogue data for demonstration; availability is not live." })
            : t("shop.availability.pricing_unavailable", { defaultValue: "Some price estimates are unavailable. The server will calculate your request total." })
          : status === "loading"
          ? t("shop.availability.checking", {
              defaultValue: "Checking product availability…",
            })
          : t("shop.availability.failed", {
              defaultValue:
                hasProducts ? "Showing previously loaded products. Availability is unavailable; retry for current data." : "Product data is unavailable right now. Please try again.",
            })}
      </span>
      {(status === "error" || (status === "ready" && !pricingAvailable)) && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-zim-gold"
        >
          <RefreshCw className="h-4 w-4" />
          {t("common.retry", { defaultValue: "Try again" })}
        </button>
      )}
    </div>
  );
}
