import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

export type Storefront = FunctionReturnType<typeof api.menu.storefront>;
export type Slide = Storefront["slides"][number];
export type MenuCategory = Storefront["categories"][number];
export type MenuItem = MenuCategory["items"][number];
export type SiteSettings = Storefront["settings"];
