import type { QueryCtx } from "../_generated/server";

export const DEFAULT_SETTINGS = {
  deliveryFee: 150,
  hours: "Every day, 10:00 – 23:00",
  location: "Westlands, Nairobi (demo location)",
  creditName: "Fabian",
  creditUrl: "https://github.com/FABBY2991",
};

export type SiteSettings = typeof DEFAULT_SETTINGS;

/** The site settings, or the defaults before an admin has saved any. */
export async function getSettings(ctx: QueryCtx): Promise<SiteSettings> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "site"))
    .unique();
  if (row === null) return DEFAULT_SETTINGS;
  const { deliveryFee, hours, location, creditName, creditUrl } = row;
  return { deliveryFee, hours, location, creditName, creditUrl };
}
