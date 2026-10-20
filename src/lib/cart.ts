import type { Id } from "../../convex/_generated/dataModel";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "../../convex/lib/limits";

/** What the browser keeps: which item, which size, how many. Never a price. */
export type CartLine = { menuItemId: Id<"menuItems">; sizeKey: string; quantity: number };

export type CartAction =
  | { type: "add"; menuItemId: Id<"menuItems">; sizeKey: string }
  | { type: "setQuantity"; menuItemId: Id<"menuItems">; sizeKey: string; quantity: number }
  | { type: "remove"; menuItemId: Id<"menuItems">; sizeKey: string }
  | { type: "clear" };

const same = (line: CartLine, id: Id<"menuItems">, sizeKey: string) =>
  line.menuItemId === id && line.sizeKey === sizeKey;

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const existing = lines.find((line) => same(line, action.menuItemId, action.sizeKey));
      if (existing) {
        return lines.map((line) =>
          line === existing ? { ...line, quantity: Math.min(line.quantity + 1, MAX_LINE_QUANTITY) } : line,
        );
      }
      if (lines.length >= MAX_ORDER_LINES) return lines;
      return [...lines, { menuItemId: action.menuItemId, sizeKey: action.sizeKey, quantity: 1 }];
    }
    case "setQuantity": {
      if (action.quantity < 1) return lines.filter((line) => !same(line, action.menuItemId, action.sizeKey));
      const quantity = Math.min(Math.floor(action.quantity), MAX_LINE_QUANTITY);
      return lines.map((line) => (same(line, action.menuItemId, action.sizeKey) ? { ...line, quantity } : line));
    }
    case "remove":
      return lines.filter((line) => !same(line, action.menuItemId, action.sizeKey));
    case "clear":
      return [];
  }
}

/** Drops anything malformed from storage (an old version, or someone editing it). */
export function sanitize(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (line): line is CartLine =>
        typeof line === "object" &&
        line !== null &&
        typeof line.menuItemId === "string" &&
        typeof line.sizeKey === "string" &&
        Number.isInteger(line.quantity) &&
        line.quantity >= 1,
    )
    .slice(0, MAX_ORDER_LINES)
    .map((line) => ({ ...line, quantity: Math.min(line.quantity, MAX_LINE_QUANTITY) }));
}

type MenuItemLike = {
  _id: Id<"menuItems">;
  name: string;
  soldOut: boolean;
  imageUrl: string | null;
  sizes: { key: string; label: string; price: number }[];
};

export type PricedCartLine = CartLine & {
  name: string;
  sizeLabel: string;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
  categoryColor: string;
  icon: string;
  /** Why it can't be ordered right now, or null. */
  problem: string | null;
};

/**
 * The cart as the visitor sees it, priced from the live menu. The backend
 * prices it again at checkout; this is only for showing totals.
 */
export function priceCart(
  lines: CartLine[],
  categories: { color: string; icon: string; items: MenuItemLike[] }[],
  deliveryFee: number,
  delivery: boolean,
) {
  const priced: PricedCartLine[] = lines.map((line) => {
    for (const category of categories) {
      const item = category.items.find((i) => i._id === line.menuItemId);
      if (!item) continue;
      const size = item.sizes.find((s) => s.key === line.sizeKey);
      const base = {
        ...line,
        name: item.name,
        imageUrl: item.imageUrl,
        categoryColor: category.color,
        icon: category.icon,
      };
      if (!size) return { ...base, sizeLabel: "", unitPrice: 0, lineTotal: 0, problem: "That size is gone" };
      return {
        ...base,
        sizeLabel: size.label,
        unitPrice: size.price,
        lineTotal: size.price * line.quantity,
        problem: item.soldOut ? "Sold out" : null,
      };
    }
    return {
      ...line,
      name: "Unavailable item",
      sizeLabel: "",
      unitPrice: 0,
      lineTotal: 0,
      imageUrl: null,
      categoryColor: "#9A8B7E",
      icon: "generic",
      problem: "No longer on the menu",
    };
  });
  const orderable = priced.filter((line) => line.problem === null);
  const subtotal = orderable.reduce((sum, line) => sum + line.lineTotal, 0);
  const fee = delivery && orderable.length > 0 ? deliveryFee : 0;
  return {
    lines: priced,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
    count: priced.reduce((sum, line) => sum + line.quantity, 0),
    blocked: priced.some((line) => line.problem !== null),
  };
}
