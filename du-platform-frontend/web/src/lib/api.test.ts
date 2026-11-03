import { afterEach, describe, expect, it, vi } from "vitest";
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

import { getApiErrorMessage } from "./api";
describe("user-facing API failure messages", () => {
  it("gives recoverable feedback for timeouts and offline requests", () => {
    for (const code of ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"])
      expect(
        getApiErrorMessage(
          { code, message: "Internal network detail" },
          "Please try again."
        )
      ).toBe("Please try again.");
  });
  it("preserves actionable server errors instead of generic transport messages", () => {
    expect(
      getApiErrorMessage(
        {
          message: "Request failed with status 400",
          response: { data: { error: { message: "Insufficient stock." } } },
        },
        "Please try again."
      )
    ).toBe("Insufficient stock.");
  });
});

describe("session refresh errors", () => {
  it.each([
    [503, 503],
    [429, 429],
    [401, 401],
  ])(
    "preserves a refresh response of %i as %i",
    async (refreshStatus, expected) => {
      const { api } = await import("./api");
      const previousAdapter = api.defaults.adapter;
      api.defaults.adapter = async config => {
        const status =
          config.url === "/auth/token/refresh" ? refreshStatus : 401;
        throw { config, response: { status } };
      };
      try {
        await expect(api.get("/auth/me")).rejects.toMatchObject({
          response: { status: expected },
        });
      } finally {
        api.defaults.adapter = previousAdapter;
      }
    }
  );
});
