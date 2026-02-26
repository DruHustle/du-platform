import { TradeRepository } from "../repositories/tradeRepository";
export class TradeService {
  constructor(private readonly repository = new TradeRepository()) {}
  health() { return this.repository.health(); }
}
