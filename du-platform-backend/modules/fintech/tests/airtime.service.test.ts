import crypto from "crypto";
import { describe, expect, it, vi } from "vitest";
import { UserFacingError } from "../../../core/errorHandler";
import { AirtimeService } from "../services/airtimeService";

describe("AirtimeService", () => {
  it("requires KYC before top-up", async () => {
    const provider = {
      providerName: "reloadly",
      displayName: "Reloadly",
      supports: () => true,
      detectOperator: vi.fn(),
      fetchTopupOptions: vi.fn(),
      createTopup: vi.fn(),
    };

    const repository = {
      getFinancialProfile: vi.fn().mockResolvedValue({
        id: 7,
        full_name: "Test User",
        email: "test@example.com",
        kyc_verified: false,
      }),
    };

    const service = new AirtimeService(provider as any, repository as any);

    await expect(
      service.topup(7, {
        phoneNumber: "+263771234567",
        amount: 10,
        currency: "USD",
        idempotencyKey: crypto.randomUUID(),
      })
    ).rejects.toMatchObject<UserFacingError>({
      message: "KYC verification is required for airtime top-up.",
      statusCode: 403,
      code: "KYC_REQUIRED",
    });

    expect(provider.createTopup).not.toHaveBeenCalled();
  });

  it("returns an existing transaction for a repeated idempotency key", async () => {
    const provider = {
      providerName: "reloadly",
      displayName: "Reloadly",
      supports: () => true,
      detectOperator: vi.fn(),
      fetchTopupOptions: vi.fn(),
      createTopup: vi.fn(),
    };

    const existingTransaction = {
      id: 42,
      status: "completed",
      provider_reference: "reloadly-123",
    };
    const repository = {
      getFinancialProfile: vi.fn().mockResolvedValue({
        id: 7,
        full_name: "Test User",
        email: "test@example.com",
        kyc_verified: true,
      }),
      findAirtimeByIdempotencyKey: vi.fn().mockResolvedValue(existingTransaction),
    };

    const service = new AirtimeService(provider as any, repository as any);
    const idempotencyKey = crypto.randomUUID();

    await expect(
      service.topup(7, {
        phoneNumber: "+263771234567",
        amount: 10,
        currency: "USD",
        idempotencyKey,
      })
    ).resolves.toEqual({
      transaction: existingTransaction,
      providerResponse: null,
    });

    expect(repository.findAirtimeByIdempotencyKey).toHaveBeenCalledWith(7, idempotencyKey);
    expect(provider.createTopup).not.toHaveBeenCalled();
  });
});
