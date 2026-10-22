import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, ShoppingBag } from "lucide-react";
import Layout from "@/components/Layout";
import DiscoveryHero from "@/components/discovery/DiscoveryHero";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import { Button } from "@/components/ui/button";
import SwipeRail from "@/components/discovery/SwipeRail";
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

  return (
    <Layout>
      <div className="shop-landing">
        <DiscoveryHero
          eyebrow={t("shop.landing.eyebrow")}
          title={t("shop.landing.title")}
          highlight={t("shop.landing.highlight")}
          description={t("shop.landing.description")}
          principle={t("shop.landing.principle")}
          image="/images/pages/shop/zimbabwe_shop_hero.webp"
          imageAlt={t("home.tiles.shop.image_alt")}
          caption={t("shop.landing.caption")}
        >
          <Button
            asChild
            className="h-auto min-h-11 max-w-full whitespace-normal bg-zim-gold text-slate-950 hover:bg-yellow-300"
          >
            <Link href="/shop/products?category=all">
              {t("shop.explore_shop")}
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-11 max-w-full whitespace-normal border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white"
          >
            <a href="#collections">{t("shop.landing.collections_cta")}</a>
          </Button>
        </DiscoveryHero>
        <DiscoverySection
          id="collections"
          title={t("shop.collections_title")}
          description={t("shop.collections_description")}
          action={
            <Link
              href="/shop/products?category=all&cart=1"
              className="shop-cart-link"
            >
              <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              {t("shop.products.cart.short_title")}
              <span className="shop-cart-count" aria-live="polite">
                {itemCount}
              </span>
            </Link>
          }
        >
          <CatalogNotice status={status} onRetry={() => void refresh()} />
          <SwipeRail
            label={tx(
              "shop.collections_title",
              "Zimbabwean favourites, in one place"
            )}
          >
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
                      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-300 hover:text-zim-gold"
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
          </SwipeRail>
        </DiscoverySection>
      </div>
    </Layout>
  );
}
