import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkCustomer, createOrder, itemsOf, priceOrder } from "./lib/orderStore";
import { getSettings } from "./lib/settings";
import { rateLimiter } from "./rateLimits";
import { fulfilment } from "./schema";

/**
 * Guest checkout. The visitor sends which items, sizes and quantities they
 * want plus the total they were shown; the backend prices it again from the
 * database and refuses if the two disagree, so a stale or tampered cart can
 * never set its own price.
 */
export const place = mutation({
  args: {
    visitorId: v.string(),
    lines: v.array(
      v.object({ menuItemId: v.id("menuItems"), sizeKey: v.string(), quantity: v.number() }),
    ),
    fulfilment,
    customerName: v.string(),
    deliveryArea: v.optional(v.string()),
    note: v.optional(v.string()),
    expectedTotal: v.number(),
  },
  handler: async (ctx, args) => {
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(args.visitorId)) throw new ConvexError("Reload the page and try again");
    await rateLimiter.limit(ctx, "placeOrderSitewide", { throws: true });
    await rateLimiter.limit(ctx, "placeOrder", { key: args.visitorId, throws: true });

    const customer = checkCustomer(args);
    const settings = await getSettings(ctx);
    const priced = await priceOrder(ctx, args.lines, args.fulfilment, settings.deliveryFee);
    if (priced.total !== args.expectedTotal) {
      throw new ConvexError("Prices changed while you were checking out — review your cart and place the order again");
    }

    const { token, code } = await createOrder(ctx, {
      priced,
      fulfilment: args.fulfilment,
      ...customer,
      source: "visitor",
      placedAt: Date.now(),
    });
    return { token, code };
  },
});

/**
 * The tracking page's view of one order. Only someone holding the order's
 * secret token gets it, and it leaves out the contact number.
 */
export const track = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!/^[A-Za-z0-9_-]{24}$/.test(token)) return null;
    const order = await ctx.db
      .query("orders")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (order === null) return null;
    return {
      code: order.code,
      status: order.status,
      fulfilment: order.fulfilment,
      customerName: order.customerName,
      deliveryArea: order.deliveryArea ?? null,
      note: order.note ?? null,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      placedAt: order.placedAt,
      timeline: order.timeline,
      items: await itemsOf(ctx, order._id),
    };
  },
});
