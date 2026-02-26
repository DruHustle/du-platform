export class AdminRepository {
  async health() { return { domain: "admin", ok: true }; }
}
