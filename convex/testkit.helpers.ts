/// <reference types="vite/client" />
// Shared setup for the backend tests. The double-dot name keeps Convex from
// deploying it; vitest only runs *.test.ts files.
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

export const ADMIN_EMAIL = "admin@cravify.test";

/** A fresh backend with the starting menu and sample orders seeded. */
export async function seeded() {
  process.env.ADMIN_EMAILS = `${ADMIN_EMAIL}, other-admin@cravify.test`;
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  await t.mutation(internal.seed.init, {});
  return t;
}

/** A backend handle, signed in or not. */
export type T = ReturnType<Awaited<ReturnType<typeof seeded>>["withIdentity"]>;

/** Signs in as a user with this email, the way Convex Auth's session identity looks. */
export async function as(t: T, email: string, verified = true) {
  const userId: Id<"users"> = await t.run((ctx) =>
    ctx.db.insert("users", { email, ...(verified && { emailVerificationTime: Date.now() }) }),
  );
  return t.withIdentity({ subject: `${userId}|test-session` });
}

export async function storefront(t: T) {
  return await t.query(api.menu.storefront, {});
}

/** The storefront item with this name, and its sizes. */
export async function item(t: T, name: string) {
  const menu = await storefront(t);
  const found = menu.categories.flatMap((c) => c.items).find((i) => i.name === name);
  if (!found) throw new Error(`No item called ${name}`);
  return found;
}

let visitor = 0;
/** A distinct visitor id per call, so rate limits don't bleed between tests. */
export function visitorId() {
  visitor += 1;
  return `visitor-${visitor}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Stores a file the way an upload URL does, content type included —
 * convex-test's storage.store records only size and hash.
 */
export async function storeFile(t: T, contentType: string, bytes = 16) {
  return await t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([new Uint8Array(bytes)]));
    // convex-test lets a test write system metadata via the one-argument patch.
    await (ctx.db as unknown as { patch: (id: string, value: object) => Promise<void> }).patch(id, { contentType });
    return id;
  });
}
