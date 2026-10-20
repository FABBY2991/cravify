import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "../_generated/server";

/** The admin allowlist, from the ADMIN_EMAILS env var (comma-separated). */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined) {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}

export const NOT_SIGNED_IN = "Sign in as a Cravify admin to do that";
export const NOT_ADMIN = "This account isn't a Cravify admin";

/**
 * The signed-in admin. Every privileged function starts here: hiding the
 * admin page is never the protection, this check is.
 */
export async function requireAdmin(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError(NOT_SIGNED_IN);
  const user = await ctx.db.get("users", userId);
  if (user === null) throw new ConvexError(NOT_SIGNED_IN);
  if (!user.emailVerificationTime || !isAdminEmail(user.email)) throw new ConvexError(NOT_ADMIN);
  return user;
}

/** 18 random bytes as 24 URL-safe characters — unguessable link secrets. */
export function randomToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_");
}

/** A random integer in [0, max). */
export function randomInt(max: number) {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
}
