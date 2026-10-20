import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { dropFile, imageUrl, refuseFile } from "./lib/images";
import {
  CATEGORY_ICONS,
  CATEGORY_NAME_MAX,
  DESCRIPTION_MAX,
  ITEM_NAME_MAX,
  MAX_CATEGORIES,
  MAX_ITEMS_PER_CATEGORY,
  MAX_PRICE,
  MAX_SIZES,
  MIN_PRICE,
  SIZE_LABEL_MAX,
} from "./lib/limits";
import { getSettings } from "./lib/settings";
import { checkColor, cleanText, slugify } from "./lib/text";

const direction = v.union(v.literal("up"), v.literal("down"));
const sizeInput = v.object({ label: v.string(), price: v.number() });

/** Everything the admin edits — including disabled categories, items and slides. */
export const adminCatalog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const categories = await ctx.db.query("categories").withIndex("by_position").take(MAX_CATEGORIES);
    const slides = await ctx.db.query("heroSlides").withIndex("by_position").take(MAX_CATEGORIES);
    return {
      categories: await Promise.all(
        categories.map(async (category) => {
          const items = await ctx.db
            .query("menuItems")
            .withIndex("by_categoryId_and_position", (q) => q.eq("categoryId", category._id))
            .take(MAX_ITEMS_PER_CATEGORY);
          return {
            ...category,
            items: await Promise.all(
              items.map(async (item) => ({ ...item, imageUrl: await imageUrl(ctx, item.imageId) })),
            ),
          };
        }),
      ),
      slides: await Promise.all(
        slides.map(async (slide) => ({
          ...slide,
          heroImageUrl: await imageUrl(ctx, slide.heroImageId),
          heroVideoUrl: await imageUrl(ctx, slide.heroVideoId),
          pieces: await Promise.all(
            slide.pieceImageIds.map(async (id) => ({ id, url: await ctx.storage.getUrl(id) })),
          ),
        })),
      ),
      settings: await getSettings(ctx),
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

function checkIcon(icon: string) {
  if (!(CATEGORY_ICONS as readonly string[]).includes(icon)) throw new ConvexError("Pick one of the listed icons");
  return icon;
}

/** Sizes as typed in the admin → stored sizes with stable keys taken from their names. */
export function checkSizes(sizes: { label: string; price: number }[]) {
  if (sizes.length === 0 || sizes.length > MAX_SIZES) {
    throw new ConvexError(`An item needs between 1 and ${MAX_SIZES} sizes`);
  }
  const checked = sizes.map((s) => {
    const label = cleanText(s.label, SIZE_LABEL_MAX, "A size name");
    if (!Number.isInteger(s.price) || s.price < MIN_PRICE || s.price > MAX_PRICE) {
      throw new ConvexError(`Prices must be whole KES between ${MIN_PRICE} and ${MAX_PRICE.toLocaleString("en")}`);
    }
    return { key: slugify(label) || "size", label, price: s.price };
  });
  if (new Set(checked.map((s) => s.key)).size !== checked.length) {
    throw new ConvexError("Two sizes can't share a name");
  }
  return checked;
}

async function lastCategoryPosition(ctx: MutationCtx) {
  const last = await ctx.db.query("categories").withIndex("by_position").order("desc").first();
  return last?.position ?? 0;
}

export const createCategory = mutation({
  args: { name: v.string(), icon: v.string(), color: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db.query("categories").take(MAX_CATEGORIES);
    if (existing.length >= MAX_CATEGORIES) throw new ConvexError(`The menu can have at most ${MAX_CATEGORIES} categories`);
    const name = cleanText(args.name, CATEGORY_NAME_MAX, "The category name");
    const base = slugify(name) || "category";
    let slug = base;
    for (let n = 2; existing.some((c) => c.slug === slug); n++) slug = `${base}-${n}`;

    const categoryId = await ctx.db.insert("categories", {
      name,
      slug,
      position: (await lastCategoryPosition(ctx)) + 1,
      enabled: true,
      icon: checkIcon(args.icon),
      color: checkColor(args.color),
    });
    // Every category gets a hero slide, off until it has its pictures.
    const lastSlide = await ctx.db.query("heroSlides").withIndex("by_position").order("desc").first();
    await ctx.db.insert("heroSlides", {
      categoryId,
      position: (lastSlide?.position ?? 0) + 1,
      enabled: false,
      headline: name.toUpperCase().slice(0, 16),
      kicker: "",
      pieceImageIds: [],
    });
    return categoryId;
  },
});

export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, { categoryId, ...change }) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get("categories", categoryId);
    if (category === null) throw new ConvexError("That category no longer exists");
    await ctx.db.patch("categories", categoryId, {
      ...(change.name !== undefined && { name: cleanText(change.name, CATEGORY_NAME_MAX, "The category name") }),
      ...(change.icon !== undefined && { icon: checkIcon(change.icon) }),
      ...(change.color !== undefined && { color: checkColor(change.color) }),
      ...(change.enabled !== undefined && { enabled: change.enabled }),
    });
    return null;
  },
});

export const moveCategory = mutation({
  args: { categoryId: v.id("categories"), direction },
  handler: async (ctx, { categoryId, direction }) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get("categories", categoryId);
    if (category === null) throw new ConvexError("That category no longer exists");
    const neighbour = await ctx.db
      .query("categories")
      .withIndex("by_position", (q) =>
        direction === "up" ? q.lt("position", category.position) : q.gt("position", category.position),
      )
      .order(direction === "up" ? "desc" : "asc")
      .first();
    if (neighbour === null) return null;
    await ctx.db.patch("categories", category._id, { position: neighbour.position });
    await ctx.db.patch("categories", neighbour._id, { position: category.position });
    return null;
  },
});

async function itemsIn(ctx: MutationCtx, categoryId: Id<"categories">) {
  return await ctx.db
    .query("menuItems")
    .withIndex("by_categoryId_and_position", (q) => q.eq("categoryId", categoryId))
    .take(MAX_ITEMS_PER_CATEGORY + 1);
}

export const createItem = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.string(),
    sizes: v.array(sizeInput),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const category = await ctx.db.get("categories", args.categoryId);
    if (category === null) throw new ConvexError("That category no longer exists");
    const items = await itemsIn(ctx, args.categoryId);
    if (items.length >= MAX_ITEMS_PER_CATEGORY) {
      throw new ConvexError(`A category can have at most ${MAX_ITEMS_PER_CATEGORY} items`);
    }
    return await ctx.db.insert("menuItems", {
      categoryId: args.categoryId,
      name: cleanText(args.name, ITEM_NAME_MAX, "The item name"),
      description: cleanText(args.description, DESCRIPTION_MAX, "The description", true),
      position: (items.at(-1)?.position ?? 0) + 1,
      sizes: checkSizes(args.sizes),
      enabled: true,
      soldOut: false,
    });
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("menuItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sizes: v.optional(v.array(sizeInput)),
    enabled: v.optional(v.boolean()),
    soldOut: v.optional(v.boolean()),
  },
  handler: async (ctx, { itemId, ...change }) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get("menuItems", itemId);
    if (item === null) throw new ConvexError("That item no longer exists");
    await ctx.db.patch("menuItems", itemId, {
      ...(change.name !== undefined && { name: cleanText(change.name, ITEM_NAME_MAX, "The item name") }),
      ...(change.description !== undefined && {
        description: cleanText(change.description, DESCRIPTION_MAX, "The description", true),
      }),
      ...(change.sizes !== undefined && { sizes: checkSizes(change.sizes) }),
      ...(change.enabled !== undefined && { enabled: change.enabled }),
      ...(change.soldOut !== undefined && { soldOut: change.soldOut }),
    });
    return null;
  },
});

export const moveItem = mutation({
  args: { itemId: v.id("menuItems"), direction },
  handler: async (ctx, { itemId, direction }) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get("menuItems", itemId);
    if (item === null) throw new ConvexError("That item no longer exists");
    const neighbour = await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId_and_position", (q) =>
        direction === "up"
          ? q.eq("categoryId", item.categoryId).lt("position", item.position)
          : q.eq("categoryId", item.categoryId).gt("position", item.position),
      )
      .order(direction === "up" ? "desc" : "asc")
      .first();
    if (neighbour === null) return null;
    await ctx.db.patch("menuItems", item._id, { position: neighbour.position });
    await ctx.db.patch("menuItems", neighbour._id, { position: item.position });
    return null;
  },
});

/** Removes an item for good. Past orders keep their own copy of its name and price. */
export const deleteItem = mutation({
  args: { itemId: v.id("menuItems") },
  handler: async (ctx, { itemId }) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get("menuItems", itemId);
    if (item === null) return null;
    const slides: Doc<"heroSlides">[] = await ctx.db
      .query("heroSlides")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", item.categoryId))
      .take(10);
    for (const slide of slides) {
      if (slide.featuredItemId === itemId) await ctx.db.patch("heroSlides", slide._id, { featuredItemId: undefined });
    }
    await dropFile(ctx, item.imageId);
    await ctx.db.delete("menuItems", itemId);
    return null;
  },
});

/**
 * Sets, replaces (deleting the old file) or removes an item's photo. Returns
 * null, or why the upload was refused.
 */
export const setItemImage = mutation({
  args: { itemId: v.id("menuItems"), storageId: v.union(v.id("_storage"), v.null()) },
  handler: async (ctx, { itemId, storageId }) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get("menuItems", itemId);
    if (item === null) throw new ConvexError("That item no longer exists");
    if (storageId !== null) {
      const refused = await refuseFile(ctx, storageId);
      if (refused) return refused;
    }
    if (item.imageId !== storageId) await dropFile(ctx, item.imageId);
    await ctx.db.patch("menuItems", itemId, { imageId: storageId ?? undefined });
    return null;
  },
});
