export class SearchRepository {
  async health() { return { domain: "search", ok: true }; }
}
