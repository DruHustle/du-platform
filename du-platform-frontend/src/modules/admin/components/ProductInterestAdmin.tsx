import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicShopReadiness } from "@/contracts/shopReadiness";
export default function ProductInterestAdmin() {
  const [from, setFrom] = useState(
      new Date(Date.now() - 27 * 86400000).toISOString().slice(0, 10)
    ),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [readiness, setReadiness] = useState<PublicShopReadiness | null>(null);
  async function load() {
    setBusy(true);
    setError("");
    setData(null);
    setReadiness(null);
    try {
      const [{ data: result }, { data: state }] = await Promise.all([
        api.get("/admin/product-interest", { params: { from, to } }),
        api.get("/shop/readiness"),
      ]);
      setData(result);
      setReadiness(state);
    } catch {
      setError(
        "Product interest could not be loaded. Retry when the service is available."
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="surface-card min-w-0 max-w-full space-y-5 p-5 sm:p-7">
      <h2 className="text-xl font-semibold">Product interest</h2>
      <p className="text-sm text-slate-300">
        One-time, confirmed product alerts, separate from newsletter consent.
        Active confirmed / waiting is current demand; historically confirmed
        includes cancelled and notified requests. Pending excludes expired links
        (48 hours, server time). Counts are unique email/product pairs in the
        selected consent date range, not orders, reservations or sales. Retries
        do not add demand.
      </p>
      <p className="text-sm text-amber-200">
        Commercial mode: {readiness?.mode || "unconfirmed"} ·{" "}
        {readiness?.enforcement || "unavailable"}. Stock edits alone do not
        approve sales or alerts.
      </p>
      <form
        onSubmit={e => {
          e.preventDefault();
          void load();
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="min-w-0 flex-1 basis-44 text-sm">
          From (UTC)
          <Input
            type="date"
            required
            disabled={busy}
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </label>
        <label className="min-w-0 flex-1 basis-44 text-sm">
          Through (UTC)
          <Input
            type="date"
            required
            disabled={busy}
            value={to}
            min={from}
            onChange={e => setTo(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy ? "Loading…" : "Review range"}
        </Button>
      </form>
      {busy && <p role="status">Loading product interest…</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p className="text-sm text-slate-300">
            Showing consent dates {data.from} through {data.to} (UTC).
          </p>
          <p className="text-sm text-slate-300">
            {data.legacy} legacy records retained without automatic confirmation
            or delivery.
          </p>
          <div
            role="region"
            aria-label="Product interest counts"
            tabIndex={0}
            onKeyDown={event => {
              if (
                event.target !== event.currentTarget ||
                event.altKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                !["ArrowLeft", "ArrowRight"].includes(event.key)
              )
                return;
              event.preventDefault();
              event.currentTarget.scrollLeft +=
                event.key === "ArrowRight" ? 80 : -80;
            }}
            className="min-w-0 max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zim-gold"
          >
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Product interest by confirmation status
              </caption>
              <thead>
                <tr>
                  {[
                    "Product",
                    "Historically confirmed unique",
                    "Pending confirmation",
                    "Expired",
                    "Confirmed / waiting",
                    "Cancelled",
                    "Notified",
                  ].map(h => (
                    <th key={h} className="p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.product_slug} className="border-t border-white/10">
                    {[
                      r.product_name,
                      r.confirmed_unique,
                      r.pending,
                      r.expired,
                      r.confirmed,
                      r.cancelled,
                      r.notified,
                    ].map((v: any, i: number) => (
                      <td key={i} className="p-3">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.rows.length && (
              <p className="p-3">No product interest in this date range.</p>
            )}
          </div>
          <h3 className="font-semibold">Recent delivery intents (all dates)</h3>
          <p className="text-sm text-slate-300">
            Sent means provider accepted, not inbox delivery. Failed deliveries
            use the existing Newsletter delivery queue and its bounded retry
            controls. Review uncertain acceptance before retrying.
          </p>
          <div className="space-y-2">
            {data.deliveries.map((r: any) => (
              <p
                key={r.id}
                className="break-words rounded-lg border border-white/10 p-3 text-sm"
              >
                #{r.id} · {r.product_name} · {r.kind} · {r.status} ·{" "}
                {r.attempts} attempts
                {r.error_message ? ` — ${r.error_message}` : ""}
              </p>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
