import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  Package,
  ShoppingBag,
  Globe2,
  ShieldCheck,
  Truck,
  CreditCard,
} from "lucide-react";
import Layout from "@/components/Layout";
import SubPageHero from "@/components/SubPageHero";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  SHOP_CATEGORY_CONFIG,
  type ShopSegmentKey,
} from "@/lib/shopCategories";
import InstantImage, { preloadImages } from "@/components/InstantImage";

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

const CATEGORY_DETAIL_FILLERS: Record<ShopSegmentKey, string> = {
  beverages:
    "Choose pantry-friendly singles and family cases that make gifting, restocking, and nostalgia-led orders feel effortless.",
  cereals:
    "Ideal for breakfast staples, family bundles, and everyday shelf restocking with products many buyers already know well.",
  sauces_spices:
    "Useful for home cooking, export baskets, and flavour-led bundles that bring familiar Zimbabwean taste back to the table.",
  snacks:
    "A strong fit for quick treats, care packages, and casual sharing orders built around recognizable favourites from home.",
  oils_spreads:
    "Simple pantry essentials that work well for repeat household orders, easy pairings, and convenient top-up purchases.",
  proteins:
    "Built around practical family cooking staples that support traditional meals, protein-rich baskets, and repeat purchase demand.",
  crafts:
    "Every piece carries a stronger heritage story, artisan detail, and gift-ready value for homes, offices, and collectors abroad.",
  apparel:
    "Support teams and identity through wearable Zimbabwe pride designed for match day, gifting, and diaspora community events.",
};

export default function Shop() {
  const { t } = useTranslation();
  const tx = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const collectionsRailRef = useRef<HTMLDivElement | null>(null);
  const collectionsDragStateRef = useRef<{
    pointerId: number | null;
    startX: number;
    startScrollLeft: number;
  }>({
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });
  const collectionsSuppressClickUntilRef = useRef(0);
  const [carouselIndex, setCarouselIndex] = useState<
    Record<ShopSegmentKey, number>
  >(
    () =>
      Object.fromEntries(
        SHOP_CATEGORY_CONFIG.map((item, idx) => [
          item.key,
          idx % Math.max(1, item.images.length),
        ])
      ) as Record<ShopSegmentKey, number>
  );

  useEffect(() => {
    preloadImages(
      SHOP_CATEGORY_CONFIG.slice(0, 3).map(
        category => category.images[carouselIndex[category.key] ?? 0]
      ),
      2
    );
  }, [carouselIndex]);

  const heroSlides = useMemo(
    () => [
      {
        image: "/images/pages/shop/zimbabwe_shop_hero.webp",
        badge: tx("shop.hero.badge1", "Authentic Zimbabwe Goods"),
        badgeIcon: ShoppingBag,
        title: tx("shop.hero.title1", "Shop Zimbabwe"),
        subtitle: tx(
          "shop.hero.subtitle1",
          "Buy curated products from Zimbabwe with diaspora-friendly delivery and trusted sourcing."
        ),
      },
      {
        image: "/images/pages/shop/crafts_stone_sculptures_01.png",
        badge: tx("shop.hero.badge2", "Craft Heritage"),
        badgeIcon: Globe2,
        title: tx("shop.hero.title2", "Handcrafted Excellence"),
        subtitle: tx(
          "shop.hero.subtitle2",
          "From Shona stone sculpture to handwoven baskets, discover products rooted in culture and quality."
        ),
      },
      {
        image: "/images/pages/shop/food_dried_mango_1.jpg",
        badge: tx("shop.hero.badge3", "Taste of Home"),
        badgeIcon: Package,
        title: tx("shop.hero.title3", "Food and Nostalgia"),
        subtitle: tx(
          "shop.hero.subtitle3",
          "Enjoy Zimbabwe favorites sourced with quality controls for local and export-ready buyers."
        ),
      },
      {
        image: "/images/pages/shop/beverage_mazoe_orange_6.png",
        badge: tx("shop.hero.badge4", "Beverage Favorites"),
        badgeIcon: ShoppingBag,
        title: tx("shop.hero.title4", "Mazoe and Maheu Classics"),
        subtitle: tx(
          "shop.hero.subtitle4",
          "Discover homegrown drink favorites curated for diaspora shelves and family tables."
        ),
      },
      {
        image: "/images/pages/shop/sports_rugby_jersey.jpg",
        badge: tx("shop.hero.badge5", "Sports Pride"),
        badgeIcon: Globe2,
        title: tx("shop.hero.title5", "Wear Zimbabwe with Pride"),
        subtitle: tx(
          "shop.hero.subtitle5",
          "Support local teams with official fan kits and sportswear inspired by Zimbabwean spirit."
        ),
      },
      {
        image: "/images/pages/shop/crafts_binga_baskets_01.jpg",
        badge: tx("shop.hero.badge6", "Artisan Economy"),
        badgeIcon: Package,
        title: tx("shop.hero.title6", "Crafts with a Story"),
        subtitle: tx(
          "shop.hero.subtitle6",
          "Shop handmade products that preserve heritage and support artisan communities."
        ),
      },
    ],
    [t]
  );

  useEffect(() => {
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      setCarouselIndex(prev => {
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

  const handleCollectionsRailPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (event.pointerType === "touch" || !collectionsRailRef.current) return;

    collectionsDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: collectionsRailRef.current.scrollLeft,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCollectionsRailPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      !collectionsRailRef.current ||
      collectionsDragStateRef.current.pointerId !== event.pointerId
    )
      return;

    const deltaX = event.clientX - collectionsDragStateRef.current.startX;
    if (Math.abs(deltaX) > 6) {
      collectionsSuppressClickUntilRef.current = Date.now() + 250;
    }
    collectionsRailRef.current.scrollLeft =
      collectionsDragStateRef.current.startScrollLeft - deltaX;
  };

  const handleCollectionsRailPointerEnd = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (collectionsDragStateRef.current.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    collectionsDragStateRef.current = {
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
    };
  };

  const processItems = [
    {
      icon: ShieldCheck,
      title: tx("shop.process.verified.title", "Verified Sourcing"),
      description: tx(
        "shop.process.verified.desc",
        "Goods are curated from trusted Zimbabwean producers, artisans, and compliant suppliers."
      ),
    },
    {
      icon: Truck,
      title: tx("shop.process.delivery.title", "Diaspora Delivery Support"),
      description: tx(
        "shop.process.delivery.desc",
        "We prioritize practical fulfillment routes for local, regional, and international buyers."
      ),
    },
    {
      icon: CreditCard,
      title: tx("shop.process.payment.title", "Flexible Payment Pathways"),
      description: tx(
        "shop.process.payment.desc",
        "Support for modern payment flows and transparent pricing to reduce checkout friction."
      ),
    },
  ];

  const getCategoryTitle = (key: ShopSegmentKey, fallback: string) =>
    tx(`shop.categories.${key}.title`, fallback);
  const getCategoryDetail = (key: ShopSegmentKey) =>
    tx(`shop.categories.${key}.detail`, CATEGORY_DETAIL_FILLERS[key]);
  const getCategoryHref = (key: ShopSegmentKey, baseCategory: string) => {
    const normalizedCategory =
      baseCategory === "sports" || baseCategory === "crafts"
        ? baseCategory
        : "food";
    const params = new URLSearchParams({
      category: normalizedCategory,
      segment: key,
      add: FEATURED_PRODUCT_BY_SEGMENT[key],
    });
    return `/shop/products?${params.toString()}`;
  };
  const handleCollectionClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (Date.now() >= collectionsSuppressClickUntilRef.current) return;
    event.preventDefault();
  };

  return (
    <Layout>
      <section id="hero">
        <SubPageHero heroSlides={heroSlides} />
      </section>

      {/* How shop works*/}
      <section className="pt-5 pb-5 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div
            className={`${OUTER_PANEL_CLASS} overflow-visible !p-5 md:!p-10`}
          >
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="relative z-10">
              <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Package className="h-6 w-6 text-zim-gold" />
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {tx("shop.how_it_works.title", "How The Shop Works")}
                  </h3>
                </div>
                <p className="text-sm text-white/75 max-w-3xl mx-auto font-light leading-relaxed">
                  {tx(
                    "shop.how_it_works.subtitle",
                    "Practical commerce flow for Zimbabwe-made goods, designed for trust, convenience, and diaspora impact."
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {processItems.map(item => (
                  <article
                    key={item.title}
                    className="group rounded-3xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-500 hover:bg-slate-950/60"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <item.icon className="h-4 w-4 text-zim-gold" />
                      <h3 className="text-sm font-black tracking-tight text-white">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs leading-relaxed text-white/70">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Online shop */}
      <section
        id="collections"
        className="pt-5 pb-10 bg-slate-950 relative overflow-hidden"
      >
        <div className="container relative z-10 px-6 mx-auto">
          <div className={`${OUTER_PANEL_CLASS} overflow-visible`}>
            <span className="absolute inset-0 rounded-[2rem] border border-white/10 pointer-events-none" />
            <div className="relative z-10">
              <motion.div
                id="zimbabwe-shop-info"
                initial={false}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-8 py-6 scroll-mt-24 relative"
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.03)_0%,transparent_70%)] pointer-events-none" />

                <div className="space-y-4 text-center">
                  <h2 className="section-title-compact">
                    {tx(
                      "shop.collections_title",
                      "Curated Zimbabwean Excellence"
                    )}
                  </h2>
                  <p className="text-sm text-white/75 max-w-4xl mx-auto font-light leading-relaxed">
                    {tx(
                      "shop.collections_description",
                      "Curated Zimbabwean Excellence brings authentic Zimbabwe products to your doorstep, from pantry staples and beverages to crafts and sports apparel, sourced for quality and diaspora convenience."
                    )}
                  </p>
                </div>

                <div
                  ref={collectionsRailRef}
                  className="tile-scroll-rail relative z-10 -mx-8 -mt-3 overflow-x-auto pb-7 pt-3 scroll-pl-4 scroll-smooth overscroll-x-contain snap-x snap-mandatory md:-mx-10 md:-mt-4 md:pb-8 md:pt-4 md:scroll-pl-4 md:cursor-grab active:cursor-grabbing"
                  onPointerCancel={handleCollectionsRailPointerEnd}
                  onPointerDown={handleCollectionsRailPointerDown}
                  onPointerMove={handleCollectionsRailPointerMove}
                  onPointerUp={handleCollectionsRailPointerEnd}
                >
                  <div className="flex w-max items-stretch gap-4 pl-4 pr-8 md:pr-10">
                    {SHOP_CATEGORY_CONFIG.map(category => {
                      const categoryHref = getCategoryHref(
                        category.key,
                        category.baseCategory
                      );
                      const categoryTitle = getCategoryTitle(
                        category.key,
                        category.title
                      );
                      const categoryBody = getCategoryDetail(category.key);

                      return (
                        <motion.div
                          key={category.key}
                          initial={false}
                          whileInView={{ y: 0, opacity: 1 }}
                          viewport={{ once: true }}
                          className="h-full w-[74vw] max-w-[19.5rem] flex-none self-stretch snap-start sm:w-[20.5rem] lg:w-[22.5rem] xl:w-[23.5rem]"
                        >
                          <div className="group relative flex !h-[26.5rem] cursor-pointer flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/45 shadow-[0_16px_30px_rgba(0,0,0,0.28)] transition-all duration-500 hover:bg-slate-950/60 hover:-translate-y-1 sm:!h-[28rem] lg:!h-[30rem] xl:!h-[31.5rem]">
                            <span className="absolute inset-0 rounded-[1.5rem] border border-white/5 pointer-events-none z-20" />
                            <Link
                              href={categoryHref}
                              onClick={handleCollectionClick}
                              aria-label={categoryTitle}
                              className="block h-full rounded-[1.5rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-zim-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                            >
                              <div className="flex h-full flex-col">
                                <div className="relative !h-[18.25rem] overflow-hidden bg-slate-900 sm:!h-[18.75rem] lg:!h-[20.5rem] xl:!h-[21rem]">
                                  <InstantImage
                                    src={
                                      category.images[
                                        carouselIndex[category.key] ?? 0
                                      ]
                                    }
                                    alt={categoryTitle}
                                    priority={
                                      SHOP_CATEGORY_CONFIG.findIndex(
                                        item => item.key === category.key
                                      ) < 2
                                    }
                                    loading={
                                      SHOP_CATEGORY_CONFIG.findIndex(
                                        item => item.key === category.key
                                      ) < 2
                                        ? "eager"
                                        : "lazy"
                                    }
                                    wrapperClassName="h-full w-full bg-slate-900"
                                    className="w-full h-full object-cover saturate-[0.85] group-hover:saturate-100 group-hover:scale-105 transition-all duration-700"
                                    draggable={false}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
                                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                                    {category.images.map((_, imageIdx) => {
                                      const isActive =
                                        (carouselIndex[category.key] ?? 0) ===
                                        imageIdx;
                                      return (
                                        <button
                                          key={`${category.key}-${imageIdx}`}
                                          type="button"
                                          aria-label={`${categoryTitle} ${tx("shop.image", "image")} ${imageIdx + 1}`}
                                          aria-current={
                                            isActive ? "true" : "false"
                                          }
                                          onClick={event => {
                                            event.stopPropagation();
                                            event.preventDefault();
                                            setCarouselIndex(prev => ({
                                              ...prev,
                                              [category.key]: imageIdx,
                                            }));
                                          }}
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

                                <div className="relative z-10 flex flex-1 flex-col !px-4 !pb-3 !pt-2 lg:!px-5 lg:!pb-4 lg:!pt-3">
                                  <h4 className="mb-1 text-base font-black tracking-tight text-white text-center group-hover:text-zim-gold transition-colors duration-300">
                                    {categoryTitle}
                                  </h4>
                                  <p className="text-sm font-light leading-relaxed text-white/75 text-left line-clamp-4">
                                    {categoryBody}
                                  </p>
                                </div>

                                <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-zim-gold/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                              </div>
                            </Link>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-center">
                  <Button
                    asChild
                    className="rounded-full px-7 py-2 h-auto bg-zim-gold text-black hover:bg-zim-gold/90 font-black text-[10px] uppercase tracking-[0.2em]"
                  >
                    <Link href="/shop/products?category=all">
                      {tx("shop.explore_shop", "Explore Shop")}
                    </Link>
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
