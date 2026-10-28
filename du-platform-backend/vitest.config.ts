import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ["modules/**/*.test.ts"],
    environment: "node",
  },
});
