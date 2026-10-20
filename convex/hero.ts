import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { dropFile, refuseFile } from "./lib/images";
import { CREDIT_MAX, HEADLINE_MAX, KICKER_MAX, MAX_PIECES } from "./lib/limits";
import { cleanText } from "./lib/text";

export const updateSlide = mutation({
  args: {
    slideId: v.id("heroSlides"),
    enabled: v.optional(v.boolean()),
    headline: v.optional(v.string()),
    kicker: v.optional(v.string()),
    featuredItemId: v.optional(v.union(v.id("menuItems"), v.null())),
    credit: v.optional(v.string()),
  },
  handler: async (ctx, { slideId, ...change }) => {
    await requireAdmin(ctx);
    const slide = await ctx.db.get("heroSlides", slideId);
    if (slide === null) throw new ConvexError("That slide no longer exists");
    if (change.featuredItemId) {
      const item = await ctx.db.get("menuItems", change.featuredItemId);
      if (item === null || item.categoryId !== slide.categoryId) {
        throw new ConvexError("A slide can only feature an item from its own category");
      }
    }
    await ctx.db.patch("heroSlides", slideId, {
      ...(change.enabled !== undefined && { enabled: change.enabled }),
      ...(change.headline !== undefined && {
        headline: cleanText(change.headline, HEADLINE_MAX, "The headline").replace(/\s/g, "").toUpperCase(),
      }),
      ...(change.kicker !== undefined && { kicker: cleanText(change.kicker, KICKER_MAX, "The line above", true) }),
      ...(change.featuredItemId !== undefined && { featuredItemId: change.featuredItemId ?? undefined }),
      ...(change.credit !== undefined && {
        credit: cleanText(change.credit, CREDIT_MAX, "The credit", true) || undefined,
      }),
    });
    return null;
  },
});

export const moveSlide = mutation({
  args: { slideId: v.id("heroSlides"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, { slideId, direction }) => {
    await requireAdmin(ctx);
    const slide = await ctx.db.get("heroSlides", slideId);
    if (slide === null) throw new ConvexError("That slide no longer exists");
    const neighbour = await ctx.db
      .query("heroSlides")
      .withIndex("by_position", (q) =>
        direction === "up" ? q.lt("position", slide.position) : q.gt("position", slide.position),
      )
      .order(direction === "up" ? "desc" : "asc")
      .first();
    if (neighbour === null) return null;
    await ctx.db.patch("heroSlides", slide._id, { position: neighbour.position });
    await ctx.db.patch("heroSlides", neighbour._id, { position: slide.position });
    return null;
  },
});

/**
 * Sets, replaces (deleting the old file) or removes the slide's food cut-out.
 * Returns null, or why the upload was refused.
 */
export const setHeroImage = mutation({
  args: { slideId: v.id("heroSlides"), storageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, { slideId, storageId }) => {
    await requireAdmin(ctx);
    const slide = await ctx.db.get("heroSlides", slideId);
    if (slide === null) throw new ConvexError("That slide no longer exists");
    if (storageId !== null) {
      const refused = await refuseFile(ctx, storageId);
      if (refused) return refused;
    }
    if (slide.heroImageId !== storageId) await dropFile(ctx, slide.heroImageId);
    await ctx.db.patch("heroSlides", slideId, { heroImageId: storageId ?? undefined });
    return null;
  },
});

/**
 * Sets, replaces (deleting the old file) or removes the slide's looping clip.
 * Returns null, or why the upload was refused.
 */
export const setHeroVideo = mutation({
  args: { slideId: v.id("heroSlides"), storageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, { slideId, storageId }) => {
    await requireAdmin(ctx);
    const slide = await ctx.db.get("heroSlides", slideId);
    if (slide === null) throw new ConvexError("That slide no longer exists");
    if (storageId !== null) {
      const refused = await refuseFile(ctx, storageId, "video");
      if (refused) return refused;
    }
    if (slide.heroVideoId !== storageId) await dropFile(ctx, slide.heroVideoId);
    await ctx.db.patch("heroSlides", slideId, { heroVideoId: storageId ?? undefined });
    return null;
  },
});

/** Adds a floating piece. Returns null, or why the upload was refused. */
export const addPiece = mutation({
  args: { slideId: v.id("heroSlides"), storageId: v.id("_storage") },
  handler: async (ctx, { slideId, storageId }) => {
    await requireAdmin(ctx);
    const slide = await ctx.db.get("heroSlides", slideId);
    if (slide === null) throw new ConvexError("That slide no longer exists");
    if (slide.pieceImageIds.length >= MAX_PIECES) {
      await ctx.storage.delete(storageId);
      return `A slide can have at most ${MAX_PIECES} floating pieces`;
    }
    const refused = await refuseFile(ctx, storageId);
    if (refused) return refused;
    await ctx.db.patch("heroSlides", slideId, { pieceImageIds: [...slide.pieceImageIds, storageId] });
    return null;
  },
});

export const removePiece = mutation({
  args: { slideId: v.id("heroSlides"), storageId: v.id("_storage") },
  handler: async (ctx, { slideId, storageId }) => {
    await requireAdmin(ctx);
    const slide = await ctx.db.get("heroSlides", slideId);
    if (slide === null) throw new ConvexError("That slide no longer exists");
    if (!slide.pieceImageIds.includes(storageId)) return null;
    await ctx.db.patch("heroSlides", slideId, {
      pieceImageIds: slide.pieceImageIds.filter((id) => id !== storageId),
    });
    await dropFile(ctx, storageId);
    return null;
  },
});
