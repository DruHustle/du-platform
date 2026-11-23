import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Product } from "./api";
import { addToBasket, finishBasketRequest, reserveBasket, setBasketQuantity, type BasketItem } from "./basket";
import { useSession } from "./session";

type Cart = {
  items: BasketItem[];
  add(product: Product): void;
  remove(id: number): void;
  setQuantity(id: number, quantity: number): void;
  reserve(token: string, submitted: { productId: number; quantity: number }[]): void;
  finish(token: string, accepted: boolean): void;
};

const Context = createContext<Cart | null>(null);

export function useCart() {
  const cart = useContext(Context);
  if (!cart) throw new Error("Cart provider missing");
  return cart;
}

export function CartProvider({ children }: React.PropsWithChildren) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const { user } = useSession();
  const userId = user?.id ?? null;
  const previousUser = useRef<number | null>(null);
  useEffect(() => {
    if (userId !== previousUser.current) setItems([]);
    previousUser.current = userId;
  }, [userId]);

  const add = (product: Product) => setItems(current => addToBasket(current, product));
  const remove = (id: number) => setItems(current => current.filter(item => item.product.id !== id));
  const setQuantity = (id: number, quantity: number) => setItems(current => setBasketQuantity(current, id, quantity));
  const reserve: Cart["reserve"] = (token, submitted) => setItems(current => reserveBasket(current, token, submitted));
  const finish: Cart["finish"] = (token, accepted) => setItems(current => finishBasketRequest(current, token, accepted));
  return <Context.Provider value={{ items, add, remove, setQuantity, reserve, finish }}>{children}</Context.Provider>;
}
