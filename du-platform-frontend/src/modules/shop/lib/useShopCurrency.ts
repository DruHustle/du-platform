import { useSyncExternalStore } from "react";
import { safeLocalStorage } from "@/lib/browserStorage";
import {
  currencyForTimeZone,
  isShopCurrency,
  type ShopCurrency,
} from "@shared/shopCurrency";

const key = "du_shop_currency_v1";
const listeners = new Set<() => void>();
function initialCurrency(): ShopCurrency {
  const stored = safeLocalStorage.getItem(key);
  if (isShopCurrency(stored)) return stored;
  try {
    return currencyForTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  } catch {
    return "EUR";
  }
}
let currency = initialCurrency();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function setShopCurrency(value: ShopCurrency) {
  if (!isShopCurrency(value)) return;
  currency = value;
  safeLocalStorage.setItem(key, value);
  listeners.forEach(listener => listener());
}
if (typeof window !== "undefined")
  window.addEventListener("storage", event => {
    if (event.key === key) {
      currency = initialCurrency();
      listeners.forEach(listener => listener());
    }
  });
export function useShopCurrency() {
  return {
    currency: useSyncExternalStore(subscribe, () => currency),
    setCurrency: setShopCurrency,
  };
}

export function getShopCurrency() {
  return currency;
}
