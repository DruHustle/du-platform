import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import InstantImage from "@/components/InstantImage";
import type { ShopProduct } from "../lib/useShopCatalog";
import { formatShopMoney } from "../lib/formatShopMoney";
import QuantityControl from "./QuantityControl";

type Props = {
  product: ShopProduct;
  quantity: number;
  available: boolean;
  onAdd: () => void;
  onRemove: () => void;
  category?: string;
  description?: string;
  priority?: boolean;
  footer?: ReactNode;
};
export default function ProductCard({
  product,
  quantity,
  available,
  onAdd,
  onRemove,
  category,
  description,
  priority,
  footer,
}: Props) {
  const { t } = useTranslation();
  const canAdd = available && product.stock_qty > quantity;
  return (
    <article
      data-shop-product-card={product.slug}
      data-stock-state={
        !available ? "unknown" : product.stock_qty > 0 ? "in" : "out"
      }
      className="shop-product-card"
    >
      <button
        type="button"
        disabled={!canAdd}
        onClick={onAdd}
        aria-label={t("shop.cart_controls.add_item", {
          name: product.name,
          defaultValue: "Add {{name}} to cart",
        })}
        className="shop-card-add-target"
      />
      <div className="shop-product-image">
        <InstantImage
          src={product.image_url}
          alt={product.name}
          priority={priority}
          wrapperClassName="h-full w-full !bg-transparent"
          className="h-full w-full object-contain p-3 md:p-6"
          onError={event => {
            event.currentTarget.onerror = null;
            event.currentTarget.src =
              "/images/pages/shop/zimbabwe_shop_hero.webp";
          }}
        />
        {available && product.stock_qty === 0 && (
          <span className="shop-stock-label">
            {t("shop.products.stock.out", { defaultValue: "Out of Stock" })}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        {category && (
          <p className="mb-2 text-[11px] font-medium text-slate-400">
            {category}
          </p>
        )}
        <h3 className="shop-product-name">{product.name}</h3>
        {description && (
          <p className="mt-2 text-xs leading-6 text-slate-400">{description}</p>
        )}
        <div className="mt-auto pt-4">
          <p className="mb-3 text-sm font-semibold text-white tabular-nums">
            {formatShopMoney(product.price_cents, product.currency)}
          </p>
          <div className="relative z-20 flex justify-end">
            <QuantityControl
              name={product.name}
              quantity={quantity}
              limit={product.stock_qty}
              disabled={!available}
              onAdd={onAdd}
              onRemove={onRemove}
            />
          </div>
          {footer && <div className="relative z-20 mt-3">{footer}</div>}
        </div>
      </div>
    </article>
  );
}
