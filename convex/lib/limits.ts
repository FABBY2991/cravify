/** Checkout limits — the backend enforces these; the site mirrors them. */
export const MAX_ORDER_LINES = 20;
export const MAX_LINE_QUANTITY = 10;
export const NAME_MAX = 40;
export const NOTE_MAX = 140;

/** Menu limits. */
export const MAX_SIZES = 4;
export const MIN_PRICE = 50;
export const MAX_PRICE = 100_000;
export const ITEM_NAME_MAX = 60;
export const DESCRIPTION_MAX = 240;
export const CATEGORY_NAME_MAX = 30;
export const HEADLINE_MAX = 16;
export const KICKER_MAX = 60;
export const MAX_PIECES = 4;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/png", "image/webp", "image/jpeg", "image/avif"];
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const CREDIT_MAX = 80;

/**
 * Demo delivery is to a neighbourhood, never a street address: nobody should
 * type their real home into a concept site whose orders are never delivered.
 */
export const DELIVERY_AREAS = [
  "Westlands",
  "Kilimani",
  "Kileleshwa",
  "Lavington",
  "Parklands",
  "CBD",
  "Upper Hill",
  "Karen",
];

export const CATEGORY_ICONS = ["burger", "pizza", "chicken", "shake", "dessert", "fries", "drink", "generic"] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const MAX_CATEGORIES = 12;
export const MAX_ITEMS_PER_CATEGORY = 40;
export const SIZE_LABEL_MAX = 20;
