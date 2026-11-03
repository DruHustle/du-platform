import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorBoundary from "./ErrorBoundary";

describe("public error recovery", () => {
  it("offers recovery without rendering exception messages or stack details", () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = {
      hasError: true,
      error: new Error("Internal error at /private/customer-data/record.json"),
    };
    const html = renderToStaticMarkup(boundary.render());
    expect(html).not.toContain("/private/customer-data");
    expect(html).not.toContain("Internal error");
    expect(html).toContain("<button");
  });
});
