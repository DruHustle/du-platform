import { TourismRepository } from "../repositories/tourismRepository";
export class TourismService {
  constructor(private readonly repository = new TourismRepository()) {}
  health() { return this.repository.health(); }
}
