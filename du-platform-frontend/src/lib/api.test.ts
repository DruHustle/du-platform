import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("production browser requests use the controlled same-origin API even with a dashboard override", async () => {
  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_API_URL", "https://production-api.example.test");
  const { api } = await import("./api");
  expect(api.defaults.baseURL).toBe("/api");
});
it("development retains explicit local backend configuration", async () => {
  vi.stubEnv("PROD", false);
  vi.stubEnv("VITE_API_URL", "http://127.0.0.1:5012");
  const { api } = await import("./api");
  expect(api.defaults.baseURL).toBe("http://127.0.0.1:5012/api");
});
