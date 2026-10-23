import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import type { PublicShopReadiness } from "@shared/shopReadiness";

export default function PilotReadinessNotice({
  operator = false,
}: {
  operator?: boolean;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PublicShopReadiness | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    void api
      .get("/shop/readiness", { signal: abort.signal })
      .then(({ data }) => {
        if (!abort.signal.aborted) setStatus(data);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  return (
    <aside
      role="note"
      className="my-4 rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm leading-relaxed text-white/85"
    >
      <strong className="block text-amber-200">
        {t(
          status?.commercialReady
            ? "pilot.readiness_limited"
            : "pilot.readiness_prelaunch"
        )}
      </strong>
      <p className="my-2">
        {t(
          status?.commercialReady
            ? "pilot.readiness_pilot_note"
            : "pilot.readiness_pending_note"
        )}
      </p>
      <Link href="/legal-notice" className="underline">
        {t("pilot.operator_title")}
      </Link>
      {" · "}
      <Link href="/delivery-and-returns" className="underline">
        {t("pilot.procedures_title")}
      </Link>
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
