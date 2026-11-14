import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useShopCatalog } from "../lib/useShopCatalog";

export default function PilotReadinessNotice({
  operator = false,
  showPolicyLinks = true,
}: {
  operator?: boolean;
  showPolicyLinks?: boolean;
}) {
  const { t } = useTranslation();
  const { readiness: status, source, status: catalogStatus } = useShopCatalog();
  const open = catalogStatus === "ready" && source === "db" && status?.commercialReady && status.mode === "pilot" && status.enforcement === "enforced";
  return (
    <aside
      role="note"
      className="my-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm leading-relaxed text-white/85"
    >
      <strong className="block text-amber-200">
        {t(
          open
            ? "pilot.readiness_limited"
            : "pilot.readiness_prelaunch"
        )}
      </strong>
      <p className="my-2">
        {t(
          open
            ? "pilot.readiness_pilot_note"
            : "pilot.readiness_pending_note"
        )}
      </p>
      {showPolicyLinks && (
        <>
          <Link href="/legal-notice" className="underline">
            {t("pilot.operator_title")}
          </Link>
          {" · "}
          <Link href="/delivery-and-returns" className="underline">
            {t("pilot.procedures_title")}
          </Link>
        </>
      )}
      {operator && (
        <div className="mt-3 border-t border-white/15 pt-3">
          <p>
            Readiness mode: {status?.mode || "unconfirmed"} ·{" "}
            {status?.enforcement || "status unavailable"}
          </p>
          <p>
            New commercial quotes require owner approval. Report-only mode
            preserves the existing assisted workflow and is not launch approval.
          </p>
          {status?.missing?.length ? (
            <p>
              Outstanding checks:{" "}
              {status.missing.map(item => item.replaceAll("_", " ")).join(", ")}
            </p>
          ) : null}
          <p>
            Changing modes requires an explicit operational decision; existing
            order recovery, refunds and fulfilment remain available.
          </p>
        </div>
      )}
    </aside>
  );
}
