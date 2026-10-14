const heroImages: Record<string, string> = {
  "/shop": "/images/pages/shop/zimbabwe_shop_hero.webp",
  "/technology": "/images/pages/technology/ai_innovation.webp",
  "/investment": "/images/pages/investment/rbz_building.webp",
  "/tourism": "/images/pages/tourism/victoria_falls.webp",
};
const warmedImages = new Set<string>();

/** Warm only the intended tab's hero, without downloading every page's images. */
export function preloadNavigationImage(href: string) {
  const source = heroImages[href];
  if (!source || warmedImages.has(source)) return;
  warmedImages.add(source);
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = "low";
  image.onerror = () => warmedImages.delete(source);
  image.src = source;
}
