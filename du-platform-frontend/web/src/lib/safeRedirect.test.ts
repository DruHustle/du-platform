import { describe, expect, it } from "vitest";
import {
  authPageLink,
  returnPathFromSearch,
  safeRedirectPath,
} from "./safeRedirect";

describe("sign-in return path", () => {
  it.each([
    null,
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/\n/example.com",
    "javascript:alert(1)",
  ])("rejects unsafe return paths: %s", value => {
    expect(safeRedirectPath(value)).toBe("/");
  });
  it("preserves internal paths, filters and anchors", () => {
    expect(safeRedirectPath("/shop/products?category=gifts#cart")).toBe(
      "/shop/products?category=gifts#cart"
    );
  });
});

describe("switching between account forms", () => {
  it("round-trips the requested route, query and anchor", () => {
    const target = "/travel/my-trips?city=Victoria%20Falls&sort=date#saved";
    let next = target;
    for (const page of ["/register", "/forgot-password", "/login"] as const) {
      const url = new URL(authPageLink(page, next), "https://example.test");
      next = returnPathFromSearch(url.search);
      expect(next).toBe(target);
    }
  });

  it("omits an invalid or missing destination when building links", () => {
    for (const search of ["", "?next=https%3A%2F%2Fexample.test"]) {
      expect(authPageLink("/register", returnPathFromSearch(search))).toBe(
        "/register"
      );
    }
  });
});
