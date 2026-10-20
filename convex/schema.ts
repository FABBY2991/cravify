import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orderStatus = v.union(
  v.literal("received"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("out_for_delivery"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const fulfilment = v.union(v.literal("pickup"), v.literal("delivery"));

/** One way to buy an item — "Regular", or "Small"/"Large" — and its KES price. */
export const size = v.object({ key: v.string(), label: v.string(), price: v.number() });

export default defineSchema({
  ...authTables,

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    position: v.number(),
    enabled: v.boolean(),
    icon: v.string(),
    /** The category's colour: its hero slide's background and its menu tiles. */
    color: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_position", ["position"]),

  menuItems: defineTable({
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.string(),
    position: v.number(),
    /** 1–4 sizes. Prices are whole KES. */
    sizes: v.array(size),
    imageId: v.optional(v.id("_storage")),
    enabled: v.boolean(),
    soldOut: v.boolean(),
  }).index("by_categoryId_and_position", ["categoryId", "position"]),

  /** One full-screen slide in the hero, belonging to a category. */
  heroSlides: defineTable({
    categoryId: v.id("categories"),
    position: v.number(),
    enabled: v.boolean(),
    /** The oversized word the food sits in front of, e.g. "BURGERLICIOUS". */
    headline: v.string(),
    /** The small line above it, e.g. "Double smash burger". */
    kicker: v.string(),
    /** The item on the slide's product card. */
    featuredItemId: v.optional(v.id("menuItems")),
    /** The food cut-out (transparent PNG/WebP) that overlaps the headline. */
    heroImageId: v.optional(v.id("_storage")),
    /** Up to 4 loose ingredient cut-outs that float around the food. */
    pieceImageIds: v.array(v.id("_storage")),
    /**
     * Optional looping clip shown instead of the cut-out (the cut-out becomes
     * its still frame for reduced motion). Best on a matching dark slide.
     */
    heroVideoId: v.optional(v.id("_storage")),
    /** Optional small credit on the slide, e.g. "Burger animation: @someone". */
    credit: v.optional(v.string()),
  })
    .index("by_position", ["position"])
    .index("by_categoryId", ["categoryId"]),

  settings: defineTable({
    key: v.literal("site"),
    deliveryFee: v.number(),
    hours: v.string(),
    location: v.string(),
    /** Who the "concept project by …" credit names, and where it links. */
    creditName: v.string(),
    creditUrl: v.string(),
  }).index("by_key", ["key"]),

  orders: defineTable({
    /** The secret in the tracking link. Never shown to anyone but its customer. */
    token: v.string(),
    /** Short human code, e.g. "CR-4821". */
    code: v.string(),
    status: orderStatus,
    fulfilment,
    customerName: v.string(),
    /** Synthetic, unallocated +254 000 … number: demo orders collect no real phones. */
    demoPhone: v.string(),
    deliveryArea: v.optional(v.string()),
    note: v.optional(v.string()),
    subtotal: v.number(),
    deliveryFee: v.number(),
    total: v.number(),
    itemCount: v.number(),
    /** "sample" orders are seeded for the demo; "visitor" ones came through checkout. */
    source: v.union(v.literal("visitor"), v.literal("sample")),
    placedAt: v.number(),
    /** Nairobi calendar day the order was placed, for the Today strip. */
    day: v.string(),
    /** When each status was reached — at most 5 entries. */
    timeline: v.array(v.object({ status: orderStatus, at: v.number() })),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_code", ["code"])
    .index("by_status", ["status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    menuItemId: v.id("menuItems"),
    /** Name, size and price as they were when ordered. */
    name: v.string(),
    sizeLabel: v.string(),
    unitPrice: v.number(),
    quantity: v.number(),
    lineTotal: v.number(),
  }).index("by_orderId", ["orderId"]),

  /** Running totals per Nairobi day, kept by the order mutations (no counting scans). */
  dailyStats: defineTable({
    day: v.string(),
    orders: v.number(),
    /** Demo sales: totals of that day's orders that weren't cancelled. Not real money. */
    sales: v.number(),
    cancelled: v.number(),
  }).index("by_day", ["day"]),
});
