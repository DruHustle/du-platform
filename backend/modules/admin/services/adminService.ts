import { AdminRepository } from "../repositories/adminRepository";
export class AdminService {
  constructor(private readonly repository = new AdminRepository()) {}
  health() { return this.repository.health(); }
}
