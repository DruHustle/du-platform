import assert from "node:assert/strict";
import { readyShop, testPricing } from "./shop-readiness-fixture.mjs";

export async function checkCatalogueDiscovery({ browser, base, language, locale, width, products }) {
  const [jersey, other] = products;
  const filters = locale.shop.products.filters;
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  try {
    await context.addInitScript(language => {
      localStorage.setItem("i18nextLng", language);
      localStorage.setItem("du_cookie_consent_v1", "rejected");
    }, language);
    await context.route("**/api/**", route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/api/shop/products") return route.fulfill({
        json: { source: "db", products, readiness: readyShop([jersey.id]), pricing: testPricing },
      });
      if (pathname.endsWith("/details")) return route.fulfill({ json: { details: {} } });
      return route.fulfill({ json: { user: null, ready: false } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.setDefaultTimeout(10000);
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
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}
