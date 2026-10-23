import { useAdminDraft } from "./useAdminDraft";
import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  productDetailsSchema,
  type ProductDetails,
} from "@shared/productDetails";
export default function ProductDetailsAdmin({
  products,
  onDirtyChange,
}: {
  products: { id: number; name: string }[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { setDirty, confirmDiscard } = useAdminDraft(onDirtyChange);
  const [photoText, setPhotoText] = useState(""),
    [sourceText, setSourceText] = useState("");
  const [id, setId] = useState(""),
    [details, setDetails] = useState<ProductDetails | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="mt-8 space-y-4 rounded-xl border border-white/20 p-5">
      <h2 className="text-xl font-semibold">Product information</h2>
      <p className="text-sm text-white/70">
        Add only verified details. These fields do not change product names,
        descriptions, prices, stock or the main image. Attach source links for
        claims. Sizes and variants are information; confirm the requested option
        before quoting.
      </p>
      <label className="block">
        Product
        <select
          aria-label="Product"
          value={id}
          disabled={busy}
          className="mt-2 block min-h-11 w-full bg-slate-900 p-3"
          onChange={async e => {
            if (!confirmDiscard()) return;
            setDirty(false);
            const next = e.target.value;
            setId(next);
            setDetails(null);
            setMessage("");
            if (!next) return;
            setBusy(true);
            try {
              const { data } = await api.get(
                `/admin/shop-products/${next}/details`
              );
              const value = productDetailsSchema.parse(data.details);
              setDetails(value);
              setPhotoText(value.photos.join("\n"));
              setSourceText(value.sources.join("\n"));
            } catch (err) {
              setMessage(getApiErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <option value="">Select product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {message && <p role="status">{message}</p>}
      {details && (
        <form
          className="grid gap-4 sm:grid-cols-2"
          onChangeCapture={() => setDirty(true)}
          onSubmit={async e => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setMessage("");
            try {
              await api.put(`/admin/shop-products/${id}/details`, {
                ...details,
                photos: photoText
                  .split(/\r?\n/)
                  .map(v => v.trim())
                  .filter(Boolean),
                sources: sourceText
                  .split(/\r?\n/)
                  .map(v => v.trim())
                  .filter(Boolean),
              });
              setMessage("Product information saved.");
              setDirty(false);
            } catch (err) {
              setMessage(getApiErrorMessage(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {Object.keys(productDetailsSchema.shape).map(key => (
            <label className="block text-sm" key={key}>
              {key.replace(/([A-Z])/g, " $1")}{" "}
              {key === "photos" || key === "sources"
                ? "(one HTTPS URL per line, up to 8)"
                : ""}
              <Textarea
                aria-label={
                  key.replace(/([A-Z])/g, " $1") +
                  (key === "photos" || key === "sources"
                    ? " (one HTTPS URL per line, up to 8)"
                    : "")
                }
                disabled={busy}
                maxLength={key === "photos" || key === "sources" ? 8000 : 2000}
                value={
                  key === "photos"
                    ? photoText
                    : key === "sources"
                      ? sourceText
                      : (details[key as keyof ProductDetails] as string)
                }
                onChange={e => {
                  if (key === "photos") setPhotoText(e.target.value);
                  else if (key === "sources") setSourceText(e.target.value);
                  else setDetails({ ...details, [key]: e.target.value });
                }}
              />
            </label>
          ))}
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save product information"}
          </Button>
        </form>
      )}
    </section>
  );
}
