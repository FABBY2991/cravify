import type { Id } from "../../convex/_generated/dataModel";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES } from "../../convex/lib/limits";

export type UploadKind = "image" | "video";

export const ACCEPT: Record<UploadKind, string> = {
  image: IMAGE_TYPES.join(","),
  video: VIDEO_TYPES.join(","),
};

/**
 * Uploads one file straight to Convex storage and returns its id. Checks type
 * and size first so a wrong file fails fast; the backend checks again.
 */
export async function uploadFile(file: File, kind: UploadKind, generateUploadUrl: () => Promise<string>) {
  if (kind === "image") {
    if (!IMAGE_TYPES.includes(file.type)) throw new Error("Choose a PNG, WebP, JPEG or AVIF image.");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("That image is over 5 MB — export a smaller one.");
  } else {
    if (!VIDEO_TYPES.includes(file.type)) throw new Error("Choose an MP4 or WebM video.");
    if (file.size > MAX_VIDEO_BYTES) throw new Error("That video is over 20 MB — export a shorter or smaller one.");
  }
  const response = await fetch(await generateUploadUrl(), {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error("The upload failed. Try again.");
  const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
