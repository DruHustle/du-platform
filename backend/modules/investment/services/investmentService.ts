import { InvestmentRepository } from "../repositories/investmentRepository";
export class InvestmentService {
  constructor(private readonly repository = new InvestmentRepository()) {}
  health() { return this.repository.health(); }
}
