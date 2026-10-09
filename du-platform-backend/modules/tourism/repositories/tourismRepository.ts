export class TourismRepository {
  async health() { return { domain: "tourism", ok: true }; }
}
