import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { isAdminEmail, requireAdmin } from "./lib/access";
import { ACTIVE_STATUSES, canMove, ORDER_STATUSES, type OrderStatus, STATUS_LABEL } from "./lib/orderFlow";
import { bumpStats, itemsOf } from "./lib/orderStore";
import { orderStatus } from "./schema";

/** Who is signed in, and whether they're an admin. Reveals only the caller's own email. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get("users", userId);
    if (user === null) return null;
    return {
      email: user.email ?? null,
      isAdmin: !!user.emailVerificationTime && isAdminEmail(user.email),
    };
  },
});

const filters = {
  active: ACTIVE_STATUSES,
  completed: ["completed"],
  cancelled: ["cancelled"],
  all: ORDER_STATUSES,
} satisfies Record<string, OrderStatus[]>;

/** The orders board: newest first, with customer details (admins only). */
export const orders = query({
  args: {
    filter: v.union(v.literal("active"), v.literal("completed"), v.literal("cancelled"), v.literal("all")),
  },
  handler: async (ctx, { filter }) => {
    await requireAdmin(ctx);
    const statuses = filters[filter];
    const perStatus = filter === "all" ? 25 : 80;
    const rows: Doc<"orders">[] = [];
    for (const status of statuses) {
      rows.push(
        ...(await ctx.db
          .query("orders")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .take(perStatus)),
      );
    }
    rows.sort((a, b) => b.placedAt - a.placedAt);
    return await Promise.all(
      rows.map(async (order) => ({
        _id: order._id,
        token: order.token,
        code: order.code,
        status: order.status,
        fulfilment: order.fulfilment,
        customerName: order.customerName,
        demoPhone: order.demoPhone,
        deliveryArea: order.deliveryArea ?? null,
        note: order.note ?? null,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        itemCount: order.itemCount,
        source: order.source,
        placedAt: order.placedAt,
        timeline: order.timeline,
        items: await itemsOf(ctx, order._id),
      })),
    );
  },
});

/** The Today strip for a Nairobi day the browser passes in ("2026-10-20"). */
export const today = query({
  args: { day: v.string() },
  handler: async (ctx, { day }) => {
    await requireAdmin(ctx);
    const row = await ctx.db
      .query("dailyStats")
      .withIndex("by_day", (q) => q.eq("day", day))
      .unique();
    return { orders: row?.orders ?? 0, sales: row?.sales ?? 0, cancelled: row?.cancelled ?? 0 };
  },
});

/** Moves an order one step on, or cancels it — only along the allowed path. */
export const setStatus = mutation({
  args: { orderId: v.id("orders"), status: orderStatus },
  handler: async (ctx, { orderId, status }) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get("orders", orderId);
    if (order === null) throw new ConvexError("That order no longer exists");
    if (!canMove(order.status, status, order.fulfilment)) {
      throw new ConvexError(`An order can't go from ${STATUS_LABEL[order.status]} to ${STATUS_LABEL[status]}`);
    }
    const now = Date.now();
    await ctx.db.patch("orders", orderId, {
      status,
      timeline: [...order.timeline, { status, at: now }],
      updatedAt: now,
    });
    if (status === "cancelled") await bumpStats(ctx, order.day, { sales: -order.total, cancelled: 1 });
    return null;
  },
});

/**
 * Wipes every order and the daily totals, then lays out fresh sample orders.
 * Touches nothing on the menu, the hero or the images.
 */
export const resetDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.demo.clearOrders, {});
    return null;
  },
});
