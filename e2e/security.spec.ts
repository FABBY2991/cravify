import { expect, test } from "@playwright/test";
import { api } from "../convex/_generated/api";
import { anonymousClient } from "./helpers";

test("the admin refuses emails that aren't on the allowlist", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Admin email").fill("someone@example.com");
  await page.getByRole("button", { name: "Email me a code" }).click();
  // Scoped to the page: the dev server's error overlay repeats the message.
  await expect(page.getByRole("main").getByText("That email isn't on Cravify's admin list.")).toBeVisible();
  await expect(page.getByText("We sent a 6-digit code")).toBeHidden();
});

test("admin data and operations are refused to callers who aren't signed in", async () => {
  const client = anonymousClient();
  await expect(client.query(api.admin.orders, { filter: "active" })).rejects.toThrow(/Sign in as a Cravify admin/);
  await expect(client.query(api.catalog.adminCatalog, {})).rejects.toThrow(/Sign in as a Cravify admin/);
  await expect(client.mutation(api.admin.resetDemo, {})).rejects.toThrow(/Sign in as a Cravify admin/);
  await expect(client.mutation(api.catalog.generateUploadUrl, {})).rejects.toThrow(/Sign in as a Cravify admin/);
});

test("the public menu never carries other customers' details", async () => {
  const menu = await anonymousClient().query(api.menu.storefront, {});
  const json = JSON.stringify(menu);
  expect(json).not.toMatch(/\+254/);
  expect(json).not.toMatch(/customerName|demoPhone|token/);
});
