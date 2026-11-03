import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { accountNavigationState, nativeLink, nativeLinkingConfig, navigationPath, travelLink, websiteLinkState } from "../src/links";

// Use the exact parser re-exported by our declared native navigation package,
// without loading the React Native UI runtime in these node-level route tests.
const nativeRequire = createRequire(createRequire(import.meta.url).resolve("@react-navigation/native/package.json"));
const { getStateFromPath } = await import(nativeRequire.resolve("@react-navigation/core"));
describe("account deep links", () => {
  it("accepts a reset token from the email fragment", () => {
    expect(navigationPath("reset-password#token=abc123")).toBe("reset-password?token=abc123");
    expect(navigationPath("reset-password?next=account#token=abc123")).toBe("reset-password?next=account&token=abc123");
  });
  it("does not interpret fragments on unrelated content", () => {
    expect(navigationPath("travel#token=abc123")).toBe("travel#token=abc123");
  });
  it("opens the requested native research tab or offers a safe website handoff", () => {
    expect(travelLink("stays")).toEqual({category: "stays"});
    expect(travelLink("flights")).toEqual({category: "flights"});
    expect(travelLink("car-hire")).toEqual({website: "/travel/car-hire"});
    expect(travelLink("weather")).toEqual({website: "/travel/weather"});
    expect(travelLink("//evil.example")).toEqual({website: "/travel"});
  });
});

describe("native navigation destinations", () => {
  it("keeps the main application behind a cold-start reset email", () => {
    const link = nativeLink("reset-password#token=private-reset-token");
    expect(link.kind).toBe("native");
    if (link.kind !== "native") throw new Error("Reset link was not handled natively");
    const state = getStateFromPath(link.path, nativeLinkingConfig);
    expect(state.index).toBe(1);
    expect(state.routes.map((route: {name: string}) => route.name)).toEqual(["Main", "Reset"]);
    expect(state.routes[1].params).toEqual({ token: "private-reset-token" });
    // Returning after success or failure removes the recovery token from history.
    const login = accountNavigationState();
    expect(login.routes[0].state.routes[0]).toEqual({ name: "Account", params: { mode: "login" } });
    expect(JSON.stringify(login)).not.toContain("private-reset-token");
    expect(accountNavigationState("forgot").routes[0].state.routes[0].params.mode).toBe("forgot");
  });

  it("routes existing product and category URLs to their native screens", () => {
    const product = nativeLink("shop/products?product=warriors-home-jersey");
    expect(product).toEqual({ kind: "native", path: "shop/product/warriors-home-jersey" });
    if (product.kind !== "native") throw new Error("Product link was not handled");
    const state = getStateFromPath(product.path, nativeLinkingConfig);
    expect(state.routes[0].name).toBe("Main");
    expect(state.routes[1]).toMatchObject({ name: "Product", params: { slug: "warriors-home-jersey" } });
    const category = nativeLink("shop/products?category=crafts");
    expect(category).toEqual({ kind: "native", path: "shop?category=crafts" });
    if (category.kind !== "native") throw new Error("Category link was not handled");
    expect(getStateFromPath(category.path, nativeLinkingConfig).routes[0].state.routes[0])
      .toMatchObject({ name: "Shop", params: { category: "crafts" } });
    expect(nativeLink("shop/products?category=all&cart=1")).toEqual({ kind: "native", path: "basket" });
    expect(nativeLink("shop/products?cart=1")).toEqual({ kind: "native", path: "basket" });
    expect(nativeLink("shop")).toEqual({ kind: "native", path: "shop?category=all" });
    expect(nativeLink("shop/products?product=123")).toEqual({ kind: "native", path: "shop/product/123" });
  });

  it.each([
    "/shop/order-status?ref=DU-123#token=private-order-token",
    "/shop/interest?product=jersey",
    "/travel/car-hire",
    "/travel/my-trips",
    "/travel/stays?adults=3&rooms=2",
    "/travel#victoria-falls",
    "/shop/products?segment=women",
    "/shop/products?category=crafts&cart=1",
    "/shop/products?available=1",
    "/shop/products?product=jersey&category=food",
    "/shop/products?category=unrecognised",
    "/shop/products?category=food&category=sports",
    "/shop/product/jersey?campaign=visit",
    "/search?q=Zimbabwe",
    "/login?next=%2Fadmin",
  ])("preserves the complete website-only link %s", path => {
    const link = nativeLink(path);
    expect(link).toMatchObject({ kind: "website", path });
    if (link.kind !== "website") throw new Error("Website link was not handled");
    expect(websiteLinkState(link)).toMatchObject({ index: 1, routes: [{ name: "Main" }, { name: "External", params: { path } }] });
  });

  it("selects the requested account form", () => {
    for (const [path, mode] of [["register", "register"], ["forgot-password", "forgot"]]) {
      const link = nativeLink(path);
      if (link.kind !== "native") throw new Error("Account link was not handled");
      expect(getStateFromPath(link.path, nativeLinkingConfig).routes[0].state.routes[0])
        .toMatchObject({ name: "Account", params: { mode } });
    }
  });

  it("does not turn an untrusted origin or malformed path into a website handoff", () => {
    for (const path of ["//evil.test", "https://evil.test/shop", "javascript:alert(1)", "shop\\products", "shop\u0000/products"])
      expect(nativeLink(path)).toEqual({ kind: "invalid" });
  });
});
