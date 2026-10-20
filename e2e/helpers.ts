import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";

/** The allowlisted e2e admin on the dev deployment (ADMIN_EMAILS). */
export const E2E_ADMIN = "admin-e2e@cravify.test";

export function convexUrl() {
  const env = readFileSync(".env.local", "utf8");
  const url = env.match(/^NEXT_PUBLIC_CONVEX_URL=(\S+)/m)?.[1];
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL missing from .env.local");
  return url;
}

export const anonymousClient = () => new ConvexHttpClient(convexUrl());

/**
 * The dev deployment logs sign-in codes (LOG_SIGN_IN_CODES=true) and Convex
 * passes a function's logs back to the browser that called it, so the code
 * shows up in this page's console.
 */
export async function signInAsAdmin(page: Page) {
  await page.goto("/admin");
  const pattern = new RegExp(`admin code for ${E2E_ADMIN.replace(/[.@]/g, "\\$&")}: (\\d{6})`);
  const code = new Promise<string>((resolve) => {
    page.on("console", (message) => {
      const match = message.text().match(pattern);
      if (match) resolve(match[1]);
    });
  });
  await page.getByLabel("Admin email").fill(E2E_ADMIN);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText("We sent a 6-digit code")).toBeVisible();
  await page.getByLabel("Code").fill(await code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("navigation", { name: "Admin sections" })).toBeVisible();
}

/** Collects page errors and failed requests so a test can assert there were none. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Download the React DevTools")) errors.push(`console: ${m.text()}`);
  });
  return errors;
}
