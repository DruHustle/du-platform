import { SearchRepository } from "../repositories/searchRepository";
export class SearchService {
  constructor(private readonly repository = new SearchRepository()) {}
  health() { return this.repository.health(); }
}
