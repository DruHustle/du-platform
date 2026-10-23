import { useEffect, useRef, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { formatShopMoney } from "../lib/formatShopMoney";
export default function OrderStatus({
  orderRef,
  token,
  showEstimate = true,
}: {
  orderRef: string;
  token: string;
  showEstimate?: boolean;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const load = async () => {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.get(
        `/shop/orders/${encodeURIComponent(orderRef)}/workflow`,
        { headers: { "x-order-access-token": token }, signal: request.signal }
      );
      if (!request.signal.aborted) setStatus(data);
    } catch (e) {
      if (!request.signal.aborted) setError(getApiErrorMessage(e));
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  };
  useEffect(() => {
    setStatus(null);
    void load();
    return () => pending.current?.abort();
  }, [orderRef, token]);
  const quote = status?.quotes?.at(-1);
  return (
    <section
      className="mt-4 space-y-3 border-t border-white/20 pt-4"
      aria-label={t("pilot.request_status")}
    >
      <h3 className="font-semibold">{t("pilot.request_status")}</h3>
      {error && (
        <p role="alert" className="text-rose-300">
          {error}
        </p>
      )}
      {status && (
        <>
          <p role="status">{t(`pilot.stages.${status.stage}`)}</p>
          <p>
            {t(
              `pilot.next.${status.paymentReviewRequired ? "payment_review" : status.quoteExpired && status.stage === "quote_sent" ? "expired" : status.stage}`
            )}
          </p>
          {status.customerNotes && (
            <p className="whitespace-pre-wrap break-words text-sm text-white/80">
              {status.customerNotes}
            </p>
          )}
          {showEstimate && status.estimate && (
            <details
              open={
                status.stage === "request_received" ||
                status.stage === "under_review"
              }
              className="rounded-xl border border-white/20 p-3"
            >
              <summary className="cursor-pointer">
                {t("shop.products.order.request_total")}
              </summary>
              {status.requestedItems?.map((item: any, i: number) => (
                <div key={i} className="my-2">
                  <p>
                    {item.name} × {item.quantity} ·{" "}
                    {formatShopMoney(
                      item.unitPriceCents * item.quantity,
                      status.estimate.currency
                    )}
                  </p>
                  {item.description && (
                    <p className="text-sm text-white/65">{item.description}</p>
                  )}
                </div>
              ))}
              <p>
                {t("shop.products.order.request_total")}:{" "}
                {formatShopMoney(
                  status.estimate.totalCents,
                  status.estimate.currency
                )}
              </p>
            </details>
          )}
          {quote && (
            <div className="space-y-2 rounded-lg border border-zim-gold/40 p-3">
              <h4>
                {t("pilot.final_quote")} · {quote.version}
              </h4>
              {quote.items.map((item: any) => (
                <p key={item.productId}>
                  {item.productName} × {item.quantity} ·{" "}
                  {formatShopMoney(item.lineTotalCents, quote.currency)}
                </p>
              ))}
              <p>
                {t("pilot.delivery_charge")}:{" "}
                {formatShopMoney(quote.shipping_cents, quote.currency)}
              </p>
              <p className="font-semibold">
                {t("pilot.total")}:{" "}
                {formatShopMoney(quote.total_cents, quote.currency)}
              </p>
              <p>
                {t("pilot.valid_until")}:{" "}
                {new Date(quote.valid_until).toLocaleString()}
              </p>
              {status.stage === "quote_sent" && !status.quoteExpired && (
                <Button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      const { data } = await api.post(
                        `/shop/orders/${encodeURIComponent(orderRef)}/accept-quote`,
                        {
                          version: status.version,
                          requestId: crypto.randomUUID(),
                        },
                        { headers: { "x-order-access-token": token } }
                      );
                      setStatus(data);
                    } catch (e) {
                      setError(getApiErrorMessage(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("pilot.accept_quote")}
                </Button>
              )}
            </div>
          )}
          {status.tracking && (
            <p>
              {status.carrier}: {status.tracking}
            </p>
          )}
          {status.refundCents > 0 && (
            <p>
              {t("pilot.refund_recorded")}:{" "}
              {formatShopMoney(status.refundCents, quote?.currency)}
            </p>
          )}
          {status.history?.map((item: any, i: number) => (
            <p key={i} className="text-sm text-white/75">
              {new Date(item.created_at).toLocaleString()}:{" "}
              {t(`pilot.stages.${item.action}`, {
                defaultValue:
                  item.action === "refund"
                    ? t("pilot.refund_recorded")
                    : t("pilot.request_status"),
              })}{" "}
              {item.public_message}
            </p>
          ))}
        </>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy ? t("pilot.loading") : t("pilot.refresh_status")}
      </Button>
      <p className="text-xs text-white/65">{t("pilot.private_receipt")}</p>
    </section>
  );
}
