import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "convex/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
