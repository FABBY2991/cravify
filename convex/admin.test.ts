import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { nairobiDay } from "./lib/orderFlow";
import { ADMIN_EMAIL, as, item, seeded, storeFile, storefront, type T, visitorId } from "./testkit.helpers";

async function placeDelivery(t: T) {
  const smash = await item(t, "Double Smash Burger");
  return await t.mutation(api.orders.place, {
    visitorId: visitorId(),
    lines: [{ menuItemId: smash._id, sizeKey: "regular", quantity: 2 }],
    fulfilment: "delivery",
    customerName: "Board Test",
    deliveryArea: "Karen",
    expectedTotal: 2050,
  });
}

async function orderIdOf(t: T, token: string) {
  return await t.run(async (ctx) => {
    const row = await ctx.db
      .query("orders")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    return row!._id;
  });
}

describe("admin authorization", () => {
  /** Every privileged function, with arguments that would otherwise be valid. */
  async function privileged(t: T) {
    const menu = await storefront(t);
    const category = menu.categories[0];
    const firstItem = category.items[0];
    const slideId = menu.slides[0]._id;
    const orderId = await orderIdOf(t, (await placeDelivery(t)).token);
    const storageId = await storeFile(t, "image/png");
    return [
      ["admin.orders", (c: T) => c.query(api.admin.orders, { filter: "active" })],
      ["admin.today", (c: T) => c.query(api.admin.today, { day: "2026-10-20" })],
      ["admin.setStatus", (c: T) => c.mutation(api.admin.setStatus, { orderId, status: "preparing" })],
      ["admin.resetDemo", (c: T) => c.mutation(api.admin.resetDemo, {})],
      ["catalog.adminCatalog", (c: T) => c.query(api.catalog.adminCatalog, {})],
      ["catalog.generateUploadUrl", (c: T) => c.mutation(api.catalog.generateUploadUrl, {})],
      [
        "catalog.createCategory",
        (c: T) => c.mutation(api.catalog.createCategory, { name: "Wraps", icon: "generic", color: "#123456" }),
      ],
      [
        "catalog.updateCategory",
        (c: T) => c.mutation(api.catalog.updateCategory, { categoryId: category._id, name: "Hacked" }),
      ],
      [
        "catalog.moveCategory",
        (c: T) => c.mutation(api.catalog.moveCategory, { categoryId: category._id, direction: "down" }),
      ],
      [
        "catalog.createItem",
        (c: T) =>
          c.mutation(api.catalog.createItem, {
            categoryId: category._id,
            name: "Free food",
            description: "",
            sizes: [{ label: "Regular", price: 50 }],
          }),
      ],
      ["catalog.updateItem", (c: T) => c.mutation(api.catalog.updateItem, { itemId: firstItem._id, soldOut: true })],
      ["catalog.moveItem", (c: T) => c.mutation(api.catalog.moveItem, { itemId: firstItem._id, direction: "down" })],
      ["catalog.deleteItem", (c: T) => c.mutation(api.catalog.deleteItem, { itemId: firstItem._id })],
      [
        "catalog.setItemImage",
        (c: T) => c.mutation(api.catalog.setItemImage, { itemId: firstItem._id, storageId }),
      ],
      ["hero.updateSlide", (c: T) => c.mutation(api.hero.updateSlide, { slideId, headline: "HACKED" })],
      ["hero.moveSlide", (c: T) => c.mutation(api.hero.moveSlide, { slideId, direction: "down" })],
      ["hero.setHeroImage", (c: T) => c.mutation(api.hero.setHeroImage, { slideId, storageId })],
      ["hero.setHeroVideo", (c: T) => c.mutation(api.hero.setHeroVideo, { slideId, storageId })],
      ["hero.addPiece", (c: T) => c.mutation(api.hero.addPiece, { slideId, storageId })],
      ["hero.removePiece", (c: T) => c.mutation(api.hero.removePiece, { slideId, storageId })],
      [
        "settings.update",
        (c: T) =>
          c.mutation(api.settings.update, {
            deliveryFee: 0,
            hours: "x",
            location: "x",
            creditName: "x",
            creditUrl: "",
          }),
      ],
    ] as const;
  }

  test("every privileged function refuses visitors who aren't signed in", async () => {
    const t = await seeded();
    for (const [name, call] of await privileged(t)) {
      await expect(call(t), name).rejects.toThrow(/Sign in as a Cravify admin/);
    }
  });

  test("every privileged function refuses signed-in users who aren't admins", async () => {
    const t = await seeded();
    const stranger = await as(t, "someone@example.com");
    for (const [name, call] of await privileged(t)) {
      await expect(call(stranger), name).rejects.toThrow(/isn't a Cravify admin/);
    }
  });

  test("an allowlisted email that was never verified is not an admin", async () => {
    const t = await seeded();
    const unverified = await as(t, ADMIN_EMAIL, false);
    await expect(unverified.query(api.admin.orders, { filter: "active" })).rejects.toThrow(/isn't a Cravify admin/);
    expect(await unverified.query(api.admin.me, {})).toMatchObject({ isAdmin: false });
  });

  test("nothing changed after the refused attempts", async () => {
    const t = await seeded();
    const before = await storefront(t);
    const stranger = await as(t, "someone@example.com");
    for (const [, call] of await privileged(t)) await call(stranger).catch(() => {});
    const after = await storefront(t);
    expect(after.categories.map((c) => c.name)).toEqual(before.categories.map((c) => c.name));
    expect(after.slides.map((s) => s.headline)).toEqual(before.slides.map((s) => s.headline));
    expect(after.categories[0].items[0].soldOut).toBe(false);
  });

  test("me reports who is signed in and whether they're an admin", async () => {
    const t = await seeded();
    expect(await t.query(api.admin.me, {})).toBeNull();
    expect(await (await as(t, "Admin@Cravify.test")).query(api.admin.me, {})).toEqual({
      email: "Admin@Cravify.test",
      isAdmin: true,
    });
    expect(await (await as(t, "someone@example.com")).query(api.admin.me, {})).toMatchObject({ isAdmin: false });
  });

  test("the board shows customer details only to admins", async () => {
    const t = await seeded();
    await placeDelivery(t);
    const board = await (await as(t, ADMIN_EMAIL)).query(api.admin.orders, { filter: "active" });
    const mine = board.find((o) => o.customerName === "Board Test");
    expect(mine).toMatchObject({ deliveryArea: "Karen", status: "received" });
    expect(mine?.demoPhone).toMatch(/^\+254 000 /);
  });
});

describe("order status changes", () => {
  test("a delivery order moves received → preparing → out for delivery → completed", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const { token } = await placeDelivery(t);
    const orderId = await orderIdOf(t, token);

    await expect(admin.mutation(api.admin.setStatus, { orderId, status: "completed" })).rejects.toThrow(
      /can't go from Received to Completed/,
    );
    await admin.mutation(api.admin.setStatus, { orderId, status: "preparing" });
    await expect(admin.mutation(api.admin.setStatus, { orderId, status: "ready" })).rejects.toThrow(
      /can't go from Preparing to Ready for pickup/,
    );
    await expect(admin.mutation(api.admin.setStatus, { orderId, status: "received" })).rejects.toThrow();
    await admin.mutation(api.admin.setStatus, { orderId, status: "out_for_delivery" });
    await admin.mutation(api.admin.setStatus, { orderId, status: "completed" });
    await expect(admin.mutation(api.admin.setStatus, { orderId, status: "cancelled" })).rejects.toThrow(
      /can't go from Completed to Cancelled/,
    );

    const tracked = await t.query(api.orders.track, { token });
    expect(tracked?.status).toBe("completed");
    expect(tracked?.timeline.map((s) => s.status)).toEqual([
      "received",
      "preparing",
      "out_for_delivery",
      "completed",
    ]);
  });

  test("a pickup order goes to ready, never out for delivery", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const smash = await item(t, "Double Smash Burger");
    const { token } = await t.mutation(api.orders.place, {
      visitorId: visitorId(),
      lines: [{ menuItemId: smash._id, sizeKey: "regular", quantity: 1 }],
      fulfilment: "pickup",
      customerName: "Pickup",
      expectedTotal: 950,
    });
    const orderId = await orderIdOf(t, token);
    await admin.mutation(api.admin.setStatus, { orderId, status: "preparing" });
    await expect(admin.mutation(api.admin.setStatus, { orderId, status: "out_for_delivery" })).rejects.toThrow();
    await admin.mutation(api.admin.setStatus, { orderId, status: "ready" });
    expect((await t.query(api.orders.track, { token }))?.status).toBe("ready");
  });

  test("cancelling takes the order out of today's sales", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const day = nairobiDay(Date.now());
    const before = await admin.query(api.admin.today, { day });
    const { token } = await placeDelivery(t);
    const placed = await admin.query(api.admin.today, { day });
    expect(placed.orders).toBe(before.orders + 1);
    expect(placed.sales).toBe(before.sales + 2050);

    await admin.mutation(api.admin.setStatus, { orderId: await orderIdOf(t, token), status: "cancelled" });
    const after = await admin.query(api.admin.today, { day });
    expect(after).toEqual({ orders: placed.orders, sales: before.sales, cancelled: before.cancelled + 1 });
    await expect(
      admin.mutation(api.admin.setStatus, { orderId: await orderIdOf(t, token), status: "preparing" }),
    ).rejects.toThrow();
  });
});

describe("demo reset", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("clears visitor orders and lays out fresh samples, leaving the menu alone", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const { token } = await placeDelivery(t);
    const menuBefore = await storefront(t);

    await admin.mutation(api.admin.resetDemo, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(await t.query(api.orders.track, { token })).toBeNull();
    const all = await admin.query(api.admin.orders, { filter: "all" });
    expect(all).toHaveLength(8);
    expect(all.every((o) => o.source === "sample")).toBe(true);
    expect(new Set(all.map((o) => o.status))).toEqual(
      new Set(["received", "preparing", "ready", "out_for_delivery", "completed", "cancelled"]),
    );
    expect((await storefront(t)).categories).toEqual(menuBefore.categories);
  });
});
