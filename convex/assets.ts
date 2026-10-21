import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { dropFile, refuseFile } from "./lib/images";
import { MAX_PIECES } from "./lib/limits";

/**
 * Used by scripts/import-images.mjs, run from the CLI with deployment access
 * (`npx convex run`), never from the browser: the admin uploads through the
 * admin-checked mutations in catalog.ts and hero.ts instead.
 */
export const uploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

/** A category's slide: the one with this headline, or else its first. */
async function slideFor(ctx: MutationCtx, categorySlug: string, headline?: string) {
  const category = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q) => q.eq("slug", categorySlug))
    .unique();
  if (category === null) throw new ConvexError(`No category with slug ${categorySlug}`);
  const slides = await ctx.db
    .query("heroSlides")
    .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
    .take(20);
  const slide = headline === undefined ? slides[0] : slides.find((s) => s.headline === headline);
  if (slide === undefined) {
    throw new ConvexError(`${category.name} has no hero slide${headline === undefined ? "" : ` called ${headline}`}`);
  }
  return { category, slide };
}

/** Points an item photo, hero cut-out, hero clip or floating piece at a stored file. */
export const attach = internalMutation({
  args: {
    storageId: v.id("_storage"),
    target: v.union(
      v.object({ kind: v.literal("item"), categorySlug: v.string(), itemName: v.string() }),
      v.object({ kind: v.literal("heroImage"), categorySlug: v.string(), headline: v.optional(v.string()) }),
      v.object({ kind: v.literal("heroVideo"), categorySlug: v.string(), headline: v.optional(v.string()) }),
      v.object({ kind: v.literal("piece"), categorySlug: v.string(), headline: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, { storageId, target }) => {
    const refused = await refuseFile(ctx, storageId, target.kind === "heroVideo" ? "video" : "image");
    if (refused) return refused;
    const { category, slide } = await slideFor(ctx, target.categorySlug, "headline" in target ? target.headline : undefined);

    switch (target.kind) {
      case "item": {
        const items = await ctx.db
          .query("menuItems")
          .withIndex("by_categoryId_and_position", (q) => q.eq("categoryId", category._id))
          .take(50);
        const item = items.find((i) => i.name === target.itemName);
        if (!item) throw new ConvexError(`No item called ${target.itemName} in ${category.name}`);
        if (item.imageId !== storageId) await dropFile(ctx, item.imageId);
        await ctx.db.patch("menuItems", item._id, { imageId: storageId });
        return null;
      }
      case "heroImage":
        if (slide.heroImageId !== storageId) await dropFile(ctx, slide.heroImageId);
        await ctx.db.patch("heroSlides", slide._id, { heroImageId: storageId });
        return null;
      case "heroVideo":
        if (slide.heroVideoId !== storageId) await dropFile(ctx, slide.heroVideoId);
        await ctx.db.patch("heroSlides", slide._id, { heroVideoId: storageId });
        return null;
      case "piece":
        if (slide.pieceImageIds.length >= MAX_PIECES) {
          await ctx.storage.delete(storageId);
          return `${category.name} already has ${MAX_PIECES} pieces`;
        }
        await ctx.db.patch("heroSlides", slide._id, { pieceImageIds: [...slide.pieceImageIds, storageId] });
        return null;
    }
  },
});

/** Clears a slide's floating pieces (deleting their files) before a re-import. */
export const clearPieces = internalMutation({
  args: { categorySlug: v.string(), headline: v.optional(v.string()) },
  handler: async (ctx, { categorySlug, headline }) => {
    const { slide } = await slideFor(ctx, categorySlug, headline);
    for (const id of slide.pieceImageIds) await dropFile(ctx, id);
    await ctx.db.patch("heroSlides", slide._id, { pieceImageIds: [] });
    return slide.pieceImageIds.length;
  },
});
