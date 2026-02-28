import { createCareReferral } from "../../../db";
import type { CareProvider } from "../types/care.types";

export class CareRepository {
  async health() {
    return { domain: "care", ok: true };
  }

  async logReferral(input: { userId: number; provider: CareProvider }) {
    return createCareReferral({ userId: input.userId, provider: input.provider });
  }
}
