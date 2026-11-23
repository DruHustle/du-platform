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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("session changes during a protected request", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["logout", "sign-in"])(
    "discards a pending refresh after %s",
    async action => {
      vi.stubGlobal("window", {});
      const { api, saveAuthToken, clearAuthToken, loadAuthToken } =
        await import("./api");
      saveAuthToken("first-account");
      const started = deferred<void>();
      const refreshed = deferred<string>();
      let writes = 0;
      api.defaults.adapter = async config => {
        if (config.url === "/auth/token/refresh") {
          started.resolve();
          const accessToken = await refreshed.promise;
          return {
            data: { accessToken },
            config,
            headers: {},
            status: 200,
            statusText: "OK",
          };
        }
        writes++;
        throw { config, response: { status: 401 } };
      };
      const write = api.put("/auth/profile", { fullName: "Updated Name" });
      await started.promise;
      if (action === "logout") clearAuthToken();
      else saveAuthToken("second-account");

      refreshed.resolve("refreshed-first-account");
      await expect(write).rejects.toMatchObject({ response: { status: 401 } });
      expect(writes).toBe(1);
      expect(loadAuthToken()).toBe(action === "logout" ? "" : "second-account");
    }
  );

  it("retries once with the refreshed token while the account stays signed in", async () => {
    vi.stubGlobal("window", {});
    const { api, saveAuthToken } = await import("./api");
    saveAuthToken("original-token");
    const attempts: unknown[] = [];
    api.defaults.adapter = async config => {
      if (config.url === "/auth/token/refresh") {
        return {
          data: { accessToken: "renewed-token" },
          config,
          headers: {},
          status: 200,
          statusText: "OK",
        };
      }
      attempts.push(config.headers.get("Authorization"));
      if (attempts.length === 1) throw { config, response: { status: 401 } };
      return {
        data: { saved: true },
        config,
        headers: {},
        status: 200,
        statusText: "OK",
      };
    };
    await expect(
      api.put("/auth/profile", { fullName: "Updated Name" })
    ).resolves.toMatchObject({ data: { saved: true } });
    expect(attempts).toEqual(["Bearer original-token", "Bearer renewed-token"]);
  });

  it("does not refresh a delayed unauthorized request from a previous sign-in", async () => {
    vi.stubGlobal("window", {});
    const { api, saveAuthToken } = await import("./api");
    const started = deferred<void>();
    const finish = deferred<void>();
    const urls: Array<string | undefined> = [];
    api.defaults.adapter = async config => {
      urls.push(config.url);
      started.resolve();
      await finish.promise;
      throw { config, response: { status: 401 } };
    };
    saveAuthToken("first-account");
    const request = api.put("/auth/profile", { fullName: "First Account" });
    await started.promise;
    saveAuthToken("second-account");
    finish.resolve();
    await expect(request).rejects.toMatchObject({ response: { status: 401 } });
    expect(urls).toEqual(["/auth/profile"]);
  });

  it("deduplicates refreshes within each sign-in and keeps the new refresh in flight", async () => {
    vi.stubGlobal("window", {});
    const { api, saveAuthToken, refreshAuthTokenFromSession, loadAuthToken } =
      await import("./api");
    const first = deferred<string>();
    const second = deferred<string>();
    const started = deferred<void>();
    let refreshes = 0;
    api.defaults.adapter = async config => {
      const token = ++refreshes === 1 ? first : second;
      started.resolve();
      const accessToken = await token.promise;
      return {
        data: { accessToken },
        config,
        headers: {},
        status: 200,
        statusText: "OK",
      };
    };
    saveAuthToken("first-account");
    const oldRefresh = refreshAuthTokenFromSession();
    await started.promise;
    saveAuthToken("second-account");
    const newRefresh = refreshAuthTokenFromSession();
    first.resolve("refreshed-first-account");
    await expect(oldRefresh).resolves.toBe("");
    const concurrentRefresh = refreshAuthTokenFromSession();
    second.resolve("refreshed-second-account");
    await expect(Promise.all([newRefresh, concurrentRefresh])).resolves.toEqual(
      ["refreshed-second-account", "refreshed-second-account"]
    );
    expect(loadAuthToken()).toBe("refreshed-second-account");
    expect(refreshes).toBe(2);
  });
});
