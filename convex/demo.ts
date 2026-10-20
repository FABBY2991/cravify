import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Fulfilment, OrderStatus } from "./lib/orderFlow";
import { createOrder, priceOrder } from "./lib/orderStore";
import { getSettings } from "./lib/settings";

const MINUTE = 60_000;

/** Synthetic customers for the demo board — invented names, no contact details. */
const SAMPLES: {
  name: string;
  fulfilment: Fulfilment;
  area?: string;
  note?: string;
  minutesAgo: number;
  reached: OrderStatus[];
}[] = [
  { name: "Amani K.", fulfilment: "delivery", area: "Westlands", minutesAgo: 3, reached: ["received"] },
  { name: "Wanjiru M.", fulfilment: "pickup", note: "No onions, please", minutesAgo: 6, reached: ["received"] },
  { name: "Otieno B.", fulfilment: "delivery", area: "Kilimani", minutesAgo: 12, reached: ["received", "preparing"] },
  { name: "Zawadi N.", fulfilment: "pickup", minutesAgo: 19, reached: ["received", "preparing", "ready"] },
  {
    name: "Baraka T.",
    fulfilment: "delivery",
    area: "Parklands",
    minutesAgo: 27,
    reached: ["received", "preparing", "out_for_delivery"],
  },
  { name: "Achieng O.", fulfilment: "pickup", minutesAgo: 52, reached: ["received", "preparing", "ready", "completed"] },
  {
    name: "Mutua J.",
    fulfilment: "delivery",
    area: "Lavington",
    minutesAgo: 81,
    reached: ["received", "preparing", "out_for_delivery", "completed"],
  },
  { name: "Nyokabi W.", fulfilment: "pickup", minutesAgo: 64, reached: ["received", "cancelled"] },
];

/** Lays out the sample orders, priced from the current menu like any real order. */
export async function seedSampleOrders(ctx: MutationCtx) {
  const menu: Doc<"menuItems">[] = [];
  for (const category of await ctx.db.query("categories").withIndex("by_position").take(20)) {
    if (!category.enabled) continue;
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId_and_position", (q) => q.eq("categoryId", category._id))
      .take(40);
    menu.push(...items.filter((item) => item.enabled && !item.soldOut));
  }
  if (menu.length === 0) return 0;

  const { deliveryFee } = await getSettings(ctx);
  const now = Date.now();
  for (const [i, sample] of SAMPLES.entries()) {
    const picks = [menu[(i * 3) % menu.length], menu[(i * 7 + 4) % menu.length]];
    const lines = picks.map((item, j) => ({
      menuItemId: item._id,
      sizeKey: item.sizes[(i + j) % item.sizes.length].key,
      quantity: 1 + ((i + j) % 2),
    }));
    const priced = await priceOrder(ctx, lines, sample.fulfilment, deliveryFee);
    const placedAt = now - sample.minutesAgo * MINUTE;
    const timeline = sample.reached.map((status, step) => ({
      status,
      at: Math.min(placedAt + step * 5 * MINUTE, now),
    }));
    await createOrder(ctx, {
      priced,
      fulfilment: sample.fulfilment,
      customerName: sample.name,
      deliveryArea: sample.area,
      note: sample.note,
      source: "sample",
      placedAt,
      timeline,
    });
  }
  return SAMPLES.length;
}

const BATCH = 50;

/** Deletes orders, their lines and the daily totals in batches, then re-seeds samples. */
export const clearOrders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").take(BATCH);
    for (const order of orders) {
      const lines = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .take(100);
      for (const line of lines) await ctx.db.delete("orderItems", line._id);
      await ctx.db.delete("orders", order._id);
    }
    const stats = orders.length < BATCH ? await ctx.db.query("dailyStats").take(BATCH) : [];
    for (const row of stats) await ctx.db.delete("dailyStats", row._id);

    if (orders.length === BATCH || stats.length === BATCH) {
      await ctx.scheduler.runAfter(0, internal.demo.clearOrders, {});
      return null;
    }
    await seedSampleOrders(ctx);
    return null;
  },
});

const KEEP_DAYS = 30;

/** Daily housekeeping: demo orders older than 30 days are deleted. */
export const purgeOld = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * MINUTE;
    const old = await ctx.db
      .query("orders")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .take(BATCH);
    for (const order of old) {
      const lines = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
        .take(100);
      for (const line of lines) await ctx.db.delete("orderItems", line._id);
      await ctx.db.delete("orders", order._id);
    }
    if (old.length === BATCH) await ctx.scheduler.runAfter(0, internal.demo.purgeOld, {});
    return null;
  },
});
