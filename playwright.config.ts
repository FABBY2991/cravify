import { defineConfig, devices } from "@playwright/test";

// macOS 12 can't run Playwright's bundled Chromium, so tests drive the
// installed Chrome. The dev server must be pointed at the dev deployment.
const PORT = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "e2e",
  // Generous: the first visit to a route compiles it on the dev server.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], channel: "chrome" },
      testMatch: /storefront\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
