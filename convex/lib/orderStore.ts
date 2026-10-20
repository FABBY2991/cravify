import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { randomInt, randomToken } from "./access";
import {
  DELIVERY_AREAS,
  MAX_LINE_QUANTITY,
  MAX_ORDER_LINES,
  NAME_MAX,
  NOTE_MAX,
} from "./limits";
import { type Fulfilment, nairobiDay, type OrderStatus } from "./orderFlow";

export type LineInput = { menuItemId: Id<"menuItems">; sizeKey: string; quantity: number };

export type PricedLine = {
  menuItemId: Id<"menuItems">;
  name: string;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
};

/**
 * Prices a cart from the database — never from anything the visitor sent
 * besides which item, which size and how many. Repeated item+size lines are
 * merged before the quantity limit applies.
 */
export async function priceOrder(
  ctx: QueryCtx,
  lines: LineInput[],
  fulfilment: Fulfilment,
  deliveryFee: number,
): Promise<PricedOrder> {
  if (lines.length === 0) throw new ConvexError("Your cart is empty");
  if (lines.length > MAX_ORDER_LINES) throw new ConvexError(`An order can have at most ${MAX_ORDER_LINES} lines`);

  const merged = new Map<string, LineInput>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new ConvexError("Quantities must be whole numbers of at least 1");
    }
    const key = `${line.menuItemId}:${line.sizeKey}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + line.quantity } : { ...line });
  }

  const priced: PricedLine[] = [];
  for (const line of merged.values()) {
    const item = await ctx.db.get("menuItems", line.menuItemId);
    const category = item && (await ctx.db.get("categories", item.categoryId));
    if (!item || !item.enabled || !category?.enabled) {
      throw new ConvexError("Something in your cart is no longer on the menu — remove it to continue");
    }
    if (item.soldOut) throw new ConvexError(`${item.name} just sold out — remove it to continue`);
    const size = item.sizes.find((s) => s.key === line.sizeKey);
    if (!size) throw new ConvexError(`That size of ${item.name} is no longer available — pick another`);
    if (line.quantity > MAX_LINE_QUANTITY) {
      throw new ConvexError(`You can order at most ${MAX_LINE_QUANTITY} of ${item.name} (${size.label})`);
    }
    priced.push({
      menuItemId: item._id,
      name: item.name,
      sizeLabel: size.label,
      unitPrice: size.price,
      quantity: line.quantity,
      lineTotal: size.price * line.quantity,
    });
  }

  const subtotal = priced.reduce((sum, line) => sum + line.lineTotal, 0);
  const fee = fulfilment === "delivery" ? deliveryFee : 0;
  return {
    lines: priced,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
    itemCount: priced.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/** Trims and checks what a visitor typed at checkout. */
export function checkCustomer(input: {
  customerName: string;
  fulfilment: Fulfilment;
  deliveryArea?: string;
  note?: string;
}) {
  const customerName = input.customerName.trim().replace(/\s+/g, " ");
  if (customerName.length === 0) throw new ConvexError("Add a name for the order");
  if (customerName.length > NAME_MAX) throw new ConvexError(`Keep the name under ${NAME_MAX} characters`);

  let deliveryArea: string | undefined;
  if (input.fulfilment === "delivery") {
    if (!input.deliveryArea || !DELIVERY_AREAS.includes(input.deliveryArea)) {
      throw new ConvexError("Pick a delivery area");
    }
    deliveryArea = input.deliveryArea;
  }

  const note = input.note?.trim() || undefined;
  if (note && note.length > NOTE_MAX) throw new ConvexError(`Keep the kitchen note under ${NOTE_MAX} characters`);
  return { customerName, deliveryArea, note };
}

/** A synthetic number in the unallocated +254 000 range: looks real, reaches nobody. */
export function demoPhone() {
  const part = () => String(randomInt(1000)).padStart(3, "0");
  return `+254 000 ${part()} ${part()}`;
}

async function uniqueCode(ctx: QueryCtx) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const digits = attempt < 5 ? 4 : 6;
    const code = `CR-${String(randomInt(10 ** digits)).padStart(digits, "0")}`;
    const taken = await ctx.db
      .query("orders")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (taken === null) return code;
  }
  throw new ConvexError("Couldn't number the order — try again");
}

export async function bumpStats(
  ctx: MutationCtx,
  day: string,
  change: { orders?: number; sales?: number; cancelled?: number },
) {
  const row = await ctx.db
    .query("dailyStats")
    .withIndex("by_day", (q) => q.eq("day", day))
    .unique();
  const next = {
    orders: (row?.orders ?? 0) + (change.orders ?? 0),
    sales: (row?.sales ?? 0) + (change.sales ?? 0),
    cancelled: (row?.cancelled ?? 0) + (change.cancelled ?? 0),
  };
  if (row) await ctx.db.patch("dailyStats", row._id, next);
  else await ctx.db.insert("dailyStats", { day, ...next });
}

/**
 * Stores a priced order and its lines and updates the day's totals. Sample
 * orders pass a status and timeline from the past; visitors' start Received.
 */
export async function createOrder(
  ctx: MutationCtx,
  order: {
    priced: PricedOrder;
    fulfilment: Fulfilment;
    customerName: string;
    deliveryArea?: string;
    note?: string;
    source: Doc<"orders">["source"];
    placedAt: number;
    timeline?: { status: OrderStatus; at: number }[];
  },
) {
  const timeline = order.timeline ?? [{ status: "received" as const, at: order.placedAt }];
  const status = timeline[timeline.length - 1].status;
  const day = nairobiDay(order.placedAt);
  const token = randomToken();
  const code = await uniqueCode(ctx);
  const { priced } = order;

  const orderId = await ctx.db.insert("orders", {
    token,
    code,
    status,
    fulfilment: order.fulfilment,
    customerName: order.customerName,
    demoPhone: demoPhone(),
    deliveryArea: order.deliveryArea,
    note: order.note,
    subtotal: priced.subtotal,
    deliveryFee: priced.deliveryFee,
    total: priced.total,
    itemCount: priced.itemCount,
    source: order.source,
    placedAt: order.placedAt,
    day,
    timeline,
    updatedAt: timeline[timeline.length - 1].at,
  });
  for (const line of priced.lines) await ctx.db.insert("orderItems", { orderId, ...line });

  const cancelled = status === "cancelled";
  await bumpStats(ctx, day, { orders: 1, sales: cancelled ? 0 : priced.total, cancelled: cancelled ? 1 : 0 });
  return { orderId, token, code };
}

export async function itemsOf(ctx: QueryCtx, orderId: Id<"orders">) {
  const rows = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
    .take(MAX_ORDER_LINES);
  return rows.map(({ name, sizeLabel, unitPrice, quantity, lineTotal }) => ({
    name,
    sizeLabel,
    unitPrice,
    quantity,
    lineTotal,
  }));
}
