import { getSuccessStories } from "../../../shared/persistence/impactStore";

export class ImpactRepository {
  listStories() {
    return getSuccessStories(false);
  }
}
