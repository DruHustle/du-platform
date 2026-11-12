import type { Product } from "./api";

export type BasketItem = {
  product: Product;
  quantity: number;
  reserved?: { token: string; quantity: number };
};

export function addToBasket(items: BasketItem[], product: Product): BasketItem[] {
  if (!Number.isSafeInteger(product.stock_qty) || product.stock_qty < 1) return items;
  const existing = items.find(item => item.product.id === product.id);
  if (!existing) return [...items, { product, quantity: 1 }];
  return items.map(item => item === existing
    ? { ...item, product, quantity: item.quantity < product.stock_qty ? item.quantity + 1 : item.quantity }
    : item);
}

export function setBasketQuantity(items: BasketItem[], id: number, quantity: number): BasketItem[] {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return items;
  return items.map(item => {
    if (item.product.id !== id) return item;
    // Customers can reduce a line even when the catalogue's stock has fallen.
    const next = quantity < item.quantity ? quantity : Math.max(item.quantity, Math.min(quantity, item.product.stock_qty));
    const reserved = item.reserved && { ...item.reserved, quantity: Math.min(next, item.reserved.quantity) };
    return { ...item, quantity: next, reserved };
  });
}

export function reserveBasket(items: BasketItem[], token: string, submitted: { productId: number; quantity: number }[]): BasketItem[] {
  return items.map(item => {
    const line = submitted.find(line => line.productId === item.product.id);
    return line ? { ...item, reserved: { token, quantity: Math.min(line.quantity, item.quantity) } } : item;
  });
}

export function finishBasketRequest(items: BasketItem[], token: string, accepted: boolean): BasketItem[] {
  return items.flatMap(item => {
    if (item.reserved?.token !== token) return [item];
    const quantity = accepted ? item.quantity - item.reserved.quantity : item.quantity;
    return quantity > 0 ? [{ product: item.product, quantity }] : [];
  });
}
