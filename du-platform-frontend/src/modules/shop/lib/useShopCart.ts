import { useSyncExternalStore } from "react";
import { CART_STORAGE_KEY, createCartStore } from "./cartStore";

const store = createCartStore({
  getItem: key => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
});
let subscribers = 0;
function receiveStorage(event: StorageEvent) {
  if (event.key === CART_STORAGE_KEY || event.key === null)
    store.receiveStorage(event.newValue);
}
function subscribe(listener: () => void) {
  if (subscribers++ === 0) {
    store.hydrate();
    window.addEventListener("storage", receiveStorage);
  }
  const unsubscribe = store.subscribe(listener);
  return () => {
    unsubscribe();
    if (--subscribers === 0)
      window.removeEventListener("storage", receiveStorage);
  };
}
export function useShopCart() {
  const cart = useSyncExternalStore(
    subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
  return {
    cart,
    add: store.add,
    removeOne: store.removeOne,
    clear: store.clear,
    consume: store.consume,
    setQuantity: store.setQuantity,
    itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
  };
}
