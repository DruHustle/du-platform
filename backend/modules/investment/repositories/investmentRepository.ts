import { searchNtirEntities } from "../../../shared/persistence/investmentStore";

export class InvestmentRepository {
  searchNtir(query: string) {
    return searchNtirEntities(query);
  }
}
