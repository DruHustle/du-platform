import { describe, expect, it } from "vitest";
import type { Product } from "../src/api";
import { addToBasket, finishBasketRequest, reserveBasket, setBasketQuantity } from "../src/basket";

const product = (id: number, stock = 8): Product => ({
  id, slug: `product-${id}`, name: "Product", category: "crafts", description: "", currency: "EUR",
  image_url: "", price_cents: 1200, stock_qty: stock, is_active: 1,
});

describe("native assisted-order basket", () => {
  it("consumes only the submitted units when other items were added during an uncertain request", () => {
    const submitted = reserveBasket(addToBasket([], product(1)), "old", [{ productId: 1, quantity: 1 }]);
    const current = addToBasket(addToBasket(submitted, product(1)), product(2));
    const remaining = finishBasketRequest(current, "old", true);
    expect(remaining.map(item => [item.product.id, item.quantity])).toEqual([[1, 1], [2, 1]]);
    expect(finishBasketRequest(remaining, "old", true)).toEqual(remaining);
  });

  it("keeps items added after restart or after removing the original line", () => {
    const current = addToBasket([], product(1));
    expect(finishBasketRequest(current, "from-an-earlier-session", true)).toEqual(current);
    const first = reserveBasket(current, "submitted", [{ productId: 1, quantity: 1 }]);
    const rebuilt = addToBasket(first.filter(item => item.product.id !== 1), product(1));
    expect(finishBasketRequest(rebuilt, "submitted", true)).toEqual(current);
  });

  it("keeps rejected requests editable and leaves later reservations alone", () => {
    const original = addToBasket([], product(1));
    const submitted = reserveBasket(original, "first", [{ productId: 1, quantity: 1 }]);
    expect(finishBasketRequest(submitted, "first", false)).toEqual(original);
    const later = reserveBasket(submitted, "later", [{ productId: 1, quantity: 1 }]);
    expect(finishBasketRequest(later, "first", true)).toEqual(later);
  });

  it("uses the refreshed stock and lets people reduce a quantity without removing the line", () => {
    const original = setBasketQuantity(addToBasket([], product(1)), 1, 5);
    const refreshed = addToBasket(original, product(1, 3));
    expect(refreshed[0]).toMatchObject({ quantity: 5, product: { stock_qty: 3 } });
    const reduced = setBasketQuantity(refreshed, 1, 2);
    expect(setBasketQuantity(reduced, 1, 5)[0].quantity).toBe(3);
    expect(addToBasket([], product(1, 0))).toEqual([]);
  });
});
