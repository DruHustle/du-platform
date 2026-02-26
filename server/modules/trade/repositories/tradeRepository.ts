export class TradeRepository {
  async health() { return { domain: "trade", ok: true }; }
}
