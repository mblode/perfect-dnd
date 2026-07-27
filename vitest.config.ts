import path from "node:path";

import { defineConfig } from "vitest/config";

// Node environment on purpose: everything under test is pure logic that takes
// its clock as an argument, so none of it needs a DOM. Anything that does need
// one belongs in a browser drag, not here.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
