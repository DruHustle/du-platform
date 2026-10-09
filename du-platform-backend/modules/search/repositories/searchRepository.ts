import { searchNtirEntities } from "../../../shared/persistence/investmentStore";

export class SearchRepository {
  searchNtir(query: string) {
    return searchNtirEntities(query);
  }
}
