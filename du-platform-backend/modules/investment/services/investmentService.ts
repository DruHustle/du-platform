import { InvestmentRepository } from "../repositories/investmentRepository";

export class InvestmentService {
  constructor(private readonly repository = new InvestmentRepository()) {}

  async searchNtir(query: string) {
    const normalizedQuery = String(query ?? "");
    const results = await this.repository.searchNtir(normalizedQuery);
    return {
      query: normalizedQuery,
      count: results.length,
      results,
    };
  }
}
