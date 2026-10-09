import { describe, expect, it } from "vitest";
import { VrExperienceService } from "./vrExperienceService";

describe("VrExperienceService", () => {
  it("does not expose emulator room presets in metadata", async () => {
    const service = new VrExperienceService();

    const result = await service.getExperienceMetadata({ sessionId: "test-session" });

    expect(result.mode).toBe("vr");
    expect(result.scenes).toEqual([]);
  });
});
