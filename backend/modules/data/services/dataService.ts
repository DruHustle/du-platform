import { DataRepository } from "../repositories/dataRepository";
export class DataService {
  constructor(private readonly repository = new DataRepository()) {}
  health() { return this.repository.health(); }
}
