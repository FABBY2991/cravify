import { expect, test } from "@playwright/test";
import { api } from "../convex/_generated/api";
import { anonymousClient, signInAsAdmin, watchErrors } from "./helpers";

test("a visitor's demo order reaches the admin board and its status updates live", async ({ browser }) => {
  const visitor = await (await browser.newContext()).newPage();
  const errors = watchErrors(visitor);

  // 1. The visitor orders a Triple Bacon Stack and a large pepperoni for delivery.
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { name: "Pick your craving" })).toBeVisible();
  await visitor.locator("article", { hasText: "Triple Bacon Stack" }).getByRole("button", { name: /Add Triple Bacon Stack/ }).click();
  const pepperoni = visitor.locator("article", { hasText: "Pepperoni" }).first();
  await pepperoni.getByRole("radio", { name: "Large" }).click();
  await pepperoni.getByRole("button", { name: /Add Pepperoni/ }).click();
  await visitor.getByRole("button", { name: "Open cart, 2 items" }).click();
  await visitor.getByRole("button", { name: /Checkout · KES 3,200/ }).click();

  const checkout = visitor.getByRole("dialog", { name: "Checkout" });
  await expect(checkout.getByText("This is a demo.")).toBeVisible();
  await checkout.getByLabel("Name for the order").fill("E2E Tester");
  await checkout.getByLabel(/Delivery area/).selectOption("Kilimani");
  await checkout.getByLabel(/Note for the kitchen/).fill("Extra napkins");
  await checkout.getByRole("button", { name: "Place demo order · KES 3,200" }).click();

  // 2. It lands on the tracking page, which the backend serves by secret token.
  await visitor.waitForURL(/\/order\/[A-Za-z0-9_-]{24}$/);
  const token = visitor.url().split("/").pop()!;
  await expect(visitor.getByRole("heading", { name: "Order received" })).toBeVisible();
  const code = (await visitor.getByText(/^Order CR-\d+/).textContent())!.replace("Order ", "").trim();
  const stored = await anonymousClient().query(api.orders.track, { token });
  expect(stored).toMatchObject({ code, status: "received", total: 3200, deliveryArea: "Kilimani", note: "Extra napkins" });
  expect(stored?.items.map((i) => i.name)).toEqual(["Triple Bacon Stack", "Pepperoni"]);

  // 3. The admin sees it on the live board.
  const admin = await (await browser.newContext()).newPage();
  await signInAsAdmin(admin);
  const card = admin.locator("article", { hasText: code });
  await expect(card).toBeVisible();
  await expect(card).toContainText("E2E Tester");

  // 4. Each status change shows on the customer's page without a reload.
  await card.getByRole("button", { name: "Start preparing" }).click();
  await expect(visitor.getByRole("heading", { name: "In the kitchen" })).toBeVisible();
  await card.getByRole("button", { name: "Send out" }).click();
  await expect(visitor.getByRole("heading", { name: "On its way" })).toBeVisible();
  await expect(visitor.getByText(/heading to Kilimani/)).toBeVisible();
  await card.getByRole("button", { name: "Complete" }).click();
  await expect(visitor.getByRole("heading", { name: "Enjoy your meal" })).toBeVisible();

  // 5. And the backend persisted every step.
  const done = await anonymousClient().query(api.orders.track, { token });
  expect(done?.timeline.map((s) => s.status)).toEqual(["received", "preparing", "out_for_delivery", "completed"]);
  expect(errors).toEqual([]);
});

test("menu changes in the admin reach an open storefront live", async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage();
  await signInAsAdmin(admin);
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto("/#menu-pizza");
  const margherita = visitor.locator("article", { hasText: "Margherita" });
  await expect(margherita.getByRole("button", { name: /Add Margherita/ })).toBeVisible();

  await admin.getByRole("button", { name: "Menu", exact: true }).click();
  await admin.getByRole("button", { name: /^Pizza/ }).click();
  const row = admin.locator("article", { hasText: "Margherita" });
  await row.getByRole("switch", { name: "Sold out" }).click();
  await expect(margherita.getByRole("button", { name: "Sold out" })).toBeVisible();
  await row.getByRole("switch", { name: "Sold out" }).click();
  await expect(margherita.getByRole("button", { name: /Add Margherita/ })).toBeVisible();
});
