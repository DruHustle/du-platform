import { CareRepository } from "../repositories/careRepository";
import type { CareProvider } from "../types/care.types";

export class CareService {
  constructor(private readonly repository = new CareRepository()) {}

  health() {
    return this.repository.health();
  }

  logReferral(input: { userId: number; provider: CareProvider }) {
    return this.repository.logReferral(input);
  }
}
