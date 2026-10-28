import { NativeSelect } from "@/components/ui/native-select";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, getApiErrorMessage } from "@/lib/api";
import { refreshShopCatalog } from "@/modules/shop/lib/useShopCatalog";
import { formatShopMoney } from "@/modules/shop/lib/formatShopMoney";
import { SHOP_CURRENCIES } from "@/contracts/shopCurrency";

export type AdminShopProduct = {
  id: number;
  slug: string;
  name: string;
  category: "sports" | "crafts" | "food" | "beverage";
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  stock_qty: number;
  is_active: 0 | 1;
};
const empty = () => ({
  slug: "",
  name: "",
  category: "food",
  description: "",
  image_url: "",
  price: "",
  currency: "EUR",
  stock_qty: "0",
  is_active: false,
});
const slugify = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);

export default function ShopAdmin({
  rows,
  onSaved,
  onDirtyChange,
}: {
  rows: AdminShopProduct[];
  onSaved: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  const reset = () => {
    setForm(empty());
    setEditing(null);
    setDirty(false);
  };
  const change = (
    key: keyof ReturnType<typeof empty>,
    value: string | boolean
  ) => {
    setForm(previous => ({
      ...previous,
      [key]: value,
      ...(key === "name" &&
      !editing &&
      (!previous.slug || previous.slug === slugify(previous.name))
        ? { slug: slugify(String(value)) }
        : {}),
    }));
    setDirty(true);
    setMessage("");
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const priceCents = Math.round(Number(form.price) * 100);
    if (
      !/^\d+(\.\d{1,2})?$/.test(form.price) ||
      !Number.isSafeInteger(priceCents) ||
      priceCents <= 0
    ) {
      setError(t("admin.shop.invalid_price"));
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { price: _, ...fields } = form;
      const payload = {
        ...fields,
        price_cents: priceCents,
        stock_qty: Number(form.stock_qty),
        is_active: form.is_active ? 1 : 0,
      };
      if (editing) await api.put(`/admin/shop-products/${editing}`, payload);
      else await api.post("/admin/shop-products", payload);
      reset();
      setMessage(t("admin.shop.saved"));
      await Promise.all([onSaved(), refreshShopCatalog(true)]);
    } catch (err) {
      setError(getApiErrorMessage(err, t("admin.errors.save_shop")));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const discard = () => !dirty || window.confirm(t("admin.shop.discard"));
  const edit = (row: AdminShopProduct) => {
    if (busy || !discard()) return;
    setEditing(row.id);
    setForm({
      ...row,
      price: (row.price_cents / 100).toFixed(2),
      stock_qty: String(row.stock_qty),
      is_active: row.is_active === 1,
    });
    setDirty(false);
    setError("");
    setMessage("");
    formRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    formRef.current
      ?.querySelector<HTMLInputElement>("#admin-product-name")
      ?.focus({ preventScroll: true });
  };
  const remove = async (row: AdminShopProduct) => {
    if (
      submitting.current ||
      !window.confirm(t("admin.shop.confirm_delete", { name: row.name }))
    )
      return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/shop-products/${row.id}`);
      if (editing === row.id) reset();
      setMessage(t("admin.shop.deleted"));
      await Promise.all([onSaved(), refreshShopCatalog(true)]);
    } catch (err) {
      setError(getApiErrorMessage(err, t("admin.errors.delete_shop")));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  const inputClass = "bg-slate-900 border-slate-600 text-white min-h-11";
  const fields = [
    { key: "name", label: "name_placeholder", maxLength: 255 },
    {
      key: "slug",
      label: "slug_placeholder",
      maxLength: 160,
      pattern: "[a-z0-9][a-z0-9_-]*",
    },
    { key: "image_url", label: "image_placeholder", maxLength: 500 },
  ] as const;
  return (
    <div className="space-y-6 min-w-0">
      <form
        ref={formRef}
        onSubmit={event => void save(event)}
        className="surface-card scroll-mt-28 p-4 sm:p-7 space-y-5"
        aria-label={t("admin.tabs.shop")}
      >
        <div>
          <h2 className="text-xl font-semibold text-white">
            {t(
              editing ? "admin.shop.update_product" : "admin.shop.add_product"
            )}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {t("admin.shop.help")}
          </p>
        </div>
        <fieldset disabled={busy} className="space-y-5 min-w-0">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(field => (
              <div
                className={
                  field.key === "image_url"
                    ? "sm:col-span-2 space-y-2"
                    : "space-y-2"
                }
                key={field.key}
              >
                <Label
                  htmlFor={`admin-product-${field.key === "name" ? "name" : field.key}`}
                >
                  {t(`admin.shop.${field.label}`)}
                </Label>
                <Input
                  id={`admin-product-${field.key}`}
                  required
                  value={form[field.key]}
                  maxLength={field.maxLength}
                  pattern={"pattern" in field ? field.pattern : undefined}
                  className={inputClass}
                  onChange={event => change(field.key, event.target.value)}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="admin-product-category">
                {t("admin.shop.category_label")}
              </Label>
              <NativeSelect
                id="admin-product-category"
                value={form.category}
                onChange={event => change("category", event.target.value)}
                className={`${inputClass} w-full rounded-md border px-3`}
              >
                {["sports", "crafts", "food", "beverage"].map(category => (
                  <option key={category} value={category}>
                    {t(`admin.shop.categories.${category}`)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-product-currency">
                {t("admin.shop.currency_placeholder")}
              </Label>
              <NativeSelect
                id="admin-product-currency"
                className={`${inputClass} w-full rounded-md border px-3`}
                value={form.currency}
                onChange={event => change("currency", event.target.value)}
              >
                {SHOP_CURRENCIES.map(currency => (
                  <option key={currency}>{currency}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-product-price">
                {t("admin.shop.price_label", { currency: form.currency })}
              </Label>
              <Input
                id="admin-product-price"
                type="number"
                inputMode="decimal"
                required
                min="0.01"
                max="21474836.47"
                step="0.01"
                placeholder="4.99"
                value={form.price}
                onChange={event => change("price", event.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-product-stock">
                {t("admin.shop.stock_placeholder")}
              </Label>
              <Input
                id="admin-product-stock"
                type="number"
                inputMode="numeric"
                required
                min="0"
                max="2147483647"
                step="1"
                value={form.stock_qty}
                onChange={event => change("stock_qty", event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-product-description">
              {t("admin.shop.description_placeholder")}
            </Label>
            <Textarea
              id="admin-product-description"
              value={form.description}
              maxLength={10000}
              required
              onChange={event => change("description", event.target.value)}
              className={`${inputClass} min-h-28`}
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm text-white">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={event => change("is_active", event.target.checked)}
              className="h-5 w-5 accent-yellow-400"
            />
            {t("admin.shop.display_label")}
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              className="min-h-11 bg-zim-gold text-slate-950 hover:bg-yellow-300"
            >
              {t(
                busy
                  ? "admin.shop.saving"
                  : editing
                    ? "admin.shop.update_product"
                    : "admin.shop.add_product"
              )}
            </Button>
            {(editing || dirty) && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  if (discard()) reset();
                }}
              >
                {t("admin.shop.cancel_edit")}
              </Button>
            )}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="break-words text-sm text-rose-300">
            {error}
          </p>
        )}
        <p role="status" className="text-sm text-emerald-300">
          {message}
        </p>
      </form>
      <div className="space-y-2">
        <Label htmlFor="admin-product-search">{t("admin.shop.search")}</Label>
        <Input
          id="admin-product-search"
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          className={inputClass}
        />
      </div>
      <div className="grid gap-3">
        {rows
          .filter(row =>
            `${row.name} ${row.slug}`
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map(row => (
            <article
              key={row.id}
              className="surface-card min-w-0 p-4 sm:p-5 text-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1 basis-48">
                  <h3 className="!text-base !leading-6 !font-semibold break-words">
                    {row.name}
                  </h3>
                  <p className="mt-1 break-all text-xs text-slate-400">
                    {row.slug}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {formatShopMoney(row.price_cents, row.currency)} ·{" "}
                    {t("admin.shop.stock_label")}: {row.stock_qty} ·{" "}
                    {t(
                      row.is_active
                        ? "admin.shop.badge_display"
                        : "admin.shop.badge_hide"
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => edit(row)}
                    aria-label={`${t("admin.shop.edit")} ${row.name}`}
                  >
                    {t("admin.shop.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void remove(row)}
                    aria-label={`${t("admin.shop.delete")} ${row.name}`}
                    className="text-rose-300 border-rose-400/40"
                  >
                    {t("admin.shop.delete")}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        {rows.length === 0 && (
          <p className="text-slate-300">{t("admin.shop.empty")}</p>
        )}
      </div>
    </div>
  );
}
