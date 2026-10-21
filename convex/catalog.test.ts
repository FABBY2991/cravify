import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ADMIN_EMAIL, as, item, seeded, storeFile as upload, storefront, type T } from "./testkit.helpers";

async function exists(t: T, id: Id<"_storage">) {
  return await t.run(async (ctx) => (await ctx.db.system.get("_storage", id)) !== null);
}

describe("menu management", () => {
  test("a sold-out item stays on the menu, greyed out, and can't be ordered", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const pepperoni = await item(t, "Pepperoni");
    await admin.mutation(api.catalog.updateItem, { itemId: pepperoni._id, soldOut: true });
    expect((await item(t, "Pepperoni")).soldOut).toBe(true);
  });

  test("a disabled item or category disappears from the public site", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const pepperoni = await item(t, "Pepperoni");
    await admin.mutation(api.catalog.updateItem, { itemId: pepperoni._id, enabled: false });
    await expect(item(t, "Pepperoni")).rejects.toThrow();

    const desserts = (await storefront(t)).categories.find((c) => c.name === "Desserts")!;
    await admin.mutation(api.catalog.updateCategory, { categoryId: desserts._id, enabled: false });
    const menu = await storefront(t);
    expect(menu.categories.map((c) => c.name)).not.toContain("Desserts");
    expect(menu.slides.map((s) => s.categoryName)).not.toContain("Desserts");
  });

  test("creates items with checked sizes and stable size keys", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const burgers = (await storefront(t)).categories[0];
    await admin.mutation(api.catalog.createItem, {
      categoryId: burgers._id,
      name: "  Mushroom   Swiss ",
      description: "Mushrooms and Swiss cheese.",
      sizes: [
        { label: "Single", price: 800 },
        { label: "Double Stack", price: 1100 },
      ],
    });
    const created = await item(t, "Mushroom Swiss");
    expect(created.sizes).toEqual([
      { key: "single", label: "Single", price: 800 },
      { key: "double-stack", label: "Double Stack", price: 1100 },
    ]);

    const bad = (sizes: { label: string; price: number }[]) =>
      admin.mutation(api.catalog.createItem, { categoryId: burgers._id, name: "Bad", description: "", sizes });
    await expect(bad([])).rejects.toThrow(/between 1 and 4 sizes/);
    await expect(bad([{ label: "R", price: 10 }])).rejects.toThrow(/between 50/);
    await expect(bad([{ label: "R", price: 99.5 }])).rejects.toThrow(/whole KES/);
    await expect(
      bad([
        { label: "Big", price: 100 },
        { label: "big", price: 200 },
      ]),
    ).rejects.toThrow(/share a name/);
  });

  test("reorders items and categories by swapping neighbours", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const [burgers, pizza] = (await storefront(t)).categories;
    await admin.mutation(api.catalog.moveCategory, { categoryId: pizza._id, direction: "up" });
    expect((await storefront(t)).categories.slice(0, 2).map((c) => c.name)).toEqual(["Pizza", "Burgers"]);
    await admin.mutation(api.catalog.moveCategory, { categoryId: pizza._id, direction: "up" });
    expect((await storefront(t)).categories[0].name).toBe("Pizza");

    const [first, second] = burgers.items;
    await admin.mutation(api.catalog.moveItem, { itemId: first._id, direction: "down" });
    const reordered = (await storefront(t)).categories.find((c) => c.name === "Burgers")!.items;
    expect(reordered.slice(0, 2).map((i) => i.name)).toEqual([second.name, first.name]);
  });

  test("a new category gets a hero slide that starts switched off", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    await admin.mutation(api.catalog.createCategory, { name: "Wraps", icon: "generic", color: "#2a9d8f" });
    const catalog = await admin.query(api.catalog.adminCatalog, {});
    const wraps = catalog.categories.find((c) => c.name === "Wraps")!;
    expect(wraps).toMatchObject({ slug: "wraps", color: "#2A9D8F", enabled: true });
    expect(catalog.slides.find((s) => s.categoryId === wraps._id)).toMatchObject({ enabled: false, headline: "WRAPS" });
    expect((await storefront(t)).slides.map((s) => s.categoryName)).not.toContain("Wraps");

    await expect(
      admin.mutation(api.catalog.createCategory, { name: "X", icon: "rocket", color: "#123456" }),
    ).rejects.toThrow(/listed icons/);
    await expect(
      admin.mutation(api.catalog.createCategory, { name: "X", icon: "generic", color: "red" }),
    ).rejects.toThrow(/hex/);
  });

  test("deleting a featured item clears it from its slide", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const stack = await item(t, "Triple Bacon Stack");
    expect((await storefront(t)).slides[0].featured?.name).toBe("Triple Bacon Stack");
    await admin.mutation(api.catalog.deleteItem, { itemId: stack._id });
    const slide = (await storefront(t)).slides.find((s) => s.categoryName === "Burgers")!;
    expect(slide.featured).toBeNull();
  });
});

describe("hero management", () => {
  test("edits headline, line above and featured item, live on the public site", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const slide = (await storefront(t)).slides[0];
    const classic = await item(t, "Classic Cheeseburger");
    await admin.mutation(api.hero.updateSlide, {
      slideId: slide._id,
      headline: " beef heaven ",
      kicker: "The classic",
      featuredItemId: classic._id,
    });
    expect((await storefront(t)).slides[0]).toMatchObject({
      headline: "BEEFHEAVEN",
      kicker: "The classic",
      featured: { name: "Classic Cheeseburger" },
    });
    await expect(
      admin.mutation(api.hero.updateSlide, { slideId: slide._id, headline: "X".repeat(17) }),
    ).rejects.toThrow(/at most 16/);
  });

  test("shows the slide's credit, and clears it when emptied", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const slide = (await storefront(t)).slides[0];
    expect(slide.credit).toBe("Burger animation: @valeriia.larkina.ai");
    await admin.mutation(api.hero.updateSlide, { slideId: slide._id, credit: "  Photo: someone  " });
    expect((await storefront(t)).slides[0].credit).toBe("Photo: someone");
    await admin.mutation(api.hero.updateSlide, { slideId: slide._id, credit: " " });
    expect((await storefront(t)).slides[0].credit).toBe("");
  });

  test("a slide can only feature an item from its own category", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const burgerSlide = (await storefront(t)).slides[0];
    const pepperoni = await item(t, "Pepperoni");
    await expect(
      admin.mutation(api.hero.updateSlide, { slideId: burgerSlide._id, featuredItemId: pepperoni._id }),
    ).rejects.toThrow(/its own category/);
  });

  test("a category can have a further slide: coffee sits after the shakes slide", async () => {
    const t = await seeded();
    const slides = (await storefront(t)).slides;
    const shakes = slides.findIndex((s) => s.headline === "BERRYLICIOUS");
    expect(slides[shakes + 1]).toMatchObject({ headline: "BREWTIFUL", categoryName: "Shakes & Drinks" });
    expect(slides[shakes + 1].featured?.name).toBe("Cappuccino");
    expect(slides.at(-1)?.headline).toBe("SCOOPTACULAR");
  });

  test("hides and reorders slides", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const [burgers, pizza] = (await storefront(t)).slides;
    await admin.mutation(api.hero.moveSlide, { slideId: pizza._id, direction: "up" });
    expect((await storefront(t)).slides[0].headline).toBe("PIZZAHOLIC");
    await admin.mutation(api.hero.updateSlide, { slideId: burgers._id, enabled: false });
    expect((await storefront(t)).slides.map((s) => s.headline)).not.toContain("BURGERLICIOUS");
  });
});

describe("images", () => {
  test("accepts web images, replaces them and deletes the old file", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const slideId = (await storefront(t)).slides[0]._id;
    const first = await upload(t, "image/png");
    await admin.mutation(api.hero.setHeroImage, { slideId, storageId: first });
    expect((await storefront(t)).slides[0].heroImageUrl).toMatch(/^https?:\/\//);

    const second = await upload(t, "image/webp");
    await admin.mutation(api.hero.setHeroImage, { slideId, storageId: second });
    expect(await exists(t, first)).toBe(false);
    expect(await exists(t, second)).toBe(true);

    await admin.mutation(api.hero.setHeroImage, { slideId, storageId: null });
    expect(await exists(t, second)).toBe(false);
    expect((await storefront(t)).slides[0].heroImageUrl).toBeNull();
  });

  test("refuses files that aren't web images and deletes them", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const smash = await item(t, "Double Smash Burger");
    const script = await upload(t, "text/html");
    expect(await admin.mutation(api.catalog.setItemImage, { itemId: smash._id, storageId: script })).toMatch(
      /PNG, WebP, JPEG or AVIF/,
    );
    expect(await exists(t, script)).toBe(false);
    expect((await item(t, "Double Smash Burger")).imageUrl).toBeNull();
  });

  test("refuses images over 5 MB", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const smash = await item(t, "Double Smash Burger");
    const huge = await upload(t, "image/png", 5 * 1024 * 1024 + 1);
    expect(await admin.mutation(api.catalog.setItemImage, { itemId: smash._id, storageId: huge })).toMatch(
      /at most 5 MB/,
    );
    expect(await exists(t, huge)).toBe(false);
  });

  test("takes a looping clip for a slide, refusing anything but MP4 or WebM", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const slideId = (await storefront(t)).slides[0]._id;
    const clip = await upload(t, "video/mp4", 2048);
    expect(await admin.mutation(api.hero.setHeroVideo, { slideId, storageId: clip })).toBeNull();
    expect((await storefront(t)).slides[0].heroVideoUrl).toMatch(/^https?:\/\//);

    const gif = await upload(t, "image/gif");
    expect(await admin.mutation(api.hero.setHeroVideo, { slideId, storageId: gif })).toMatch(/MP4 or WebM/);
    expect(await exists(t, gif)).toBe(false);

    await admin.mutation(api.hero.setHeroVideo, { slideId, storageId: null });
    expect(await exists(t, clip)).toBe(false);
    expect((await storefront(t)).slides[0].heroVideoUrl).toBeNull();
  });

  test("keeps at most four floating pieces per slide", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    const slideId = (await storefront(t)).slides[0]._id;
    const pieces = [];
    for (let i = 0; i < 4; i++) {
      const id = await upload(t, "image/png");
      pieces.push(id);
      await admin.mutation(api.hero.addPiece, { slideId, storageId: id });
    }
    const fifth = await upload(t, "image/png");
    expect(await admin.mutation(api.hero.addPiece, { slideId, storageId: fifth })).toMatch(/at most 4/);
    expect(await exists(t, fifth)).toBe(false);
    expect((await storefront(t)).slides[0].pieceUrls).toHaveLength(4);

    await admin.mutation(api.hero.removePiece, { slideId, storageId: pieces[1] });
    expect((await storefront(t)).slides[0].pieceUrls).toHaveLength(3);
    expect(await exists(t, pieces[1])).toBe(false);
  });
});

describe("bringing a deployment up to the starting menu", () => {
  test("adds missing items and slides in place, and leaves everything else alone", async () => {
    const t = await seeded();
    const admin = await as(t, ADMIN_EMAIL);
    // A deployment from before the coffee: no cappuccino, no coffee slide, and an edited price.
    const cappuccino = await item(t, "Cappuccino");
    const coffee = (await storefront(t)).slides.find((s) => s.headline === "BREWTIFUL")!;
    await t.run(async (ctx) => {
      await ctx.db.delete("heroSlides", coffee._id);
      await ctx.db.delete("menuItems", cappuccino._id);
    });
    const espresso = await item(t, "Double Espresso");
    await admin.mutation(api.catalog.updateItem, {
      itemId: espresso._id,
      sizes: [{ label: "Regular", price: 999 }],
    });

    expect(await t.mutation(internal.seed.addMissing, {})).toBe("Added item Cappuccino, slide BREWTIFUL.");
    const slides = (await storefront(t)).slides;
    const shakes = slides.findIndex((s) => s.headline === "BERRYLICIOUS");
    expect(slides[shakes + 1]).toMatchObject({ headline: "BREWTIFUL" });
    expect(slides[shakes + 1].featured?.name).toBe("Cappuccino");
    expect(slides.at(-1)?.headline).toBe("SCOOPTACULAR");
    expect((await item(t, "Double Espresso")).sizes[0].price).toBe(999);

    expect(await t.mutation(internal.seed.addMissing, {})).toBe("Nothing missing — nothing changed.");
  });

  test("the image import can point a category's further slide at a clip", async () => {
    const t = await seeded();
    const clip = await upload(t, "video/mp4", 2048);
    const target = { kind: "heroVideo" as const, categorySlug: "shakes-drinks", headline: "BREWTIFUL" };
    expect(await t.mutation(internal.assets.attach, { storageId: clip, target })).toBeNull();
    const slides = (await storefront(t)).slides;
    expect(slides.find((s) => s.headline === "BREWTIFUL")?.heroVideoUrl).toMatch(/^https?:\/\//);
    expect(slides.find((s) => s.headline === "BERRYLICIOUS")?.heroVideoUrl).toBeNull();
    await expect(
      t.mutation(internal.assets.attach, { storageId: clip, target: { ...target, headline: "NOPE" } }),
    ).rejects.toThrow(/no hero slide called NOPE/);
  });
});
