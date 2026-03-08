import { describe, it, expect } from "vitest";
import { createNotificationsModuleRouter } from "../routes";
import { findRoute, getRouteEntries } from "../../tests/routeContract";

describe("notifications module router", () => {
  it("registers feature and newsletter notification routes", () => {
    const routes = getRouteEntries(createNotificationsModuleRouter());

    expect(findRoute(routes, "post", "/features")).toBeDefined();
    expect(findRoute(routes, "post", "/newsletter")).toBeDefined();
  });
});
