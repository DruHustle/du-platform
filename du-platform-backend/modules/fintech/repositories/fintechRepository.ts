import {
  createAirtimeTransactionRecord,
  createRemittanceTransactionRecord,
  getAirtimeTransactionById,
  getAirtimeTransactionByIdempotencyKey,
  getRemittanceAmountTotalByUserSince,
  getRemittanceTransactionById,
  getRemittanceTransactionByIdempotencyKey,
  getUserFinancialProfile,
  listAirtimeTransactionsByUser,
  listRemittanceTransactionsByUser,
  markAirtimeCompletionEmailSent,
  markRemittanceCompletionEmailSent,
  updateAirtimeTransactionStatusByProviderReference,
  updateRemittanceTransactionStatusByProviderReference,
} from "../../../shared/persistence/fintechStore";
import { withTransaction } from "../../../shared/database";

export class FintechRepository {
  async getFinancialProfile(userId: number) {
    return getUserFinancialProfile(userId);
  }

  async saveRemittance(input: Parameters<typeof createRemittanceTransactionRecord>[0]) {
    return withTransaction(async (connection) =>
      createRemittanceTransactionRecord(input, connection ?? undefined)
    );
  }

  async saveAirtime(input: Parameters<typeof createAirtimeTransactionRecord>[0]) {
    return withTransaction(async (connection) =>
      createAirtimeTransactionRecord(input, connection ?? undefined)
    );
  }

  async findRemittance(transactionId: number, userId: number) {
    return getRemittanceTransactionById(transactionId, userId);
  }

  async findAirtime(transactionId: number, userId: number) {
    return getAirtimeTransactionById(transactionId, userId);
  }

  async findAirtimeByIdempotencyKey(userId: number, idempotencyKey: string) {
    return getAirtimeTransactionByIdempotencyKey(userId, idempotencyKey);
  }

  async findRemittanceByIdempotencyKey(userId: number, idempotencyKey: string) {
    return getRemittanceTransactionByIdempotencyKey(userId, idempotencyKey);
  }

  async updateRemittanceStatusByProviderReference(providerReference: string, status: "pending" | "processing" | "completed" | "failed") {
    return updateRemittanceTransactionStatusByProviderReference(providerReference, status);
  }

  async updateAirtimeStatusByProviderReference(providerReference: string, status: "pending" | "completed" | "failed") {
    return updateAirtimeTransactionStatusByProviderReference(providerReference, status);
  }

  async listRemittanceHistory(userId: number, limit = 20) {
    return listRemittanceTransactionsByUser(userId, limit);
  }

  async listAirtimeHistory(userId: number, limit = 20) {
    return listAirtimeTransactionsByUser(userId, limit);
  }

  async getRemittanceTotalSince(userId: number, sinceIso: string) {
    return getRemittanceAmountTotalByUserSince(userId, sinceIso);
  }

  async markRemittanceCompletionEmailSent(transactionId: number) {
    return markRemittanceCompletionEmailSent(transactionId);
  }

  async markAirtimeCompletionEmailSent(transactionId: number) {
    return markAirtimeCompletionEmailSent(transactionId);
  }
}
