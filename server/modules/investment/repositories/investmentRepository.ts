export class InvestmentRepository {
  async health() { return { domain: "investment", ok: true }; }
}
