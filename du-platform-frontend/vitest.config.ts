import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  esbuild: { jsx: "automatic", jsxImportSource: "react" },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
