import { AiModuleRepository } from '../repositories/aiModuleRepository';

export class AiModuleService {
  constructor(private readonly repository = new AiModuleRepository()) {}

  getCapabilities() {
    return this.repository.listCapabilities();
  }
}
