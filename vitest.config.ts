import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // Integration tests spin up in-memory PGlite + run migrations; give them room.
    hookTimeout: 30_000,
    testTimeout: 20_000,
    include: ["test/**/*.test.ts"],
  },
});
