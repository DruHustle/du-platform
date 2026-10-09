import { LegalRepository } from "../repositories/legalRepository";
export class LegalService {
  constructor(private readonly repository = new LegalRepository()) {}
  health() { return this.repository.health(); }
}
