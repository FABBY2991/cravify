import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { ADMIN_EMAIL, as, item, seeded, storefront, type T, visitorId } from "./testkit.helpers";

/** The standard test cart: 2 large pepperoni and a smash burger, delivered. */
async function cart(t: T) {
  const pepperoni = await item(t, "Pepperoni");
  const smash = await item(t, "Double Smash Burger");
  return [
    { menuItemId: pepperoni._id, sizeKey: "large", quantity: 2 },
    { menuItemId: smash._id, sizeKey: "regular", quantity: 1 },
  ];
}

async function order(t: T, overrides: Record<string, unknown> = {}) {
  return await t.mutation(api.orders.place, {
    visitorId: visitorId(),
    lines: (overrides.lines as Awaited<ReturnType<typeof cart>> | undefined) ?? (await cart(t)),
    fulfilment: "delivery",
    customerName: "  Test   Customer ",
    deliveryArea: "Westlands",
    expectedTotal: 1600 * 2 + 950 + 150,
    ...overrides,
  });
}

describe("pricing and checkout", () => {
  test("prices the order from the database and tracks it by its token", async () => {
    const t = await seeded();
    const { token, code } = await order(t);
    expect(code).toMatch(/^CR-\d{4}$/);
    expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);

    const tracked = await t.query(api.orders.track, { token });
    expect(tracked).toMatchObject({
      code,
      status: "received",
      fulfilment: "delivery",
      customerName: "Test Customer",
      deliveryArea: "Westlands",
      subtotal: 4150,
      deliveryFee: 150,
      total: 4300,
    });
    expect(tracked?.items).toEqual([
      { name: "Pepperoni", sizeLabel: "Large", unitPrice: 1600, quantity: 2, lineTotal: 3200 },
      { name: "Double Smash Burger", sizeLabel: "Regular", unitPrice: 950, quantity: 1, lineTotal: 950 },
    ]);
    expect(tracked?.timeline.map((s) => s.status)).toEqual(["received"]);
  });

  test("refuses a total the backend didn't arrive at", async () => {
    const t = await seeded();
    await expect(order(t, { expectedTotal: 100 })).rejects.toThrow(/Prices changed/);
  });

  test("pickup has no delivery fee and needs no area", async () => {
    const t = await seeded();
    const { token } = await order(t, { fulfilment: "pickup", deliveryArea: undefined, expectedTotal: 4150 });
    const tracked = await t.query(api.orders.track, { token });
    expect(tracked).toMatchObject({ deliveryFee: 0, total: 4150, deliveryArea: null });
  });

  test("uses the delivery fee from the site settings", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    await admin.mutation(api.settings.update, {
      deliveryFee: 300,
      hours: "Daily",
      location: "Demo",
      creditName: "Fabian",
      creditUrl: "",
    });
    await expect(order(t)).rejects.toThrow(/Prices changed/);
    const { token } = await order(t, { expectedTotal: 4150 + 300 });
    expect((await t.query(api.orders.track, { token }))?.deliveryFee).toBe(300);
  });

  test("merges repeated lines before applying the per-item limit", async () => {
    const t = await seeded();
    const shake = await item(t, "Chocolate Shake");
    const line = { menuItemId: shake._id, sizeKey: "small", quantity: 6 };
    await expect(
      order(t, { lines: [line, line], fulfilment: "pickup", deliveryArea: undefined, expectedTotal: 4800 }),
    ).rejects.toThrow(/at most 10/);
    const { token } = await order(t, {
      lines: [{ ...line, quantity: 2 }, { ...line, quantity: 3 }],
      fulfilment: "pickup",
      deliveryArea: undefined,
      expectedTotal: 2250,
    });
    expect((await t.query(api.orders.track, { token }))?.items).toEqual([
      { name: "Chocolate Shake", sizeLabel: "Small", unitPrice: 450, quantity: 5, lineTotal: 2250 },
    ]);
  });

  test.each([
    ["an empty cart", { lines: [] }, /cart is empty/],
    ["a missing name", { customerName: "   " }, /Add a name/],
    ["a long name", { customerName: "x".repeat(41) }, /under 40/],
    ["delivery without an area", { deliveryArea: undefined }, /delivery area/],
    ["an area outside the list", { deliveryArea: "My house, 12 Real Street" }, /delivery area/],
    ["a long note", { note: "x".repeat(141) }, /under 140/],
    ["a bad visitor id", { visitorId: "x" }, /Reload/],
  ])("rejects %s", async (_name, overrides, error) => {
    const t = await seeded();
    await expect(order(t, overrides)).rejects.toThrow(error);
  });

  test.each([0, -1, 1.5])("rejects a quantity of %s", async (quantity) => {
    const t = await seeded();
    const smash = await item(t, "Double Smash Burger");
    await expect(
      order(t, { lines: [{ menuItemId: smash._id, sizeKey: "regular", quantity }] }),
    ).rejects.toThrow(/whole numbers/);
  });

  test("rejects a size the item doesn't have", async () => {
    const t = await seeded();
    const smash = await item(t, "Double Smash Burger");
    await expect(
      order(t, { lines: [{ menuItemId: smash._id, sizeKey: "giant", quantity: 1 }], expectedTotal: 1100 }),
    ).rejects.toThrow(/no longer available/);
  });

  test("rejects sold-out and disabled items", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const lines = await cart(t);
    const pepperoniId = lines[0].menuItemId;
    await admin.mutation(api.catalog.updateItem, { itemId: pepperoniId, soldOut: true });
    await expect(order(t, { lines })).rejects.toThrow(/Pepperoni just sold out/);

    await admin.mutation(api.catalog.updateItem, { itemId: pepperoniId, soldOut: false, enabled: false });
    await expect(order(t, { lines })).rejects.toThrow(/no longer on the menu/);
  });

  test("rejects items from a disabled category", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const pizza = (await storefront(t)).categories.find((c) => c.name === "Pizza")!;
    const pepperoni = await item(t, "Pepperoni");
    await admin.mutation(api.catalog.updateCategory, { categoryId: pizza._id, enabled: false });
    await expect(
      order(t, { lines: [{ menuItemId: pepperoni._id, sizeKey: "small", quantity: 1 }], expectedTotal: 1050 }),
    ).rejects.toThrow(/no longer on the menu/);
  });

  test("limits how often one visitor can order", async () => {
    const t = await seeded();
    const smash = await item(t, "Double Smash Burger");
    const id = visitorId();
    const place = () =>
      t.mutation(api.orders.place, {
        visitorId: id,
        lines: [{ menuItemId: smash._id, sizeKey: "regular", quantity: 1 }],
        fulfilment: "pickup",
        customerName: "Repeat",
        expectedTotal: 950,
      });
    for (let i = 0; i < 5; i++) await place();
    await expect(place()).rejects.toThrow(/RateLimited/);
  });
});

describe("order tracking privacy", () => {
  test("returns nothing for a wrong or malformed token", async () => {
    const t = await seeded();
    await order(t);
    expect(await t.query(api.orders.track, { token: "A".repeat(24) })).toBeNull();
    expect(await t.query(api.orders.track, { token: "not-a-token" })).toBeNull();
    expect(await t.query(api.orders.track, { token: "" })).toBeNull();
  });

  test("never includes the contact number or internal ids", async () => {
    const t = await seeded();
    const { token } = await order(t);
    const tracked = await t.query(api.orders.track, { token });
    const json = JSON.stringify(tracked);
    expect(json).not.toContain("+254");
    expect(tracked).not.toHaveProperty("demoPhone");
    expect(tracked).not.toHaveProperty("_id");
    expect(tracked).not.toHaveProperty("token");
  });

  test("stores a synthetic, unallocated contact number", async () => {
    const t = await seeded();
    const { token } = await order(t);
    const phone = await t.run(async (ctx) => {
      const row = await ctx.db
        .query("orders")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique();
      return row?.demoPhone;
    });
    expect(phone).toMatch(/^\+254 000 \d{3} \d{3}$/);
  });
});
