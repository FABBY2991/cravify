import { ConvexError } from "convex/values";

/** Trims and collapses whitespace, then enforces presence and length. */
export function cleanText(value: string, max: number, what: string, allowEmpty = false) {
  const text = value.trim().replace(/\s+/g, " ");
  if (!allowEmpty && text.length === 0) throw new ConvexError(`${what} can't be empty`);
  if (text.length > max) throw new ConvexError(`${what} must be at most ${max} characters`);
  return text;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function checkColor(color: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new ConvexError("Colours must be hex, like #E23D28");
  return color.toUpperCase();
}
