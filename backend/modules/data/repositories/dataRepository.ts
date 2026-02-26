export class DataRepository {
  async health() { return { domain: "data", ok: true }; }
}
