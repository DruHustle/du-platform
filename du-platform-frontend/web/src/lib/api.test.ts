import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("session refresh isolation", () => {
  it.each(["sign-out", "account switch"])(
    "does not restore an old token or replay its request after %s",
    async transition => {
      vi.stubGlobal("window", {});
      const { api, saveAuthToken, clearAuthToken, loadAuthToken } =
        await import("./api");
      saveAuthToken("old-access-token");
      const started = deferred<void>();
      const refreshed = deferred<string>();
      let protectedRequests = 0;
      api.defaults.adapter = async config => {
        if (config.url === "/auth/token/refresh") {
          started.resolve();
          return {
            config,
            status: 200,
            statusText: "OK",
            headers: {},
            data: { accessToken: await refreshed.promise },
          };
        }
        protectedRequests += 1;
        throw { config, response: { status: 401 } };
      };
      const request = api.get("/travel/saved");
      const rejected = expect(request).rejects.toMatchObject({
        response: { status: 401 },
      });
      await started.promise;
      if (transition === "sign-out") clearAuthToken();
      else saveAuthToken("new-account-token");
      refreshed.resolve("old-refreshed-token");
      await rejected;
      expect(loadAuthToken()).toBe(
        transition === "sign-out" ? "" : "new-account-token"
      );
      expect(protectedRequests).toBe(1);
    }
  );

  it("does not refresh a rejected request from before an account switch", async () => {
    vi.stubGlobal("window", {});
    const { api, saveAuthToken, loadAuthToken } = await import("./api");
    saveAuthToken("old-account-token");
    const sent = deferred<void>();
    const rejected = deferred<void>();
    let refreshes = 0;
    api.defaults.adapter = async config => {
      if (config.url === "/auth/token/refresh") {
        refreshes += 1;
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: {},
          data: { accessToken: "unexpected-token" },
        };
      }
      sent.resolve();
      await rejected.promise;
      throw { config, response: { status: 401 } };
    };
    const request = api.get("/travel/saved");
    const failure = expect(request).rejects.toMatchObject({
      response: { status: 401 },
    });
    await sent.promise;
    saveAuthToken("new-account-token");
    rejected.resolve();
    await failure;
    expect(refreshes).toBe(0);
    expect(loadAuthToken()).toBe("new-account-token");
  });

  it.each(["sign-out", "account switch"])(
    "cancels a queued retry if %s happens before its auth interceptor runs",
    async transition => {
      vi.stubGlobal("window", {});
      const { api, saveAuthToken, clearAuthToken, loadAuthToken } =
        await import("./api");
      saveAuthToken("expired-token");
      const queued = deferred<void>();
      const resume = deferred<void>();
      let refreshes = 0;
      let protectedRequests = 0;
      // Axios runs request interceptors asynchronously in reverse order. Hold
      // the replay after it is queued but before the auth interceptor runs.
      api.interceptors.request.use(async config => {
        if (config.url === "/travel/saved" && refreshes > 0) {
          queued.resolve();
          await resume.promise;
        }
        return config;
      });
      api.defaults.adapter = async config => {
        if (config.url === "/auth/token/refresh") {
          refreshes += 1;
          return {
            config,
            status: 200,
            statusText: "OK",
            headers: {},
            data: { accessToken: "renewed-old-account-token" },
          };
        }
        protectedRequests += 1;
        if (protectedRequests === 1)
          throw { config, response: { status: 401 } };
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: {},
          data: { authorization: config.headers.get("Authorization") },
        };
      };
      const request = api.get("/travel/saved");
      const rejected = expect(request).rejects.toMatchObject({
        code: "ERR_CANCELED",
      });
      await queued.promise;
      if (transition === "sign-out") clearAuthToken();
      else saveAuthToken("new-account-token");
      resume.resolve();
      await rejected;
      expect(protectedRequests).toBe(1);
      expect(loadAuthToken()).toBe(
        transition === "sign-out" ? "" : "new-account-token"
      );
    }
  );

  it("deduplicates renewal within the current session and retries with its new token", async () => {
    vi.stubGlobal("window", {});
    const { api, saveAuthToken, loadAuthToken } = await import("./api");
    saveAuthToken("expired-token");
    const started = deferred<void>();
    const refreshed = deferred<void>();
    let refreshes = 0;
    api.defaults.adapter = async config => {
      if (config.url === "/auth/token/refresh") {
        refreshes += 1;
        started.resolve();
        await refreshed.promise;
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: {},
          data: { accessToken: "renewed-token" },
        };
      }
      if (config.headers.get("Authorization") !== "Bearer renewed-token")
        throw { config, response: { status: 401 } };
      return {
        config,
        status: 200,
        statusText: "OK",
        headers: {},
        data: { success: true, data: { owner: "current-account" } },
      };
    };
    const requests = [api.get("/auth/me"), api.get("/travel/saved")];
    await started.promise;
    refreshed.resolve();
    const responses = await Promise.all(requests);
    expect(refreshes).toBe(1);
    expect(loadAuthToken()).toBe("renewed-token");
    expect(responses.map(response => response.data)).toEqual([
      { owner: "current-account" },
      { owner: "current-account" },
    ]);
  });
});
