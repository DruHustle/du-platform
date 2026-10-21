import { describe, expect, it } from "vitest";
import { subscriptionSchema, parseNewsletter } from "../routes";
import { renderNewsletter } from "../content";
import { NewsletterService } from "../service";
import { deliveryFailure, safeRetryWindowMs } from "../worker";

describe("newsletter safety", () => {
  it("normalizes addresses, accepts existing signup clients and rejects refused consent", () => {
    expect(
      parseNewsletter(subscriptionSchema, {
        email: " Reader@Example.com ",
        consent: true,
      }).email
    ).toBe("reader@example.com");
    expect(
      parseNewsletter(subscriptionSchema, { email: "reader@example.com" }).email
    ).toBe("reader@example.com");
    expect(() =>
      parseNewsletter(subscriptionSchema, {
        email: "reader@example.com",
        consent: false,
      })
    ).toThrow();
    expect(() =>
      parseNewsletter(subscriptionSchema, { email: "bad", consent: true })
    ).toThrow();
  });
  it("does not report success when there is no database", async () => {
    await expect(
      new NewsletterService(null).subscribe("reader@example.com")
    ).rejects.toMatchObject({ statusCode: 503 });
  });
  it("escapes HTML and includes a private unsubscribe link in both email formats", () => {
    const email = renderNewsletter(
      "<img src=x onerror=alert(1)>",
      "<script>evil()</script>\nNews",
      "https://www.diasporaunlocked.com/newsletter#action=unsubscribe&token=abc"
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Unsubscribe</a>");
    expect(email.text).toContain("Unsubscribe: https://");
  });
  it("retries temporary failures but stops permanent rejections and exhausted jobs", () => {
    expect(deliveryFailure({ response: { status: 429 } }, 1).retry).toBe(true);
    expect(deliveryFailure(new Error("timeout"), 1).retry).toBe(true);
    expect(deliveryFailure({ response: { status: 422 } }, 1).retry).toBe(false);
    expect(deliveryFailure({ response: { status: 503 } }, 5).retry).toBe(false);
    expect(safeRetryWindowMs).toBeLessThan(24 * 60 * 60 * 1000);
  });
});
