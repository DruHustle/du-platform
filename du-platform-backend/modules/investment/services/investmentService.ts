import { db } from "../../../lib/databaseRuntime";
import { InvestmentRepository } from "../repositories/investmentRepository";

export class InvestmentService {
  constructor(private readonly repository = new InvestmentRepository()) {}

  async searchNtir(query: string) {
    const normalizedQuery = String(query ?? "");
    const results = await this.repository.searchNtir(normalizedQuery);
    let profiles = new Map<string, unknown>();
    if (db && results.length) {
      const [rows] = await db.query<any[]>(
        `SELECT subject_key,details FROM research_profiles WHERE kind='ntir' AND subject_key IN (${results.map(() => "?").join(",")})`,
        results.map(row => String(row.id))
      );
      profiles = new Map(
        rows.map(row => [row.subject_key, JSON.parse(row.details)])
      );
    }
    return {
      query: normalizedQuery,
      count: results.length,
      results: results.map(row => ({
        ...row,
        research_profile: profiles.get(String(row.id)) ?? null,
      })),
    };
  }
}
