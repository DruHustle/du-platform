import fs from "node:fs";

export async function loadCatalogue({env = process.env, fetcher = fetch} = {}) {
  // Builds are independent. Production makes a best-effort public snapshot for
  // product metadata, but an unavailable API never blocks a web deployment.
  const fixture = env.DU_PUBLIC_CATALOGUE_FILE;
  const strategy = env.DU_CATALOGUE_STRATEGY || (env.VERCEL_ENV === "production" ? "auto" : "omit");
  if (!["omit", "published", "auto"].includes(strategy))
    throw new Error("DU_CATALOGUE_STRATEGY must be omit, auto or published");
  if (env.VERCEL_ENV === "production" && fixture)
    throw new Error(
      "Production frontend cannot use a fixture catalogue"
    );
  if (fixture && strategy === "published") throw new Error("Choose a fixture or the published catalogue, not both");
  let catalogue;
  if (fixture) catalogue = JSON.parse(fs.readFileSync(fixture, "utf8"));
  else if (strategy === "omit") catalogue = { products: [] };
  else {
    try {
      const response = await fetcher(
        "https://www.diasporaunlocked.com/api/shop/products",
        { signal: AbortSignal.timeout(15000) }
      );
      if (!response.ok) throw new Error("Published catalogue snapshot unavailable");
      catalogue = await response.json();
      if (catalogue.data?.source !== "db")
        throw new Error("Production catalogue must come from durable storage");
    } catch (error) {
      if (strategy === "published") throw error;
      console.warn("[seo] Published catalogue unavailable; product-specific documents were omitted.");
      catalogue = { products: [] };
    }
  }
  let products;
  try {
    const rows = catalogue.data?.products ?? catalogue.products;
    if (!Array.isArray(rows)) throw new Error("Invalid published catalogue");
    products = rows
    .filter(p => Number(p.is_active) === 1)
    .map(p => {
      if (
        !/^[a-z0-9_-]+$/.test(p.slug) ||
        typeof p.name !== "string" ||
        typeof p.description !== "string" ||
        !Number.isSafeInteger(p.price_cents) ||
        !["EUR", "USD", "ZAR"].includes(p.currency)
      )
        throw new Error("Invalid public product");
      return {
        slug: p.slug,
        name: p.name,
        description: p.description,
        image_url: p.image_url,
        price_cents: p.price_cents,
        currency: p.currency,
        stock_qty: p.stock_qty,
      };
    });
  } catch (error) {
    if (strategy !== "auto" || fixture) throw error;
    console.warn("[seo] Published catalogue was invalid; product-specific documents were omitted.");
    products = [];
  }
  return products;
}
