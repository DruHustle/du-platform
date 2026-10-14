import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CatalogNotice({
  status,
  onRetry,
}: {
  status: "loading" | "ready" | "error";
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (status === "ready") return null;
  return (
    <div className="catalog-notice" role="status">
      <span>
        {status === "loading"
          ? t("shop.availability.checking", {
              defaultValue: "Checking product availability…",
            })
          : t("shop.availability.failed", {
              defaultValue:
                "Availability is unavailable right now. Your cart is saved.",
            })}
      </span>
      {status === "error" && (
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
