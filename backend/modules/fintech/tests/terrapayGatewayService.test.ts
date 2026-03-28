import { afterEach, describe, expect, it, vi } from "vitest";
import { TerraPayGatewayService } from "../services/terrapayGatewayService";

function buildQuotedFields(preview: any) {
  return {
    quoteId: preview.quote.quoteId,
    quoteExpiryTime: preview.quote.quoteExpiryTime,
    quoteToken: preview.quoteToken,
    quotedFxRate: preview.quote.fxRate,
    quotedReceivingAmount: preview.quote.receivingAmount,
    quotedReceivingCurrency: preview.quote.receivingCurrency,
    quotedSenderFee: preview.quote.senderFee,
  };
}

describe("TerraPayGatewayService", () => {
  const originalQuoteSecret = process.env.FINTECH_QUOTE_TOKEN_SECRET;
  const originalGraceMs = process.env.FINTECH_REMITTANCE_QUOTE_GRACE_MS;

  afterEach(() => {
    process.env.FINTECH_QUOTE_TOKEN_SECRET = originalQuoteSecret;
    process.env.FINTECH_REMITTANCE_QUOTE_GRACE_MS = originalGraceMs;
  });

  it("rejects expired quote tokens before creating a transaction", async () => {
    process.env.FINTECH_QUOTE_TOKEN_SECRET = "test-quote-secret";
    process.env.FINTECH_REMITTANCE_QUOTE_GRACE_MS = "1000";

    const expiredAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const createTransaction = vi.fn();
    const provider = {
      providerName: "terrapay",
      displayName: "TerraPay",
      supports: () => true,
      createQuotation: vi.fn().mockResolvedValue({
        requestDate: new Date().toISOString(),
        quotationReference: "QT-test-1",
        quotationStatus: "OK",
        quotes: [
          {
            quoteId: "QT-test-1",
            quoteExpiryTime: expiredAt,
            sendingAmount: "100.00",
            sendingCurrency: "EUR",
            receivingAmount: "109.14",
            receivingCurrency: "USD",
            fxRate: "1.0914",
            senderFee: "2.50",
          },
        ],
      }),
      createTransaction,
    };

    const service = new TerraPayGatewayService(provider as any);
    const preview = await service.previewQuote({
      amountSent: 100,
      currencyFrom: "EUR",
      currencyTo: "USD",
      receivingCountry: "ZW",
      originCountry: "DE",
      recipientType: "mobile_money",
      recipientMsisdn: "+263771234567",
    });

    await expect(
      service.sendMoney({
        recipientName: "Test Recipient",
        recipientType: "mobile_money",
        amountSent: 100,
        currencyFrom: "EUR",
        currencyTo: "USD",
        receivingCountry: "ZW",
        originCountry: "DE",
        recipient: {
          mobileNumber: "+263771234567",
        },
        ...buildQuotedFields(preview),
      })
    ).rejects.toThrow("expired");

    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("accepts equivalent Zimbabwe phone formats when validating quote tokens", async () => {
    process.env.FINTECH_QUOTE_TOKEN_SECRET = "test-quote-secret";
    process.env.FINTECH_REMITTANCE_QUOTE_GRACE_MS = "30000";

    const futureExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const createTransaction = vi.fn().mockResolvedValue({
      transactionId: "TX-test-1",
      transactionStatus: "1000:Transaction Pending",
    });
    const provider = {
      providerName: "terrapay",
      displayName: "TerraPay",
      supports: () => true,
      createQuotation: vi.fn().mockResolvedValue({
        requestDate: new Date().toISOString(),
        quotationReference: "QT-test-2",
        quotationStatus: "OK",
        quotes: [
          {
            quoteId: "QT-test-2",
            quoteExpiryTime: futureExpiry,
            sendingAmount: "100.00",
            sendingCurrency: "EUR",
            receivingAmount: "109.14",
            receivingCurrency: "USD",
            fxRate: "1.0914",
          },
        ],
      }),
      createTransaction,
    };

    const service = new TerraPayGatewayService(provider as any);
    const preview = await service.previewQuote({
      amountSent: 100,
      currencyFrom: "EUR",
      currencyTo: "USD",
      receivingCountry: "ZW",
      originCountry: "DE",
      recipientType: "mobile_money",
      recipientMsisdn: "0771234567",
    });

    const result = await service.sendMoney({
      recipientName: "Test Recipient",
      recipientType: "mobile_money",
      amountSent: 100,
      currencyFrom: "EUR",
      currencyTo: "USD",
      receivingCountry: "ZW",
      originCountry: "DE",
      recipient: {
        mobileNumber: "+263771234567",
      },
      ...buildQuotedFields(preview),
    });

    expect(createTransaction).toHaveBeenCalledTimes(1);
    expect(result.transaction.transactionId).toBe("TX-test-1");
  });
});
