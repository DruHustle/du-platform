const heroImages: Record<string, string> = {
  "/care": "/images/pages/care/family-gathering.webp",
  "/shop": "/images/pages/shop/crafts_binga_baskets_01.jpg",
  "/onesa": "/images/pages/technology/ai_innovation.webp",
  "/business-guides": "/images/pages/investment/horticulture.jpg",
  "/travel": "/images/pages/tourism/victoria_falls.webp",
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
