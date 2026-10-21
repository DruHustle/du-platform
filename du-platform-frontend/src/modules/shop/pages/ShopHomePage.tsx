import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import Layout from "@/components/Layout";
import SubPageHero from "@/components/SubPageHero";
import {
  SHOP_CATEGORY_CONFIG,
  type ShopSegmentKey,
} from "@/lib/shopCategories";
import { useShopCart } from "../lib/useShopCart";
import { useShopCatalog } from "../lib/useShopCatalog";
import ProductCard from "../components/ProductCard";
import CatalogNotice from "../components/CatalogNotice";

const FEATURED_PRODUCT_BY_SEGMENT: Record<ShopSegmentKey, string> = {
  beverages: "mazoe-orange-2l-case-6",
  cereals: "cerevita-corn-banana-500g",
  sauces_spices: "cheeky-chilli-peri-peri-sauce-100ml",
  snacks: "colcom-pork-pie-100g",
  oils_spreads: "mama-dovi_750ml",
  proteins: "kariba-kapenta-matemba-100g",
  crafts: "shona-stone-sculpture",
  apparel: "sables-rugby-home-kit",
};

export default function Shop() {
  const { t } = useTranslation();
  const tx = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const { products, status, refresh } = useShopCatalog();
  const { cart, add, removeOne, itemCount } = useShopCart();
  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/shop/zimbabwe_shop_hero.webp",
        badge: tx("shop.hero.badge1", "Products from Zimbabwe"),
        badgeIcon: ShoppingBag,
        title: tx("shop.hero.title1", "Shop Zimbabwe"),
        subtitle: tx(
          "shop.hero.subtitle1",
          "Find familiar flavours and gifts. Build your basket, then request availability and delivery details."
        ),
      },
    ],
    [t]
  );

  return (
    <Layout>
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} />
      </section>
      <section
        id="collections"
        className="shop-collection-section bg-slate-950"
      >
        <div className="container mx-auto px-4 md:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <p className="page-eyebrow">{tx("nav.shop", "Shop")}</p>
              <h2 className="page-section-title">
                {tx(
                  "shop.collections_title",
                  "Zimbabwean favourites, in one place"
                )}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {tx(
                  "shop.collections_description",
                  "Find food, crafts and supporter apparel for your household or as a gift. Add items to your cart and send an order request. The team will confirm whether delivery to your destination can be arranged, along with availability and payment instructions."
                )}
              </p>
            </div>
            <Link
              href="/shop/products?category=all&cart=1"
              className="shop-cart-link"
            >
              <ShoppingBag className="h-4 w-4" />
              {tx("shop.products.cart.short_title", "Cart")}
              <span className="shop-cart-count" aria-live="polite">
                {itemCount}
              </span>
            </Link>
          </div>
          <CatalogNotice status={status} onRetry={() => void refresh()} />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            {SHOP_CATEGORY_CONFIG.map(category => {
              const product = products.find(
                p => p.slug === FEATURED_PRODUCT_BY_SEGMENT[category.key]
              );
              if (!product) return null;
              const quantity =
                cart.find(item => item.productId === product.id)?.quantity || 0;
              const categoryHref = `/shop/products?${new URLSearchParams({ category: category.baseCategory === "sports" || category.baseCategory === "crafts" ? category.baseCategory : "food", segment: category.key })}`;
              return (
                <ProductCard
                  key={category.key}
                  product={product}
                  quantity={quantity}
                  available={status === "ready"}
                  onAdd={() => add(product.id, product.stock_qty)}
                  onRemove={() => removeOne(product.id)}
                  category={tx(
                    `shop.categories.${category.key}.title`,
                    category.title
                  )}
                  priority={
                    category.key === "beverages" || category.key === "cereals"
                  }
                  footer={
                    <Link
                      href={categoryHref}
                      className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-slate-300 hover:text-zim-gold"
                    >
                      {tx("shop.discover_category", "Discover") +
                        " " +
                        tx(
                          `shop.categories.${category.key}.title`,
                          category.title
                        )}
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  }
                />
              );
            })}
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              href="/shop/products?category=all"
              className="shop-primary-link"
            >
              {tx("shop.explore_shop", "Browse all products")}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
