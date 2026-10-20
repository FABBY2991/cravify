import type { Doc } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { imageUrl } from "./lib/images";
import { MAX_CATEGORIES, MAX_ITEMS_PER_CATEGORY } from "./lib/limits";
import { getSettings } from "./lib/settings";

async function publicItem(ctx: QueryCtx, item: Doc<"menuItems">) {
  return {
    _id: item._id,
    name: item.name,
    description: item.description,
    sizes: item.sizes,
    soldOut: item.soldOut,
    imageUrl: await imageUrl(ctx, item.imageId),
  };
}

/**
 * Everything the public site shows, in one live query: enabled categories
 * and items, enabled hero slides, and the site settings. When an admin edits
 * any of it, every open page updates.
 */
export const storefront = query({
  args: {},
  handler: async (ctx) => {
    const categories = (await ctx.db.query("categories").withIndex("by_position").take(MAX_CATEGORIES)).filter(
      (category) => category.enabled,
    );

    const menu = await Promise.all(
      categories.map(async (category) => {
        const items = await ctx.db
          .query("menuItems")
          .withIndex("by_categoryId_and_position", (q) => q.eq("categoryId", category._id))
          .take(MAX_ITEMS_PER_CATEGORY);
        return {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          color: category.color,
          items: await Promise.all(items.filter((item) => item.enabled).map((item) => publicItem(ctx, item))),
        };
      }),
    );

    const slides = [];
    for (const slide of await ctx.db.query("heroSlides").withIndex("by_position").take(MAX_CATEGORIES)) {
      const category = categories.find((c) => c._id === slide.categoryId);
      if (!slide.enabled || !category) continue;
      const featured = slide.featuredItemId ? await ctx.db.get("menuItems", slide.featuredItemId) : null;
      slides.push({
        _id: slide._id,
        categoryName: category.name,
        categorySlug: category.slug,
        icon: category.icon,
        color: category.color,
        headline: slide.headline,
        kicker: slide.kicker,
        heroImageUrl: await imageUrl(ctx, slide.heroImageId),
        heroVideoUrl: await imageUrl(ctx, slide.heroVideoId),
        credit: slide.credit ?? "",
        pieceUrls: (await Promise.all(slide.pieceImageIds.map((id) => ctx.storage.getUrl(id)))).filter(
          (url): url is string => url !== null,
        ),
        featured: featured?.enabled ? await publicItem(ctx, featured) : null,
      });
    }

    return { categories: menu, slides, settings: await getSettings(ctx) };
  },
});
