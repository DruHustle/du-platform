import { ImpactRepository } from "../repositories/impactRepository";

export class ImpactService {
  constructor(private readonly repository = new ImpactRepository()) {}

  async listStories() {
    const stories = await this.repository.listStories();
    return { count: stories.length, stories };
  }
}
