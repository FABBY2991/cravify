import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

test.describe("public site", () => {
  test("hero, menu and cart work with no errors and no sideways scroll", async ({ page }, info) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pick your craving" })).toBeVisible();

    // The hero shows a slide and the concept notice is always visible.
    await expect(page.getByRole("group", { name: /1 of \d+: Burgers/ })).toBeAttached();
    await expect(page.getByText(/orders are not fulfilled/).first()).toBeVisible();

    if (info.project.name === "desktop") {
      await page.getByRole("button", { name: "Next slide" }).click();
      await expect(page.getByRole("group", { name: /2 of \d+: Pizza/ })).toBeAttached();
      await page.getByRole("tab", { name: "Show Desserts" }).click();
      await expect(page.getByRole("group", { name: /Desserts/ })).toBeAttached();
    } else {
      // Phones swipe instead of using arrows.
      await expect(page.getByRole("button", { name: "Next slide" })).toBeHidden();
    }

    // Category tabs jump to their section.
    await page.getByRole("navigation", { name: "Menu categories" }).getByRole("link", { name: "Pizza" }).click();
    await expect(page.locator("#menu-pizza")).toBeInViewport();

    // Pick Large pepperoni and add it twice.
    const pepperoni = page.locator("article", { hasText: "Pepperoni" }).first();
    await pepperoni.getByRole("radio", { name: "Large" }).click();
    await pepperoni.getByRole("button", { name: /Add Pepperoni \(Large\)/ }).click();
    await pepperoni.getByRole("button", { name: /Add Pepperoni \(Large\)/ }).click();
    await expect(page.getByRole("button", { name: "Open cart, 2 items" })).toBeVisible();

    // The cart totals from the live menu: 2 × 1,600 + delivery 150.
    await page.getByRole("button", { name: "Open cart, 2 items" }).click();
    const cart = page.getByRole("dialog", { name: "Your cart" });
    await expect(cart.getByText("KES 3,200").first()).toBeVisible();
    await expect(cart.getByRole("button", { name: /Checkout · KES 3,350/ })).toBeVisible();
    await cart.getByRole("radio", { name: "Pickup" }).click();
    await expect(cart.getByRole("button", { name: /Checkout · KES 3,200/ })).toBeVisible();
    await cart.getByRole("button", { name: "One fewer Pepperoni" }).click();
    await expect(cart.getByRole("button", { name: /Checkout · KES 1,600/ })).toBeVisible();
    await cart.getByRole("button", { name: "Remove Pepperoni" }).click();
    await expect(cart.getByText("Your cart is empty")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(cart).toBeHidden();

    // No horizontal scrolling at this width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });

  test("an unknown tracking link says so instead of breaking", async ({ page }) => {
    await page.goto("/order/AAAAAAAAAAAAAAAAAAAAAAAA");
    await expect(page.getByRole("heading", { name: "Order not found" })).toBeVisible();
  });
});
