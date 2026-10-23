import { useAdminDraft } from "./useAdminDraft";
import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_STAGES,
  permittedOrderTransition,
  type OrderStage,
} from "@shared/orderWorkflow";
import { formatShopMoney } from "@/modules/shop/lib/formatShopMoney";

export default function OrderAdmin({
  onDirtyChange,
}: {
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { setDirty, confirmDiscard } = useAdminDraft(onDirtyChange);
  const [rows, setRows] = useState<any[]>([]),
    [detail, setDetail] = useState<any>(null),
    [q, setQ] = useState(""),
    [stage, setStage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [action, setAction] = useState("note"),
    [note, setNote] = useState(""),
    [publicMessage, setPublicMessage] = useState("");
  const load = async () => {
    try {
      const { data } = await api.get("/admin/orders", { params: { q, stage } });
      setRows(data.orders);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  };
  useEffect(() => {
    void load();
    void api
      .get("/admin/orders/funnel")
      .then(({ data }) => setMetrics(data.rows))
      .catch(() => {});
  }, []);
  const open = async (ref: string) => {
    if (!confirmDiscard()) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get(
        `/admin/orders/${encodeURIComponent(ref)}`
      );
      setDetail(data);
      setDirty(false);
      setAction("note");
      setNote("");
      setPublicMessage("");
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const command = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const payload: any = {
        requestId: crypto.randomUUID(),
        version: detail.state.version,
        action,
        note,
        publicMessage,
      };
      if (action === "assign") payload.assignedTo = fields.get("assignedTo");
      if (action === "quote_sent")
        payload.quote = {
          currency: fields.get("currency"),
          shippingCents: Math.round(Number(fields.get("shipping")) * 100),
          validUntil: new Date(String(fields.get("validUntil"))).toISOString(),
          unitPrices: detail.items.map((_: any, i: number) =>
            Math.round(Number(fields.get(`price${i}`)) * 100)
          ),
        };
      if (action === "payment_confirmed" || action === "payment_issue")
        payload.paymentReference = fields.get("paymentReference");
      if (action === "dispatched") {
        payload.carrier = fields.get("carrier");
        payload.tracking = fields.get("tracking");
      }
      if (action === "cancelled")
        payload.restock = fields.get("restock") === "yes";
      if (action === "refund") {
        payload.refundCents = Math.round(Number(fields.get("refund")) * 100);
        payload.refundReference = fields.get("refundReference");
      }
      const { data } = await api.post(
        `/admin/orders/${encodeURIComponent(detail.order.order_ref)}/commands`,
        payload
      );
      setDetail(data);
      setDirty(false);
      setNote("");
      setPublicMessage("");
      setAction("note");
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-5" aria-label="Order management">
      <h2 className="text-2xl font-semibold">Assisted orders</h2>
      <details className="rounded-xl border border-white/15 p-4">
        <summary className="cursor-pointer">
          Consented funnel totals (last 30 days)
        </summary>
        <p className="my-3 text-sm text-white/65">
          Anonymous daily totals only. Successful request creation and quote /
          delivery transitions are counted by the server. Issued quote revisions
          count separately. No customer identifiers are recorded.
        </p>
        <ul>
          {[
            "product_discovery",
            "basket_add",
            "request_saved",
            "quote_sent",
            "fulfilled",
          ].map(event => (
            <li key={event}>
              {event.replaceAll("_", " ")}:{" "}
              {metrics
                .filter(row => row.event === event)
                .reduce((sum, row) => sum + Number(row.count), 0)}
            </li>
          ))}
        </ul>
      </details>
      <p className="text-sm text-white/75">
        Enquiries do not reserve stock. Final quotes are separate from request
        estimates. Payment confirmation consumes stock atomically. Record only
        payments and refunds actually received or made.
      </p>
      <form
        onSubmit={e => {
          e.preventDefault();
          void load();
        }}
        className="flex flex-wrap gap-3"
      >
        <label className="flex-1">
          Search requests
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Reference, name or email"
          />
        </label>
        <label>
          Status
          <select
            className="block min-h-11 rounded border border-white/20 bg-slate-900 p-2"
            value={stage}
            onChange={e => setStage(e.target.value)}
          >
            <option value="">All stages</option>
            {ORDER_STAGES.map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <Button type="submit" className="self-end" disabled={busy}>
          Search
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-rose-300">
          {error}
        </p>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(15rem,1fr)_minmax(0,2fr)]">
        <div className="space-y-2">
          {rows.length === 0 && <p>No matching requests.</p>}
          {rows.map(row => (
            <button
              disabled={busy}
              onClick={() => void open(row.order_ref)}
              key={row.order_ref}
              className="block w-full rounded-xl border border-white/20 p-4 text-left hover:border-zim-gold focus-visible:ring-2 focus-visible:ring-zim-gold"
            >
              <strong className="break-all">{row.order_ref}</strong>
              <span className="block">
                {row.customer_name} · {row.stage.replaceAll("_", " ")}
              </span>
              <span className="block text-sm text-white/60">
                {row.assigned_to || "Unassigned"}
              </span>
            </button>
          ))}
        </div>
        {detail && (
          <div className="min-w-0 space-y-5 rounded-2xl border border-white/15 p-4 sm:p-6">
            <h3 className="break-all text-xl">{detail.order.order_ref}</h3>
            <p>
              {detail.order.customer_name} ·{" "}
              <a
                href={`mailto:${detail.order.customer_email}`}
                className="underline"
              >
                {detail.order.customer_email}
              </a>
            </p>
            <p>
              {detail.order.shipping_address}, {detail.order.shipping_city},{" "}
              {detail.state.postal_code}, {detail.order.shipping_country}
            </p>
            <p className="font-semibold">
              {detail.state.stage.replaceAll("_", " ")}
            </p>
            <p>
              {detail.state.paymentReviewRequired
                ? "Payment received; stock needs review. Resolve availability or record cancellation/refund. Do not request payment again."
                : detail.state.nextAction}
            </p>
            <p className="whitespace-pre-wrap">{detail.state.customer_notes}</p>
            <h4 className="font-semibold">Original enquiry estimate</h4>
            {detail.items.map((item: any) => (
              <p key={item.id}>
                {item.product_name} × {item.quantity} ·{" "}
                {formatShopMoney(item.line_total_cents, detail.order.currency)}
                <span className="block text-sm text-white/65">
                  Current stock: {item.current_stock ?? "unavailable"}
                  {item.currently_published ? "" : " · hidden"}
                </span>
              </p>
            ))}
            <p>
              Delivery allowance:{" "}
              {formatShopMoney(
                detail.order.shipping_cents,
                detail.order.currency
              )}{" "}
              · Total:{" "}
              {formatShopMoney(detail.order.total_cents, detail.order.currency)}
            </p>
            {detail.snapshots?.map((item: any) => (
              <p key={item.productId} className="text-sm text-white/65">
                {item.name}: {item.description}
              </p>
            ))}
            <h4 className="font-semibold">Final quote history</h4>
            {detail.quotes.length === 0 ? (
              <p>No final quote issued.</p>
            ) : (
              detail.quotes.map((quote: any) => (
                <div className="rounded-xl bg-white/5 p-3" key={quote.version}>
                  <strong>
                    Version {quote.version}:{" "}
                    {formatShopMoney(quote.total_cents, quote.currency)}
                  </strong>
                  <p>
                    Delivery:{" "}
                    {formatShopMoney(quote.shipping_cents, quote.currency)} ·
                    Valid until {new Date(quote.valid_until).toLocaleString()}{" "}
                    {quote.expired ? "(expired)" : ""}
                  </p>
                  {quote.items.map((item: any) => (
                    <p key={item.productId}>
                      {item.productName} × {item.quantity}:{" "}
                      {formatShopMoney(item.lineTotalCents, quote.currency)}
                    </p>
                  ))}
                </div>
              ))
            )}
            <form
              onChangeCapture={() => setDirty(true)}
              onSubmit={command}
              key={`${detail.order.order_ref}-${detail.state.version}`}
              className="space-y-4"
            >
              <label className="block">
                Action
                <select
                  aria-label="Action"
                  value={action}
                  onChange={e => setAction(e.target.value)}
                  className="mt-1 block min-h-11 w-full rounded border border-white/20 bg-slate-900 p-2"
                >
                  <option value="note">Add internal note</option>
                  <option value="assign">Assign operator</option>
                  {detail.state.stage === "quote_accepted" &&
                  !detail.state.payment_reference ? (
                    <option value="payment_issue">
                      Record received payment requiring stock review
                    </option>
                  ) : null}
                  {detail.state.inventory_consumed &&
                  ["cancelled", "dispatched", "delivered"].includes(
                    detail.state.stage
                  ) ? (
                    <option value="restock_return">
                      Restock checked returned goods (entire order)
                    </option>
                  ) : null}
                  {ORDER_STAGES.filter(s =>
                    permittedOrderTransition(
                      detail.state.stage as OrderStage,
                      s
                    )
                  ).map(s => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                  {detail.state.payment_reference && (
                    <option value="refund">Record refund</option>
                  )}
                </select>
              </label>
              {action === "assign" && (
                <label className="block">
                  Operator email
                  <Input
                    required
                    type="email"
                    name="assignedTo"
                    defaultValue={detail.state.assigned_to}
                  />
                </label>
              )}
              {action === "quote_sent" && (
                <fieldset className="space-y-3">
                  <legend>Final quote (major currency units)</legend>
                  <label>
                    Currency
                    <select
                      name="currency"
                      className="mx-3 min-h-11 bg-slate-900"
                      defaultValue={detail.order.currency}
                    >
                      {["EUR", "USD", "ZAR"].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                  {detail.items.map((item: any, i: number) => (
                    <label className="block" key={item.id}>
                      Unit price: {item.product_name} (quantity {item.quantity})
                      <Input
                        type="number"
                        name={`price${i}`}
                        required
                        min="0"
                        step="0.01"
                        defaultValue={(item.unit_price_cents / 100).toFixed(2)}
                      />
                    </label>
                  ))}
                  <label className="block">
                    Confirmed delivery charge
                    <Input
                      name="shipping"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                    />
                  </label>
                  <label className="block">
                    Valid until (local time)
                    <Input name="validUntil" type="datetime-local" required />
                  </label>
                </fieldset>
              )}
              {(action === "payment_confirmed" ||
                action === "payment_issue") && (
                <label className="block">
                  Received payment reference
                  <Input name="paymentReference" required maxLength={255} />
                </label>
              )}
              {action === "dispatched" && (
                <>
                  <label className="block">
                    Carrier
                    <Input
                      name="carrier"
                      required
                      maxLength={120}
                      defaultValue="DHL"
                    />
                  </label>
                  <label className="block">
                    Tracking reference
                    <Input name="tracking" required maxLength={255} />
                  </label>
                </>
              )}
              {action === "cancelled" && (
                <label className="block">
                  Stock decision
                  <select
                    name="restock"
                    className="block min-h-11 bg-slate-900"
                    required
                  >
                    <option value="no">
                      Do not return goods to available stock
                    </option>
                    <option value="yes">
                      Goods can return to available stock
                    </option>
                  </select>
                </label>
              )}
              {action === "refund" && (
                <>
                  <label className="block">
                    Actual refund amount
                    <Input
                      name="refund"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </label>
                  <label className="block">
                    Refund reference
                    <Input name="refundReference" required maxLength={255} />
                  </label>
                </>
              )}
              <label className="block">
                Internal note
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  required={
                    action === "note" ||
                    action === "cancelled" ||
                    action === "restock_return" ||
                    action === "payment_issue"
                  }
                  maxLength={4000}
                />
              </label>
              <label className="block">
                Customer-visible message (optional)
                <Textarea
                  value={publicMessage}
                  onChange={e => setPublicMessage(e.target.value)}
                  maxLength={1000}
                />
              </label>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save action"}
              </Button>
            </form>
            <h4 className="font-semibold">Audit history</h4>
            {detail.history.map((e: any) => (
              <div
                key={e.id}
                className="break-words border-t border-white/10 py-3 text-sm"
              >
                <p>
                  {new Date(e.created_at).toLocaleString()} · {e.actor} ·{" "}
                  {e.action}
                </p>
                <p>{e.note}</p>
                {e.public_message && <p>Customer: {e.public_message}</p>}
              </div>
            ))}
            <h4 className="font-semibold">Email delivery</h4>
            <p className="text-sm text-white/65">
              Sent means accepted by the provider, not confirmed inbox delivery.
              Uncertain retries stop before the provider’s idempotency window
              expires.
            </p>
            {detail.notifications.map((n: any) => (
              <div key={n.id} className="rounded border border-white/10 p-3">
                <p>
                  {n.event_key}: {n.status} ({n.attempts} attempts)
                </p>
                {n.error_message && (
                  <p className="text-rose-300">{n.error_message}</p>
                )}
                {n.status === "failed" && (
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api.post(
                          `/admin/orders/${detail.order.order_ref}/notifications/${n.id}/retry`
                        );
                        await open(detail.order.order_ref);
                      } catch (e) {
                        setError(getApiErrorMessage(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Retry safely
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
