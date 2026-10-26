import ProductInterest from "../components/ProductInterest";
import { canRequestProduct } from "../lib/useShopCatalog";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import Layout from "@/components/Layout";
import { useShopCatalog } from "../lib/useShopCatalog";
import { useShopCart } from "../lib/useShopCart";
import { useShopCurrency } from "../lib/useShopCurrency";
import { convertShopCents } from "@shared/shopCurrency";
import { formatShopMoney } from "../lib/formatShopMoney";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
import QuantityControl from "../components/QuantityControl";
import CatalogNotice from "../components/CatalogNotice";
import PilotReadinessNotice from "../components/PilotReadinessNotice";
import {
  productDetailsSchema,
  type ProductDetails,
} from "@shared/productDetails";
export default function ProductPage() {
  const [, params] = useRoute("/shop/product/:slug");
  const { products, status, refresh, readiness } = useShopCatalog();
  const product = products.find(p => p.slug === params?.slug);
  const { cart, add, removeOne } = useShopCart();
  const { currency } = useShopCurrency();
  const { t } = useTranslation();
  const [information, setInformation] = useState<{
    id: number;
    state: "loading" | "ready" | "failed" | "unavailable";
    details?: ProductDetails;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const details =
    information?.id === product?.id ? information?.details : undefined;
  const informationState =
    information?.id === product?.id ? information?.state : "loading";
  useEffect(() => {
    const c = new AbortController();
    if (product && status === "ready") {
      const id = product.id;
      setInformation({ id, state: "loading" });
      api
        .get(`/shop/products/${id}/details`, { signal: c.signal })
        .then(({ data }) => {
          if (!c.signal.aborted)
            setInformation({
              id,
              state: "ready",
              details: productDetailsSchema.parse(data.details),
            });
        })
        .catch(error => {
          if (!c.signal.aborted)
            setInformation({
              id,
              state: error?.response?.status === 404 ? "unavailable" : "failed",
            });
        });
    }
    return () => c.abort();
  }, [product?.id, status, attempt]);
  useEffect(() => {
    if (status !== "ready") return;
    if (product && informationState !== "unavailable") {
      document
        .querySelector('meta[name="robots"]')
        ?.setAttribute("content", "index,follow");
      document.title = `${product.name} | Shop | Diaspora Unlocked`;
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", product.description);
    } else
      document
        .querySelector('meta[name="robots"]')
        ?.setAttribute("content", "noindex,follow");
  }, [product, status, informationState]);
  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950 text-white">
        <div className="container space-y-6">
          <Link href="/shop/products" className="text-zim-gold underline">
            {t("pilot.browse_products")}
          </Link>
          <CatalogNotice status={status} onRetry={() => void refresh()} />
          {product && informationState !== "unavailable" ? (
            <>
              <div className="grid gap-8 md:grid-cols-2">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="aspect-square max-h-[32rem] w-full rounded-2xl bg-white/5 object-contain p-5"
                />
                <div className="space-y-5">
                  <h1 className="page-title">{product.name}</h1>
                  <p>{product.description}</p>
                  <p className="text-xl font-semibold">
                    {formatShopMoney(
                      convertShopCents(
                        product.price_cents,
                        product.currency,
                        currency
                      ),
                      currency
                    )}
                    <span className="ml-2 text-sm font-normal text-white/65">
                      {t("product_interest.indicative_price")}
                    </span>
                  </p>
                  <p>
                    {t(
                      canRequestProduct(readiness, product)
                        ? "pilot.available_now"
                        : "shop.products.stock.out"
                    )}
                  </p>
                  <PilotReadinessNotice />
                  {canRequestProduct(readiness, product) ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <QuantityControl
                        name={product.name}
                        quantity={
                          cart.find(i => i.productId === product.id)
                            ?.quantity || 0
                        }
                        limit={product.stock_qty}
                        disabled={status !== "ready"}
                        onAdd={() => add(product.id, product.stock_qty)}
                        onRemove={() => removeOne(product.id)}
                      />
                      <Link
                        className="inline-flex min-h-11 items-center rounded-full bg-zim-gold px-5 font-semibold text-black"
                        href="/shop/products?cart=1"
                      >
                        {t("shop.products.actions.checkout")}
                      </Link>
                    </div>
                  ) : (
                    <div id="interest" className="max-w-sm scroll-mt-28">
                      <ProductInterest product={product} />
                    </div>
                  )}
                  {canRequestProduct(readiness, product) && (
                    <p className="text-sm text-white/65">
                      {t("product_interest.quote_note")}
                    </p>
                  )}
                </div>
              </div>
              <h2 className="text-2xl font-semibold">
                {t("pilot.product_details")}
              </h2>
              {informationState === "loading" ? (
                <p role="status">{t("pilot.details_loading")}</p>
              ) : informationState === "failed" ? (
                <div role="alert" className="space-y-3">
                  <p>{t("pilot.details_failed")}</p>
                  <button
                    type="button"
                    className="min-h-11 text-zim-gold underline"
                    onClick={() => setAttempt(n => n + 1)}
                  >
                    {t("pilot.details_retry")}
                  </button>
                </div>
              ) : !details ||
                !Object.values(details).some(v =>
                  Array.isArray(v) ? v.length : v
                ) ? (
                <p>{t("pilot.missing_details")}</p>
              ) : (
                <dl className="grid gap-5 sm:grid-cols-2">
                  {Object.entries(details)
                    .filter(([, v]) => (Array.isArray(v) ? v.length : v))
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-white/15 p-4"
                      >
                        <dt className="font-semibold">
                          {t(`pilot.details.${key}`)}
                        </dt>
                        <dd className="mt-2 whitespace-pre-wrap break-words text-white/75">
                          {Array.isArray(value)
                            ? value.map((url: string) =>
                                key === "photos" ? (
                                  <img
                                    key={url}
                                    src={url}
                                    alt={product.name}
                                    loading="lazy"
                                    className="my-3 max-h-80 w-full object-contain"
                                  />
                                ) : (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block underline"
                                  >
                                    {url}
                                  </a>
                                )
                              )
                            : value}
                        </dd>
                      </div>
                    ))}
                </dl>
              )}
            </>
          ) : status === "ready" ? (
            <h1 className="page-title">{t("pilot.product_unavailable")}</h1>
          ) : null}
        </div>
      </section>
    </Layout>
  );
}
