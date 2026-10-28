import { Link } from "wouter";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { customerLanguage } from "@/contracts/customerLanguage";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ShopProduct } from "../lib/useShopCatalog";
export default function ProductInterest({
  product,
}: {
  product: Pick<ShopProduct, "id" | "slug" | "name">;
}) {
  const { t, i18n } = useTranslation(),
    id = useId();
  const [open, setOpen] = useState(false),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Portal events still bubble through a containing checkout form.
    event.stopPropagation();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("product_interest.invalid_email"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/shop/restock-notifications", {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        email: email.trim().toLowerCase(),
        language: customerLanguage(i18n.resolvedLanguage || i18n.language),
      });
      setDone(true);
    } catch {
      setError(t("product_interest.error"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        data-product-interest={product.slug}
        onClick={() => {
          setOpen(true);
          setDone(false);
          setError("");
        }}
        className="relative z-20 min-h-11 w-full whitespace-normal rounded-full bg-zim-gold px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-yellow-300"
      >
        {t("product_interest.action")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-white/15 bg-slate-950 text-white sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              {t("product_interest.action")}: {product.name}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {t("product_interest.scope")}{" "}
              <Link href="/privacy-policy" className="underline">
                {t("privacy_policy")}
              </Link>
            </DialogDescription>
          </DialogHeader>
          {done ? (
            <p role="status" className="text-emerald-200">
              {t("product_interest.received")}
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <label htmlFor={id} className="block text-sm">
                {t("product_interest.email")}
              </label>
              <Input
                id={id}
                type="email"
                autoComplete="email"
                maxLength={255}
                value={email}
                onChange={e => setEmail(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                className="border-white/20 bg-white/5 text-white"
              />
              {error && (
                <p id={`${id}-error`} role="alert" className="text-rose-200">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={busy}
                className="min-h-11 w-full whitespace-normal bg-zim-gold text-black"
              >
                {t(
                  busy ? "product_interest.updating" : "product_interest.submit"
                )}
              </Button>
            </form>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="min-h-11 border-white/20 bg-transparent text-white"
            >
              {t("product_interest.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
