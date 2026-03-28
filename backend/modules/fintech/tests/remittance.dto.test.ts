import { describe, expect, it } from "vitest";
import { remittanceSchema } from "../dto/remittance.dto";

describe("remittanceSchema", () => {
  it("requires quoted exchange fields when a protected quote is supplied", () => {
    const result = remittanceSchema.safeParse({
      recipientName: "Test Recipient",
      recipientType: "mobile_money",
      amountSent: 100,
      currencyFrom: "EUR",
      currencyTo: "USD",
      receivingCountry: "ZW",
      recipient: {
        mobileNumber: "+263771234567",
      },
      quoteId: "QT-test-1",
      quoteExpiryTime: new Date(Date.now() + 60_000).toISOString(),
      quoteToken: "12345678901234567890123456789012",
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const issuePaths = result.error.issues.map((issue) => issue.path.join("."));
    expect(issuePaths).toContain("quotedFxRate");
    expect(issuePaths).toContain("quotedReceivingAmount");
    expect(issuePaths).toContain("quotedReceivingCurrency");
  });
});
