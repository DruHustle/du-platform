import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const statusLabels: Record<string, string> = {
  accepted: "Accepted by provider",
  cancelled: "Closed without resending",
  pending: "Queued",
  processing: "Attempt in progress",
  failed: "Needs review",
  reconcile: "Reconciliation required",
  skipped: "Suppressed (ineligible)",
};
export default function ServiceInbox() {
  const [data, setData] = useState<any>(null),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false),
    [reference, setReference] = useState<Record<number, string>>({});
  useEffect(() => {
    const c = new AbortController();
    setData(null);
    setError("");
    api
      .get("/admin/service-inbox", { params: { page }, signal: c.signal })
      .then(({ data }) => {
        if (!c.signal.aborted) setData(data);
      })
      .catch(() => {
        if (!c.signal.aborted)
          setError(
            "The service inbox could not be loaded. Retry to review saved enquiries."
          );
      });
    return () => c.abort();
  }, [page, revision]);
  async function act(id: number, action: string) {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      await api.post(`/admin/service-inbox/${id}/action`, {
        action,
        ...(action === "accepted" ? { providerId: reference[id] } : {}),
      });
    } catch {
      setActionError(
        "The action could not be confirmed. Review the refreshed status before retrying."
      );
    } finally {
      setBusy(false);
      setRevision(r => r + 1);
    }
  }
  return (
    <section
      className="surface-card min-w-0 space-y-5 p-5 sm:p-7 [&_button]:min-h-11 [&_input]:min-h-11"
      aria-label="Service inbox"
    >
      <h2 className="text-xl font-semibold">Service inbox</h2>
      <p className="text-sm text-slate-300">
        Enquiries are durably received before success is returned. Operator
        notifications and customer acknowledgements are separate. Provider
        acceptance is not guaranteed inbox delivery. These messages never
        subscribe anyone to marketing.
      </p>
      <Button onClick={() => setRevision(r => r + 1)} disabled={busy}>
        Refresh service inbox
      </Button>
      {error && <p role="alert">{error}</p>}
      {actionError && <p role="alert">{actionError}</p>}
      {!data && !error && <p role="status">Loading service inbox…</p>}
      {data && (
        <>
          <h3 className="font-semibold">Received enquiries</h3>
          {!data.enquiries.length && <p>No enquiries on this page.</p>}
          {data.enquiries.map((row: any) => (
            <article
              key={row.request_id}
              className="space-y-2 rounded-xl border border-white/15 p-4 break-words"
            >
              <h4 className="font-semibold">{row.details.subject}</h4>
              <p className="text-xs text-slate-300">
                Received: {row.created_at} · {row.language} · {row.request_id}
              </p>
              <p>
                {row.details.name} · {row.details.email}
                {row.details.phone ? ` · ${row.details.phone}` : ""}
              </p>
              <p className="whitespace-pre-wrap">{row.details.message}</p>
            </article>
          ))}
          <h3 className="font-semibold">Transactional delivery status</h3>
          <p className="text-sm text-slate-300">
            Retries reuse the saved payload and provider key, within a 23-hour
            limit from the first attempt. Outside that window reconcile verified
            provider acceptance or close without resending. Restored queues stay
            held until reconciliation. Reset links and email payloads are never
            listed here.
          </p>
          {!data.deliveries.length && <p>No deliveries on this page.</p>}
          {data.deliveries.map((row: any) => (
            <article
              key={row.id}
              className="space-y-3 rounded-xl border border-white/15 p-4 break-words"
            >
              <h4 className="font-semibold">
                #{row.id} · {row.kind} ·{" "}
                {statusLabels[row.status] || row.status}
              </h4>
              <p className="text-sm">
                {row.attempts} attempts
                {row.entity_id ? ` · ${row.entity_id}` : ""}
              </p>
              <p className="text-xs text-slate-300">
                Provider reconciliation key: {row.provider_key}
              </p>
              {row.error_message && (
                <p className="text-sm text-amber-200">{row.error_message}</p>
              )}
              {Boolean(row.acceptance_uncertain) && (
                <p className="text-sm text-amber-200">
                  Provider acceptance is uncertain. Verify the provider record
                  before reconciliation.
                </p>
              )}
              {row.status === "pending" && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void act(row.id, "close")}
                >
                  Close queued notification #{row.id}
                </Button>
              )}
              {["failed", "reconcile"].includes(row.status) && (
                <div className="flex flex-wrap items-end gap-3">
                  {Boolean(row.can_retry) && (
                    <Button
                      disabled={busy}
                      onClick={() => void act(row.id, "retry")}
                    >
                      Retry same delivery #{row.id}
                    </Button>
                  )}
                  <label className="min-w-0 flex-1 text-sm">
                    Verified provider reference for #{row.id}
                    <Input
                      value={reference[row.id] || ""}
                      maxLength={100}
                      pattern="[a-zA-Z0-9_-]+"
                      onChange={e =>
                        setReference({ ...reference, [row.id]: e.target.value })
                      }
                    />
                  </label>
                  <Button
                    disabled={
                      busy ||
                      !/^[a-zA-Z0-9_-]{1,100}$/.test(reference[row.id] || "")
                    }
                    onClick={() => void act(row.id, "accepted")}
                  >
                    Record provider acceptance #{row.id}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => void act(row.id, "close")}
                  >
                    Close without resending #{row.id}
                  </Button>
                </div>
              )}
            </article>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={page === 1 || busy}
              onClick={() => setPage(p => p - 1)}
            >
              Previous inbox page
            </Button>
            <span>Page {page}</span>
            <Button
              disabled={
                busy ||
                (data.enquiries.length < 25 && data.deliveries.length < 50)
              }
              onClick={() => setPage(p => p + 1)}
            >
              Next inbox page
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
