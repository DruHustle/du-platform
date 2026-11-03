export type CartItem = {
  readonly productId: number;
  readonly quantity: number;
};
type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
export const CART_STORAGE_KEY = "shop_cart_v1";
const EMPTY: readonly CartItem[] = [];

export function parseCart(raw: string | null): readonly CartItem[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return EMPTY;
    const quantities = new Map<number, number>();
    for (const item of value) {
      if (
        !Number.isSafeInteger(item?.productId) ||
        item.productId <= 0 ||
        !Number.isSafeInteger(item?.quantity) ||
        item.quantity <= 0
      )
        continue;
      quantities.set(
        item.productId,
        Math.min(
          Number.MAX_SAFE_INTEGER,
          (quantities.get(item.productId) || 0) + item.quantity
        )
      );
    }
    return Array.from(quantities, ([productId, quantity]) => ({
      productId,
      quantity,
    }));
  } catch {
    return EMPTY;
  }
}

export function createCartStore(storage: Storage) {
  let snapshot: readonly CartItem[] | undefined;
  const listeners = new Set<() => void>();
  const readStorage = () => {
    try {
      return storage.getItem(CART_STORAGE_KEY);
    } catch {
      return undefined;
    }
  };
  const getSnapshot = () => {
    if (!snapshot) snapshot = parseCart(readStorage() || null);
    return snapshot;
  };
  const publish = (next: readonly CartItem[], persist: boolean) => {
    if (JSON.stringify(next) === JSON.stringify(getSnapshot())) return false;
    snapshot = next;
    if (persist) {
      try {
        storage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* Keep the in-memory cart usable. */
      }
    }
    listeners.forEach(listener => listener());
    return true;
  };
  const setQuantity = (
    productId: number,
    quantity: number,
    limit = Number.MAX_SAFE_INTEGER
  ) => {
    if (
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      !Number.isSafeInteger(quantity) ||
      !Number.isSafeInteger(limit) ||
      limit < 0
    )
      return false;
    const nextQuantity = Math.max(0, Math.min(quantity, limit));
    const current = getSnapshot();
    if (nextQuantity === 0)
      return publish(
        current.filter(item => item.productId !== productId),
        true
      );
    const existing = current.some(item => item.productId === productId);
    return publish(
      existing
        ? current.map(item =>
            item.productId === productId
              ? { productId, quantity: nextQuantity }
              : item
          )
        : [...current, { productId, quantity: nextQuantity }],
      true
    );
  };
  const quantity = (id: number) =>
    getSnapshot().find(item => item.productId === id)?.quantity || 0;
  return {
    getSnapshot,
    getServerSnapshot: () => EMPTY,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate() {
      const raw = readStorage();
      if (raw !== undefined) publish(parseCart(raw), false);
    },
    receiveStorage(raw: string | null) {
      publish(parseCart(raw), false);
    },
    quantity,
    add(productId: number, limit: number) {
      // Never reduce an existing quantity as a side effect of pressing +.
      const current = quantity(productId);
      if (!Number.isSafeInteger(limit) || limit <= current) return false;
      return setQuantity(productId, current + 1, limit);
    },
    removeOne(productId: number) {
      return setQuantity(productId, quantity(productId) - 1);
    },
    setQuantity,
    consume(purchased: readonly CartItem[]) {
      // Keep additions made while the order request was in flight.
      const submitted = new Map(
        purchased.map(item => [item.productId, item.quantity])
      );
      publish(
        getSnapshot().flatMap(item => {
          const remaining =
            item.quantity - (submitted.get(item.productId) || 0);
          return remaining > 0 ? [{ ...item, quantity: remaining }] : [];
        }),
        true
      );
    },
    clear() {
      publish(EMPTY, true);
    },
  };
}
