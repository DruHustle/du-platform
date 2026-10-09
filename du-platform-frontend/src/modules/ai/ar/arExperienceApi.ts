import { api } from "@/lib/api";
import { AR_PLACE_IDS, isArPlaceId, type ArExperienceMetadata, type ArPlaceId } from "./arExperienceTypes";

function parseObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDestinationIds(value: unknown): ArPlaceId[] {
  const ids = parseStringArray(value).filter(isArPlaceId);
  return ids.length > 0 ? Array.from(new Set(ids)) : [...AR_PLACE_IDS];
}

function parsePreviewImages(value: unknown): Partial<Record<ArPlaceId, string[]>> {
  const source = parseObject(value);
  const previewImages: Partial<Record<ArPlaceId, string[]>> = {};

  for (const [rawId, rawImages] of Object.entries(source)) {
    if (!isArPlaceId(rawId)) continue;
    const images = parseStringArray(rawImages);
    if (images.length > 0) {
      previewImages[rawId] = images;
    }
  }

  return previewImages;
}

function parseFeatures(value: unknown): ArExperienceMetadata["features"] {
  const source = parseObject(value);
  return {
    geolocation: source.geolocation !== false,
    cameraGuide: source.cameraGuide !== false,
    voiceNarration: source.voiceNarration !== false,
    conversation: source.conversation !== false,
    audioTranscription: source.audioTranscription !== false,
  };
}

export function normalizeArExperienceMetadata(payload: unknown): ArExperienceMetadata {
  const source = parseObject(payload);
  return {
    mode: "ar",
    destinationIds: parseDestinationIds(source.destinationIds),
    previewImages: parsePreviewImages(source.previewImages),
    preload: source.preload !== false,
    features: parseFeatures(source.features),
  };
}

export async function getArExperienceMetadata(input?: { sessionId?: string }): Promise<ArExperienceMetadata> {
  const response = await api.get("/ai/ar", {
    params: { sessionId: input?.sessionId ?? "tourism-augmented-experience" },
    timeout: 10000,
  });
  return normalizeArExperienceMetadata(response.data);
}
