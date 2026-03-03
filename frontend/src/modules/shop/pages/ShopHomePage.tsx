import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Package, ShoppingBag, Truck, CreditCard, ShieldCheck, Globe2 } from "lucide-react";
import Layout from "@/components/Layout";
import SubPageHero from "@/components/SubPageHero";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SHOP_CATEGORY_CONFIG, type ShopSegmentKey } from "@/lib/shopCategories";

const OUTER_PANEL_CLASS =
  "relative p-8 md:p-10 rounded-[2rem] overflow-hidden border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.1)] transition-all duration-500 group";

const CAROUSEL_CADENCE_BY_SEGMENT: Partial<Record<ShopSegmentKey, number>> = {
  apparel: 1,
  crafts: 2,
  beverages: 3,
  cereals: 2,
  sauces_spices: 3,
  snacks: 2,
  oils_spreads: 4,
  proteins: 2,
};

export default function Shop() {
  const { t } = useTranslation();
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [carouselIndex, setCarouselIndex] = useState<Record<ShopSegmentKey, number>>(() =>
    Object.fromEntries(
      SHOP_CATEGORY_CONFIG.map((item, idx) => [item.key, idx % Math.max(1, item.images.length)])
    ) as Record<ShopSegmentKey, number>
  );

  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/shop/zimbabwe_shop_hero.jpg",
        badge: tx("shop.hero.badge1", "Authentic Zimbabwe Goods"),
        badgeIcon: ShoppingBag,
        title: tx("shop.hero.title1", "Shop Zimbabwe"),
        subtitle:
          tx(
            "shop.hero.subtitle1",
          "Buy curated products from Zimbabwe with diaspora-friendly delivery and trusted sourcing.",
          ),
        buttons: [{ text: tx("shop.hero.button1", "Browse Collections"), link: "/shop#collections", variant: "primary", showArrow: true }],
      },
      {
        image: "/images/pages/shop/crafts_stone_sculptures1.png",
        badge: tx("shop.hero.badge2", "Craft Heritage"),
        badgeIcon: Globe2,
        title: tx("shop.hero.title2", "Handcrafted Excellence"),
        subtitle:
          tx(
            "shop.hero.subtitle2",
          "From Shona stone sculpture to handwoven baskets, discover products rooted in culture and quality.",
          ),
      },
      {
        image: "/images/pages/shop/food_dried_mango_1.jpg",
        badge: tx("shop.hero.badge3", "Taste of Home"),
        badgeIcon: Package,
        title: tx("shop.hero.title3", "Food and Nostalgia"),
        subtitle:
          tx(
            "shop.hero.subtitle3",
          "Enjoy Zimbabwe favorites sourced with quality controls for local and export-ready buyers.",
          ),
      },
      {
        image: "/images/pages/shop/beverage_mazoe_orange_6.png",
        badge: tx("shop.hero.badge4", "Beverage Favorites"),
        badgeIcon: ShoppingBag,
        title: tx("shop.hero.title4", "Mazoe and Maheu Classics"),
        subtitle:
          tx(
            "shop.hero.subtitle4",
          "Discover homegrown drink favorites curated for diaspora shelves and family tables.",
          ),
      },
      {
        image: "/images/pages/shop/sports_rugby_jersey.jpg",
        badge: tx("shop.hero.badge5", "Sports Pride"),
        badgeIcon: Globe2,
        title: tx("shop.hero.title5", "Wear Zimbabwe with Pride"),
        subtitle:
          tx(
            "shop.hero.subtitle5",
          "Support local teams with official fan kits and sportswear inspired by Zimbabwean spirit.",
          ),
      },
      {
        image: "/images/pages/shop/crafts_binga_baskets1.jpg",
        badge: tx("shop.hero.badge6", "Artisan Economy"),
        badgeIcon: Package,
        title: tx("shop.hero.title6", "Crafts with a Story"),
        subtitle:
          tx(
            "shop.hero.subtitle6",
          "Shop handmade products that preserve heritage and support artisan communities.",
          ),
      },
    ],
    [t],
  );

  const introData = {
    icon: ShoppingBag,
    title: t("shop.title") || "Home Away From Home",
    description: "shop.desc",
  };

  useEffect(() => {
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      setCarouselIndex((prev) => {
        const next = { ...prev };
        for (const item of SHOP_CATEGORY_CONFIG) {
          const cadence = CAROUSEL_CADENCE_BY_SEGMENT[item.key] ?? 1;
          if (tick % cadence !== 0) continue;
          const current = prev[item.key] ?? 0;
          next[item.key] = (current + 1) % item.images.length;
        }
        return next;
      });
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  const processItems = [
    {
      icon: ShieldCheck,
      title: t("shop.process.verified.title") || "Verified Sourcing",
      description:
        t("shop.process.verified.desc") ||
        "Goods are curated from trusted Zimbabwean producers, artisans, and compliant suppliers.",
    },
    {
      icon: Truck,
      title: t("shop.process.delivery.title") || "Diaspora Delivery Support",
      description:
        t("shop.process.delivery.desc") ||
        "We prioritize practical fulfillment routes for local, regional, and international buyers.",
    },
    {
      icon: CreditCard,
      title: t("shop.process.payment.title") || "Flexible Payment Pathways",
      description:
        t("shop.process.payment.desc") ||
        "Support for modern payment flows and transparent pricing to reduce checkout friction.",
    },
  ];

  const getCategoryTitle = (key: ShopSegmentKey, fallback: string) =>
    t(`shop.categories.${key}.title`) || fallback;
  const getCategoryDescription = (key: ShopSegmentKey, fallback: string) =>
    t(`shop.categories.${key}.description`) || fallback;

  return (
    <Layout>
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} intro={introData} />
      </section>

      {/* How shop works*/}
      <section className="p-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className={OUTER_PANEL_CLASS}>
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Package className="h-6 w-6 text-zim-gold" />
                  <h3 className="text-xl font-black text-white tracking-tight">{t("shop.how_it_works.title") || "How The Shop Works"}</h3>
                </div>
                <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                  {t("shop.how_it_works.subtitle") ||
                    "Practical commerce flow for Zimbabwe-made goods, designed for trust, convenience, and diaspora impact."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {processItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="relative rounded-[2rem] border border-white/10 bg-white/[0.02] p-7 transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-0.5">
                      <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-zim-gold/20 border border-zim-gold/30 flex items-center justify-center mb-4">
                          <Icon className="w-5 h-5 text-zim-gold" />
                        </div>
                        <h4 className="text-lg font-black text-white tracking-tight mb-2">{item.title}</h4>
                        <p className="text-sm text-white/75 leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  className="rounded-full px-7 py-2 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[10px] uppercase tracking-[0.2em]"
                >
                  <Link href="/trade">{t("shop.trade_support") || "Explore Trade Support"}</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full px-7 py-2 h-auto bg-white/10 border-white/20 text-white hover:bg-white hover:text-black font-black text-[10px] uppercase tracking-[0.2em]"
                >
                  <Link href="/trade">{t("shop.export_readiness") || "Trade Readiness Guide"}</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Online shop */}
      <section id="collections" className="pt-5 pb-10 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className={OUTER_PANEL_CLASS}>
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="relative z-10">
              <motion.div
                id="zimbabwe-shop-info"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="max-w-7xl mx-auto px-6 space-y-8 py-6 scroll-mt-24 relative overflow-hidden"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />

                <div className="space-y-4 text-center">
                  <h2 className="section-title-compact">{t("shop.collections_title") || "Curated Zimbabwean Excellence"}</h2>
                  <p className="text-sm text-white/75 max-w-4xl mx-auto font-light leading-relaxed">
                    {t("shop.collections_description") ||
                      "Curated Zimbabwean Excellence brings authentic Zimbabwe products to your doorstep, from pantry staples and beverages to crafts and sports apparel, sourced for quality and diaspora convenience."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                  {SHOP_CATEGORY_CONFIG.map((category, catIdx) => (
                    <motion.div
                      key={catIdx}
                      initial={{ y: 20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      className="group relative flex flex-col h-full rounded-[1.5rem] overflow-hidden border border-white/10 bg-slate-950/45 shadow-[0_16px_30px_rgba(0,0,0,0.28)] transition-all duration-500 hover:bg-slate-950/60 hover:-translate-y-1"
                    >
                      <span className="absolute inset-0 rounded-[1.5rem] border border-white/5 pointer-events-none z-20" />

                      <div className="relative h-36 overflow-hidden bg-slate-900">
                        <img
                          src={category.images[carouselIndex[category.key] ?? 0]}
                          alt={getCategoryTitle(category.key, category.title)}
                          className="w-full h-full object-cover saturate-[0.85] group-hover:saturate-100 group-hover:scale-105 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                          {category.images.map((_, imageIdx) => {
                            const isActive = (carouselIndex[category.key] ?? 0) === imageIdx;
                            return (
                              <button
                                key={`${category.key}-${imageIdx}`}
                                type="button"
                                aria-label={`${getCategoryTitle(category.key, category.title)} ${(t("shop.image") || "image")} ${imageIdx + 1}`}
                                aria-current={isActive ? "true" : "false"}
                                onClick={() =>
                                  setCarouselIndex((prev) => ({
                                    ...prev,
                                    [category.key]: imageIdx,
                                  }))
                                }
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  isActive
                                    ? "w-5 bg-zim-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                                    : "w-1.5 bg-white/60 hover:bg-white/85"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-grow relative z-10">
                        <h4 className="text-sm font-black text-white tracking-tight mb-2 text-center group-hover:text-zim-gold transition-colors duration-300">
                          {getCategoryTitle(category.key, category.title)}
                        </h4>
                        <p className="text-xs text-white/70 flex-grow leading-relaxed font-light text-justify">
                          {getCategoryDescription(category.key, category.description)}
                        </p>
                      </div>

                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zim-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </motion.div>
                  ))}
                </div>

                <div className="pt-2 flex justify-center">
                  <Button
                    asChild
                    className="rounded-full px-7 py-2 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[10px] uppercase tracking-[0.2em]"
                  >
                    <Link href="/shop/products?category=all">{t("shop.explore_shop") || "Explore Shop"}</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>


    </Layout>
  );
}
