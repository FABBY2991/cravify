"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { type CartAction, type CartLine, cartReducer, sanitize } from "@/lib/cart";
import { readStored, writeStored } from "@/lib/storage";

type Cart = {
  lines: CartLine[];
  dispatch: (action: CartAction) => void;
  add: (menuItemId: Id<"menuItems">, sizeKey: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Bumps on every add, so the cart button can give a little pop. */
  pulse: number;
};

const CartContext = createContext<Cart | null>(null);
const KEY = "cravify.cart";

export function CartProvider({ children }: { children: ReactNode }) {
  // The storefront only renders in the browser (the server sends the loading
  // skeleton), so the saved cart can be read as the reducer starts.
  const [lines, dispatch] = useReducer(cartReducer, null, () => sanitize(readStored<unknown>(KEY, [])));
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => writeStored(KEY, lines), [lines]);

  const add = useCallback((menuItemId: Id<"menuItems">, sizeKey: string) => {
    dispatch({ type: "add", menuItemId, sizeKey });
    setPulse((p) => p + 1);
  }, []);

  const value = useMemo(() => ({ lines, dispatch, add, open, setOpen, pulse }), [lines, add, open, pulse]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside <CartProvider>");
  return cart;
}
