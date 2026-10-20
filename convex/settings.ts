import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { MAX_PRICE } from "./lib/limits";
import { cleanText } from "./lib/text";

export const update = mutation({
  args: {
    deliveryFee: v.number(),
    hours: v.string(),
    location: v.string(),
    creditName: v.string(),
    creditUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(args.deliveryFee) || args.deliveryFee < 0 || args.deliveryFee > MAX_PRICE) {
      throw new ConvexError("The delivery fee must be whole KES, 0 or more");
    }
    const creditUrl = args.creditUrl.trim();
    if (creditUrl && !/^https:\/\/[^\s]+$/.test(creditUrl)) {
      throw new ConvexError("The credit link must start with https://");
    }
    const values = {
      deliveryFee: args.deliveryFee,
      hours: cleanText(args.hours, 80, "Opening hours"),
      location: cleanText(args.location, 80, "The location"),
      creditName: cleanText(args.creditName, 40, "The credit name"),
      creditUrl,
    };
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique();
    if (row) await ctx.db.patch("settings", row._id, values);
    else await ctx.db.insert("settings", { key: "site", ...values });
    return null;
  },
});
