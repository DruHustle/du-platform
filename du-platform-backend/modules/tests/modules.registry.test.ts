import { describe, it, expect, vi } from "vitest";
import { registerDomainModules } from "../index";

describe("domain module registry", () => {
  it("mounts all domain routers under expected base paths", () => {
    const use = vi.fn();
    const post = vi.fn();
    const app = { use, post } as any;

    registerDomainModules(app);

    const mountedPaths = use.mock.calls.map(call => call[0]);

    expect(mountedPaths).toEqual([
      "/api/newsletter",
      "/api/auth",
      "/api/travel",
      "/api/weather",
      "/api/tourism",
      "/api/investment",
      "/api/impact",
      "/api/search",
      "/api/legal",
      "/api/admin",
      "/api/notifications",
      "/api/ai",
      "/api/shop",
    ]);
  });

  it("lets the ai module own compatibility speech endpoints too", () => {
    const use = vi.fn();
    const post = vi.fn();
    const app = { use, post } as any;

    registerDomainModules(app);

    const mountedPaths = post.mock.calls.map(call => call[0]);

    expect(mountedPaths).toContain("/api/whisper");
    expect(mountedPaths).toContain("/api/tts");
    expect(mountedPaths.filter(path => path === "/api/speech")).toHaveLength(2);
  });
});
