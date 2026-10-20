import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES } from "./limits";

/** A stored file's public URL, or null when there isn't one. */
export async function imageUrl(ctx: QueryCtx, id: Id<"_storage"> | undefined) {
  return id ? await ctx.storage.getUrl(id) : null;
}

export const BAD_IMAGE = "Images must be PNG, WebP, JPEG or AVIF and at most 5 MB";
export const BAD_VIDEO = "Videos must be MP4 or WebM and at most 20 MB";

const RULES = {
  image: { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES, problem: BAD_IMAGE },
  video: { types: VIDEO_TYPES, maxBytes: MAX_VIDEO_BYTES, problem: BAD_VIDEO },
};

/**
 * Checks a fresh upload really is a web image (or video) of sane size before
 * anything points at it. A refused upload is deleted and the problem
 * *returned*, not thrown: throwing would roll the delete back and strand it.
 */
export async function refuseFile(ctx: MutationCtx, storageId: Id<"_storage">, kind: keyof typeof RULES = "image") {
  const file = await ctx.db.system.get("_storage", storageId);
  if (file === null) throw new ConvexError("The upload didn't arrive — try again");
  const rule = RULES[kind];
  if (!file.contentType || !rule.types.includes(file.contentType) || file.size > rule.maxBytes) {
    await ctx.storage.delete(storageId);
    return rule.problem;
  }
  return null;
}

/** Deletes a replaced file, if there was one. */
export async function dropFile(ctx: MutationCtx, storageId: Id<"_storage"> | undefined) {
  if (storageId && (await ctx.db.system.get("_storage", storageId))) await ctx.storage.delete(storageId);
}
