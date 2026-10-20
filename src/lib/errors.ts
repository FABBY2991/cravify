import { ConvexError } from "convex/values";

/** A message fit to show a person, from whatever a Convex call threw. */
export function messageOf(error: unknown) {
  if (error instanceof ConvexError) {
    const data = error.data as unknown;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null && (data as { kind?: string }).kind === "RateLimited") {
      const minutes = Math.max(1, Math.ceil(((data as { retryAfter?: number }).retryAfter ?? 60_000) / 60_000));
      return `That's a lot of orders from one browser — try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
    }
  }
  return "Something went wrong. Check your connection and try again.";
}
