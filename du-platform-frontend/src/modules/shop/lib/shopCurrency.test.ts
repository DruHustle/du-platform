import { describe, expect, it } from "vitest";
import { convertShopCents, currencyForTimeZone } from "@/contracts/shopCurrency";
import { isOrderReceipt } from "./checkoutSession";

describe("regional shop currency", () => {
  it("uses Zimbabwe USD, South Africa ZAR, and Europe EUR without geolocation requests", () => {
    expect(currencyForTimeZone("Africa/Harare")).toBe("USD");
    expect(currencyForTimeZone("Africa/Johannesburg")).toBe("ZAR");
    expect(currencyForTimeZone("Europe/Berlin")).toBe("EUR");
    expect(currencyForTimeZone("Europe/London")).toBe("EUR");
  });
  it("rounds at the unit price in minor units, including products entered in rands", () => {
    expect(convertShopCents(525, "EUR", "EUR")).toBe(525);
    expect(convertShopCents(525, "EUR", "USD")).toBe(588);
    expect(convertShopCents(525, "EUR", "ZAR")).toBe(9742);
    expect(convertShopCents(185569, "ZAR", "EUR")).toBe(10000);
    expect(() => convertShopCents(100, "GBP", "EUR")).toThrow();
    expect(() => convertShopCents(-100, "EUR", "USD")).toThrow();
  });
  it.each(["EUR", "USD", "ZAR"])(
    "restores a saved %s request with its original currency",
    currency => {
      expect(
        isOrderReceipt({
          orderRef: "DU-TEST",
          status: "awaiting_payment",
          paymentMethod: "manual_assisted",
          currency,
          subtotalCents: 588,
          shippingCents: 1345,
          totalCents: 1933,
          deliverySpeed: "normal",
          manageToken: "a".repeat(64),
        })
      ).toBe(true);
    }
  );
});
