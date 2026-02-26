export class LegalRepository {
  async health() { return { domain: "legal", ok: true }; }
}
