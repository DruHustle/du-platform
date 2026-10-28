import { searchNtirEntities } from "../../../lib/persistence/investmentStore";

export class InvestmentRepository {
  searchNtir(query: string) {
    return searchNtirEntities(query);
  }
}
