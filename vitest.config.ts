import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Convex functions run in an edge-like runtime; pure client modules opt
    // into `node` with a per-file `@vitest-environment` comment.
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "src/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
