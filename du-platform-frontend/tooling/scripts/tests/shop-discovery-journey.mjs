import assert from "node:assert/strict";
import { SearchService } from "../../../../du-platform-backend/modules/search/services/searchService.ts";
import { readyShop, testPricing } from "./shop-readiness-fixture.mjs";

export async function checkCatalogueDiscovery({ browser, base, language, locale, width, products }) {
  const [jersey, other] = products;
  const filters = locale.shop.products.filters;
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
    storageState: {
      cookies: [],
      origins: [{
        origin: new URL(base).origin,
        localStorage: [
          { name: "i18nextLng", value: language },
          { name: "du_cookie_consent_v1", value: "rejected" },
        ],
      }],
    },
  });
  try {
    const errors = [];
    context.on("weberror", event => errors.push(event.error().message));
    context.setDefaultTimeout(10000);
    const searchService = new SearchService({
      publishedProducts: async () => products.map(product => ({ ...product, is_active: 1 })),
      searchNtir: async () => [],
    });
    await context.route("**/api/**", async route => {
      const { pathname, searchParams } = new URL(route.request().url());
      if (pathname === "/api/search") return route.fulfill({
        json: { success: true, data: await searchService.search(searchParams.get("q")) },
      });
      if (pathname === "/api/shop/products") return route.fulfill({
        json: { source: "db", products, readiness: readyShop([jersey.id]), pricing: testPricing },
      });
      if (pathname.endsWith("/details")) return route.fulfill({ json: { details: {} } });
      return route.fulfill({ json: { user: null, ready: false } });
    });
    const page = await context.newPage();
    await page.goto(base + "/shop/products?category=crafts&lng=" + language);
    const search = page.getByRole("searchbox", { name: filters.search, exact: true });
    const category = page.getByRole("combobox", { name: filters.category, exact: true });
    const segment = page.getByRole("combobox", { name: filters.select_segment, exact: true });
    const availability = page.getByRole("checkbox", { name: locale.pilot.available_now });
    await category.selectOption("sports");
    await segment.selectOption("apparel");
    await availability.check();
    await search.fill("jersey Chevrons");
    const selected = page.locator(`[data-shop-product-card="${jersey.slug}"]`);
    await selected.waitFor();
    const count = page.getByRole("status").filter({ hasText: /1/ });
    await count.first().waitFor();
    const details = selected.getByRole("link", { name: locale.pilot.product_details, exact: true });
    await details.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("heading", { name: jersey.name, exact: true }).waitFor();
    await page.getByRole("link", { name: locale.pilot.browse_products, exact: true }).click();
    await selected.waitFor();
    assert.equal(await search.inputValue(), "jersey Chevrons");
    assert.equal(await category.inputValue(), "sports");
    assert.equal(await segment.inputValue(), "apparel");
    assert(await availability.isChecked());
    assert.equal(new URL(page.url()).searchParams.get("lng"), language);
    await page.reload();
    await selected.waitFor();
    assert.equal(await search.inputValue(), "jersey Chevrons");
    await search.fill("no-such-product");
    await page.getByText(filters.no_matches, { exact: true }).waitFor();
    await page.getByRole("button", { name: locale.shop.products.clear_filters, exact: true }).click();
    await page.locator(`[data-shop-product-card="${other.slug}"]`).waitFor();
    assert.equal(await page.locator("[data-shop-product-card]").count(), products.length);
    assert.equal(await search.inputValue(), "");
    assert.equal(await category.inputValue(), "all");
    assert.equal(await segment.inputValue(), "");
    assert.equal(await availability.isChecked(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("role")), "status");
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (width === 1440) {
      await page.getByRole("button", { name: locale.search.results.title_default, exact: true }).click();
      const input = page.getByRole("dialog").locator("input");
      await input.fill("kit sables");
      await input.press("Enter");
      const result = page.getByRole("link").filter({ has: page.getByRole("heading", { name: other.name, exact: true }) });
      assert.equal(await result.getAttribute("href"), `/shop/product/${other.slug}`);
      await result.click();
      await page.getByRole("heading", { name: other.name, exact: true }).waitFor();
      assert.equal(new URL(page.url()).pathname, `/shop/product/${other.slug}`);
    }
    if (width === 320 && language === "en") {
      for (const userMovedFocus of [false, true]) {
        const arrival = await context.newPage();
        await arrival.setViewportSize({ width: 375, height: 667 });
        let releaseCatalogue;
        const delayed = new Promise(resolve => { releaseCatalogue = resolve; });
        const delayResponse = async route => { await delayed; await route.fallback(); };
        await arrival.route("**/api/shop/products", delayResponse);
        const browse = arrival.getByRole("link", { name: locale.pilot.browse_products, exact: true });
        try {
          await arrival.goto(`${base}/shop/product/${other.slug}#interest`, { waitUntil: "domcontentloaded" });
          await arrival.getByText("Checking product availability…", { exact: true }).waitFor();
          await browse.waitFor();
          if (userMovedFocus) await browse.focus();
          releaseCatalogue();
          await arrival.locator("#interest button").waitFor();
          if (userMovedFocus) {
            assert(await browse.evaluate(link => link === document.activeElement));
          } else {
            await arrival.waitForFunction(() => {
              const action = document.querySelector("#interest button").getBoundingClientRect();
              return action.top >= 0 && action.bottom <= innerHeight &&
                document.activeElement?.id === "interest";
            });
          }
        } finally {
          releaseCatalogue();
          await arrival.close();
        }
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
