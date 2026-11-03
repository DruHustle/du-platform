export const AR_PLACE_IDS = [
  "victoria_falls",
  "great_zimbabwe",
  "harare",
  "bulawayo",
  "hwange",
] as const;

export type ArPlaceId = (typeof AR_PLACE_IDS)[number];
export type UiLanguage = "en" | "sn" | "nd" | "de";
export type VoiceGender = "male" | "female";

export type ArPlaceProfile = {
  id: ArPlaceId;
  name: string;
  heritage: string;
  history: string;
  historicalTimeline: string;
  culture: string;
  culturalHighlights: string;
  pointsOfInterest: string[];
  directionTips: string[];
  nextStops: string[];
  safetyNote: string;
};

export type ArExperienceMetadata = {
  mode: "ar";
  destinationIds: ArPlaceId[];
  previewImages: Partial<Record<ArPlaceId, string[]>>;
  preload: boolean;
  features: {
    geolocation: boolean;
    cameraGuide: boolean;
    voiceNarration: boolean;
    conversation: boolean;
    audioTranscription: boolean;
  };
};

export function isArPlaceId(value: string): value is ArPlaceId {
  return (AR_PLACE_IDS as readonly string[]).includes(value);
}
