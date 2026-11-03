import { describe, expect, it, vi } from "vitest";
import { CART_STORAGE_KEY, createCartStore, parseCart } from "./cartStore";

function memoryStorage(raw: string | null = null) {
  return {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, value: string) => {
      raw = value;
    }),
  };
}

describe("shared shop cart", () => {
  it("reads existing quantities without overwriting them on initialization", () => {
    const storage = memoryStorage('[{"productId":7,"quantity":2}]');
    const cart = createCartStore(storage);
    expect(cart.getSnapshot()).toEqual([{ productId: 7, quantity: 2 }]);
    expect(cart.getSnapshot()).toBe(cart.getSnapshot());
    cart.hydrate();
    expect(storage.setItem).not.toHaveBeenCalled();
    cart.add(7, 10);
    expect(storage.setItem).toHaveBeenLastCalledWith(
      CART_STORAGE_KEY,
      '[{"productId":7,"quantity":3}]'
    );
    expect(createCartStore(storage).quantity(7)).toBe(3);
  });

  it("ignores corrupt values and combines duplicate product ids", () => {
    for (const raw of [null, "{", "null", "{}", '"text"'])
      expect(parseCart(raw)).toEqual([]);
    expect(
      parseCart(
        '[{"productId":2,"quantity":2},{"productId":2,"quantity":3},null,{"productId":-1,"quantity":2},{"productId":3,"quantity":0},{"productId":4,"quantity":1.5},{"productId":"5","quantity":1}]'
      )
    ).toEqual([{ productId: 2, quantity: 5 }]);
  });

  it("handles rapid additions, inventory limits, and removal down to zero", () => {
    const cart = createCartStore(memoryStorage());
    for (let i = 0; i < 20; i++) cart.add(1, 3);
    expect(cart.quantity(1)).toBe(3);
    expect(cart.add(1, 1)).toBe(false); // A stock decrease must not make + subtract.
    expect(cart.add(2, 0)).toBe(false);
    expect(cart.add(-1, 10)).toBe(false);
    for (let i = 0; i < 5; i++) cart.removeOne(1);
    expect(cart.getSnapshot()).toEqual([]);
  });

  it("stays usable when browser storage is blocked", () => {
    const cart = createCartStore({
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
    });
    cart.add(1, 5);
    cart.hydrate();
    expect(cart.quantity(1)).toBe(1);
    cart.removeOne(1);
    expect(cart.getSnapshot()).toEqual([]);
  });

  it("receives changes from another tab without echoing storage writes", () => {
    const storage = memoryStorage();
    const cart = createCartStore(storage);
    const listener = vi.fn();
    const unsubscribe = cart.subscribe(listener);
    cart.receiveStorage('[{"productId":2,"quantity":1}]');
    cart.receiveStorage('[{"productId":2,"quantity":1}]');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storage.setItem).not.toHaveBeenCalled();
    unsubscribe();
    cart.receiveStorage(null);
    expect(cart.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("removes only ordered quantities when a pending checkout completes", () => {
    const cart = createCartStore(memoryStorage());
    cart.add(1, 10);
    const submitted = cart.getSnapshot();
    cart.add(1, 10);
    cart.add(2, 10);
    cart.consume(submitted);
    expect(cart.getSnapshot()).toEqual([
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
    ]);
    cart.clear();
    expect(cart.getSnapshot()).toEqual([]);
  });
});
