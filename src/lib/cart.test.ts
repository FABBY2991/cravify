// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";
import { cartReducer, type CartLine, priceCart, sanitize } from "./cart";
import { headlineTone, INK, inkOn } from "./color";
import { kes } from "./format";

const burger = "burger1" as Id<"menuItems">;
const pizza = "pizza1" as Id<"menuItems">;

const menu = [
  {
    color: "#F7931E",
    icon: "burger",
    items: [{ _id: burger, name: "Smash", soldOut: false, imageUrl: null, sizes: [{ key: "regular", label: "Regular", price: 950 }] }],
  },
  {
    color: "#E23D28",
    icon: "pizza",
    items: [
      {
        _id: pizza,
        name: "Pepperoni",
        soldOut: false,
        imageUrl: null,
        sizes: [
          { key: "small", label: "Small", price: 900 },
          { key: "large", label: "Large", price: 1600 },
        ],
      },
    ],
  },
];

describe("cart", () => {
  test("adding the same item and size again bumps its quantity, capped at 10", () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < 12; i++) lines = cartReducer(lines, { type: "add", menuItemId: burger, sizeKey: "regular" });
    expect(lines).toEqual([{ menuItemId: burger, sizeKey: "regular", quantity: 10 }]);
  });

  test("different sizes are separate lines", () => {
    let lines: CartLine[] = [];
    lines = cartReducer(lines, { type: "add", menuItemId: pizza, sizeKey: "small" });
    lines = cartReducer(lines, { type: "add", menuItemId: pizza, sizeKey: "large" });
    expect(lines).toHaveLength(2);
  });

  test("setting a quantity below 1 removes the line", () => {
    let lines = cartReducer([], { type: "add", menuItemId: burger, sizeKey: "regular" });
    lines = cartReducer(lines, { type: "setQuantity", menuItemId: burger, sizeKey: "regular", quantity: 4 });
    expect(lines[0].quantity).toBe(4);
    lines = cartReducer(lines, { type: "setQuantity", menuItemId: burger, sizeKey: "regular", quantity: 0 });
    expect(lines).toEqual([]);
  });

  test("ignores malformed lines from storage", () => {
    expect(sanitize("nope")).toEqual([]);
    expect(
      sanitize([
        { menuItemId: burger, sizeKey: "regular", quantity: 2 },
        { menuItemId: burger, sizeKey: "regular", quantity: -1 },
        { menuItemId: 5, sizeKey: "regular", quantity: 1 },
        { menuItemId: pizza, sizeKey: "large", quantity: 99 },
        null,
      ]),
    ).toEqual([
      { menuItemId: burger, sizeKey: "regular", quantity: 2 },
      { menuItemId: pizza, sizeKey: "large", quantity: 10 },
    ]);
  });
});

describe("cart pricing", () => {
  const lines: CartLine[] = [
    { menuItemId: pizza, sizeKey: "large", quantity: 2 },
    { menuItemId: burger, sizeKey: "regular", quantity: 1 },
  ];

  test("totals from the live menu, adding delivery only when chosen", () => {
    expect(priceCart(lines, menu, 150, false)).toMatchObject({ subtotal: 4150, deliveryFee: 0, total: 4150, count: 3 });
    expect(priceCart(lines, menu, 150, true)).toMatchObject({ subtotal: 4150, deliveryFee: 150, total: 4300 });
  });

  test("flags sold-out, missing and resized items and leaves them out of the total", () => {
    const soldOut = menu.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i, soldOut: i._id === pizza })) }));
    const priced = priceCart(lines, soldOut, 150, false);
    expect(priced.lines[0].problem).toBe("Sold out");
    expect(priced).toMatchObject({ subtotal: 950, blocked: true });

    const gone = priceCart([{ menuItemId: "x" as Id<"menuItems">, sizeKey: "regular", quantity: 1 }], menu, 150, true);
    expect(gone).toMatchObject({ total: 0, blocked: true });
    expect(gone.lines[0].problem).toBe("No longer on the menu");

    const resized = priceCart([{ menuItemId: pizza, sizeKey: "medium", quantity: 1 }], menu, 150, false);
    expect(resized.lines[0].problem).toBe("That size is gone");
  });
});

describe("formatting and colour", () => {
  test("formats KES", () => {
    expect(kes(1600)).toBe("KES 1,600");
  });

  test("picks readable text for each slide colour", () => {
    expect(inkOn("#F7931E")).toBe(INK); // orange
    expect(inkOn("#F5B700")).toBe(INK); // gold
    expect(inkOn("#F39BB3")).toBe(INK); // pink
    expect(inkOn("#E23D28")).toBe("#FFFFFF"); // red
    expect(inkOn("#6B3F2A")).toBe("#FFFFFF"); // brown
    expect(headlineTone("#6B3F2A")).toContain("#ffffff");
  });
});
