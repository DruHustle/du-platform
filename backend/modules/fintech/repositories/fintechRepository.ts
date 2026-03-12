import {
  createAirtimeTransactionRecord,
  createRemittanceTransactionRecord,
  createUtilityTransactionRecord,
  getAirtimeTransactionById,
  getAirtimeTransactionByIdempotencyKey,
  getRemittanceTransactionById,
  getRemittanceTransactionByIdempotencyKey,
  getUtilityTransactionById,
  getUtilityTransactionByIdempotencyKey,
  getUserFinancialProfile,
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

  async saveUtility(input: Parameters<typeof createUtilityTransactionRecord>[0]) {
    return withTransaction(async (connection) =>
      createUtilityTransactionRecord(input, connection ?? undefined)
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

  async findUtility(transactionId: number, userId: number) {
    return getUtilityTransactionById(transactionId, userId);
  }

  async findRemittanceByIdempotencyKey(userId: number, idempotencyKey: string) {
    return getRemittanceTransactionByIdempotencyKey(userId, idempotencyKey);
  }

  async findUtilityByIdempotencyKey(userId: number, idempotencyKey: string) {
    return getUtilityTransactionByIdempotencyKey(userId, idempotencyKey);
  }
}
