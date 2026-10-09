import { describe, expect, it } from "vitest";
import { ArExperienceService } from "./arExperienceService";

describe("ArExperienceService", () => {
  it("returns real AR destination metadata instead of placeholder GLB assets", async () => {
    const service = new ArExperienceService();

    const result = await service.getExperienceMetadata({ sessionId: "test-session" });

    expect(result.mode).toBe("ar");
    expect(result.destinationIds).toEqual([
      "victoria_falls",
      "great_zimbabwe",
      "harare",
      "bulawayo",
      "hwange",
    ]);
    expect(result.previewImages.victoria_falls).toEqual(["/images/pages/tourism/victoria_falls.jpg"]);
    expect(result.features).toEqual({
      geolocation: true,
      cameraGuide: true,
      voiceNarration: true,
      conversation: true,
      audioTranscription: true,
    });
    expect(JSON.stringify(result)).not.toContain(".glb");
  });
});
