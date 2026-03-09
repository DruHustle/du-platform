import { useTranslation } from "react-i18next";
import { useShopProducts } from '../hooks/useShopProducts';

export default function ShopGrid() {
  const { t } = useTranslation();
  const { products, loading } = useShopProducts();

  if (loading) return <p className="text-sm text-white/70">{t("shop.loading", { defaultValue: "Loading products..." })}</p>;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product: any) => (
        <article key={String(product.id ?? product.slug)} className="module-card p-3">
          <h4 className="text-sm font-black text-white">{String(product.name ?? product.slug ?? t("shop.product", { defaultValue: "Product" }))}</h4>
          <p className="mt-1 text-xs text-white/70">{String(product.description ?? t("shop.no_description", { defaultValue: "No description" }))}</p>
        </article>
      ))}
    </div>
  );
}
