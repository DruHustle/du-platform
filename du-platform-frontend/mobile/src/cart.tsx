import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Product } from "./api";
import { useSession } from "./session";

type Item = { product: Product; quantity: number };
type Cart = { items: Item[]; add(product: Product): void; remove(id: number): void; setQuantity(id: number, quantity: number): void; clear(): void };
const Context = createContext<Cart | null>(null);
export function useCart() { const value = useContext(Context); if (!value) throw new Error("Cart provider missing"); return value; }
export function CartProvider({children}: React.PropsWithChildren) {
  const [items, setItems] = useState<Item[]>([]);
  const {user} = useSession();
  const previousUser = useRef<number | null>(null);
  useEffect(() => { const next = user?.id ?? null; if (next !== previousUser.current) setItems([]); previousUser.current = next; }, [user?.id]);
  const add = (product: Product) => setItems(current => {
    const existing = current.find(item => item.product.id === product.id);
    if (existing) return current.map(item => item.product.id === product.id ? {...item, quantity: Math.min(item.quantity + 1, product.stock_qty)} : item);
    return [...current, {product, quantity: 1}];
  });
  const remove = (id: number) => setItems(current => current.filter(item => item.product.id !== id));
  const setQuantity = (id: number, quantity: number) => setItems(current => current.map(item => item.product.id === id ? {...item, quantity: Math.max(1, Math.min(item.product.stock_qty, quantity))} : item));
  return <Context.Provider value={{items, add, remove, setQuantity, clear: () => setItems([])}}>{children}</Context.Provider>;
}
