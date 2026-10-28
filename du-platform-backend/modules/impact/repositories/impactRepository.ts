import { getSuccessStories } from "../../../lib/persistence/impactStore";

export class ImpactRepository {
  listStories() {
    return getSuccessStories(false);
  }
}
