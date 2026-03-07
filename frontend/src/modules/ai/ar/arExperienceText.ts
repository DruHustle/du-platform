import type { UiLanguage, VoiceGender } from "./arExperienceTypes";

export const AR_UI_TEXT: Record<UiLanguage, Partial<Record<string, string>>> = {
  en: {
    useMyLocation: "Use My Location",
    selectDestination: "Select destination",
    narration: "Narration",
    selectLocation: "Select location",
    narrationPending: "Narration will appear here once AI guidance is generated.",
    turnCameraOn: "Turn Camera On",
    turnCameraOff: "Turn Camera Off",
    currentContext: "Current Context",
    conversationOn: "Conversation: On",
    conversationOff: "Conversation: Off",
    voiceNarrationOn: "NARRATION: On",
    voiceNarrationOff: "NARRATION: Off",
    voice: "Voice",
    male: "Male",
    female: "Female",
    voiceInputOn: "Voice Input: On",
    voiceInput: "Voice Input",
    preview: "Preview",
    arOverlayVoice: "AR Overlay voice narration is",
    cameraLabel: "Camera",
    enabled: "enabled",
    disabled: "disabled",
    cameraOnSummary: "on: live directional AR guidance active.",
    cameraOffSummary: "off: summary narration mode active.",
    geoNotSupported: "Geolocation is not supported on this device.",
    detectingLocation: "Detecting your location...",
    locationDetected: "Location detected. Onesa AI-powered Local Guide is now focused on your nearest destination.",
    locationDetectFail: "Unable to detect location. Please select a destination manually.",
    localGuidanceMode: "Using local guidance mode.",
    transcribing: "Transcribing...",
    listeningGroq: "Listening (Groq)...",
    noSpeechDetected: "No speech detected.",
    guideThinking: "Guide is thinking...",
    groqUnavailable: "Groq STT unavailable. Using local guidance mode.",
    requestingCloudNarration: "Requesting cloud narration...",
    narrating: "Narrating...",
    narratingBrowser: "Narrating (Browser Voice)...",
    elevenQuotaExceeded: "Cloud TTS quota exceeded. Top up credits to keep cloud narration on.",
    elevenUnavailable: "Cloud TTS unavailable. Using browser voice.",
    cloudBlocked: "Cloud audio blocked locally. Using browser voice.",
    tapToEnableNarration: "Tap anywhere to enable narration.",
    voiceNarrationOffStatus: "Voice narration off.",
    selectDestinationFirst: "Select destination first.",
    waitingNarrationText: "Waiting for narration text...",
    micNotSupported: "Microphone not supported in this browser.",
    listening: "Listening...",
    micAccessDenied: "Microphone access denied.",
    cameraTurnOnHint: "Turn on camera for a full AR experience.",
    cameraNotSupported: "Camera is not supported in this browser.",
    cameraOnStatus: "Camera is on. AR live guidance is active.",
    cameraAccessFail: "Unable to access camera. Check permissions and try again.",
    arOverlayOff: "AR Overlay is off. Camera is not required.",
    enableVoiceModeFirst: "Enable Voice Mode first to use Ask Mode.",
    voiceRecognitionUnsupported: "Voice recognition is not supported in this browser.",
    askModeListening: "Ask Mode is listening...",
    askModeError: "Ask Mode: Voice capture error. Try toggling Ask Mode again.",
    unableStartAskMode: "Unable to start Ask Mode.",
    askModeOffBecauseVoiceOff: "Ask Mode is off because Voice Mode is off.",
  },
  sn: {
    useMyLocation: "Shandisa Nzvimbo Yangu",
    selectDestination: "Sarudza nzvimbo",
    narration: "Rondedzero",
    selectLocation: "Sarudza nzvimbo",
    narrationPending: "Rondedzero ichaonekwa pano kana AI yapedza kugadzira gwara.",
    turnCameraOn: "Batidza Kamera",
    turnCameraOff: "Dzima Kamera",
    currentContext: "Mamiro Azvino",
    conversationOn: "Hurukuro: Yabatidzwa",
    conversationOff: "Hurukuro: Yadzimwa",
    voiceNarrationOn: "RONDEDZERO: Yabatidzwa",
    voiceNarrationOff: "RONDEDZERO: Yadzimwa",
    voice: "Izwi",
    male: "Murume",
    female: "Mukadzi",
    voiceInputOn: "Kupinza Izwi: Yabatidzwa",
    voiceInput: "Kupinza Izwi",
    preview: "Muono",
    arOverlayVoice: "Rondedzero yezwi yeAR Overlay iri",
    cameraLabel: "Kamera",
    enabled: "yabatidzwa",
    disabled: "yadzimwa",
    cameraOnSummary: "yabatidzwa: AR yekutungamira iri kushanda.",
    cameraOffSummary: "yadzimwa: rondedzero pfupi iri kushanda.",
    geoNotSupported: "Geolocation haisi kutsigirwa pachishandiso ichi.",
    detectingLocation: "Tiri kutsvaga nzvimbo yako...",
    locationDetected: "Nzvimbo yawanikwa. Onesa AI Local Guide yatarisa nzvimbo iri pedyo newe.",
    locationDetectFail: "Tatadza kuona nzvimbo yako. Ndapota sarudza nzvimbo nemaoko.",
    localGuidanceMode: "Kushandisa gwara remuno.",
    transcribing: "Tiri kushandura izwi kuita chinyorwa...",
    listeningGroq: "Tiri kuteerera (Groq)...",
    noSpeechDetected: "Hapana izwi rawanikwa.",
    guideThinking: "Gwara riri kufunga...",
    groqUnavailable: "Groq STT haisi kuwanikwa. Kushandisa gwara remuno.",
    requestingCloudNarration: "Kukumbira rondedzero yegore...",
    narrating: "Kutaura kuri kuitika...",
    narratingBrowser: "Kutaura kuri kuitika (Browser Voice)...",
    elevenQuotaExceeded: "Makiredhiti eCloud TTS apera. Wedzera makiredhiti kuti cloud narration irambe iripo.",
    elevenUnavailable: "Cloud TTS haisi kuwanikwa. Kushandisa izwi rebrowser.",
    cloudBlocked: "Cloud audio yarambidzwa pano. Kushandisa izwi rebrowser.",
    tapToEnableNarration: "Bata chero panzvimbo kuti rondedzero ishande.",
    voiceNarrationOffStatus: "Rondedzero yezwi yadzimwa.",
    selectDestinationFirst: "Tanga wasarudza nzvimbo.",
    waitingNarrationText: "Mirira kuti chinyorwa cherondedzero chioneke...",
    micNotSupported: "Maikorofoni haisi kutsigirwa mubrowser rino.",
    listening: "Tiri kuteerera...",
    micAccessDenied: "Kupinda kumaikorofoni kwarambwa.",
    cameraTurnOnHint: "Batidza kamera kuti uwane AR yakazara.",
    cameraNotSupported: "Kamera haisi kutsigirwa mubrowser rino.",
    cameraOnStatus: "Kamera yabatidzwa. AR live guidance iri kushanda.",
    cameraAccessFail: "Hatina kukwanisa kushandisa kamera. Tarisa mvumo woedza zvakare.",
    arOverlayOff: "AR Overlay yadzimwa. Kamera haidiwi.",
    enableVoiceModeFirst: "Tanga wabatidza Voice Mode kuti ushandise Ask Mode.",
    voiceRecognitionUnsupported: "Kuziva izwi hakutsigirwi mubrowser rino.",
    askModeListening: "Ask Mode iri kuteerera...",
    askModeError: "Ask Mode: kukanganisa pakutora izwi. Edza kubatidza zvakare.",
    unableStartAskMode: "Tatadza kutanga Ask Mode.",
    askModeOffBecauseVoiceOff: "Ask Mode yadzimwa nekuti Voice Mode yadzimwa.",
  },
  nd: {},
  de: {},
};

export const AR_SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
export const AR_CONVERSATION_TURN_MS = 7000;

export const AR_GENDER_KEYWORD_MAP: Record<VoiceGender, string[]> = {
  male: ["male", "man", "david", "daniel", "george", "john", "paul", "tom", "michael", "alex"],
  female: ["female", "woman", "samantha", "karen", "zira", "emma", "aria", "victoria", "linda", "anna", "zoe"],
};

export function normalizeUiLanguage(value: unknown): UiLanguage {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "en";
  const base = raw.split("-")[0];
  if (base === "en" || base === "sn" || base === "nd" || base === "de") return base;
  if (raw === "shona") return "sn";
  if (raw === "ndebele") return "nd";
  if (raw === "german" || raw === "deutsch") return "de";
  return "en";
}

export function getLanguageLabel(language: UiLanguage): string {
  if (language === "sn") return "Shona";
  if (language === "nd") return "Ndebele";
  if (language === "de") return "German";
  return "English";
}

export function getSpeechLanguageCode(language: UiLanguage): string {
  if (language === "sn") return "sn-ZW";
  if (language === "nd") return "nr-ZW";
  if (language === "de") return "de-DE";
  return "en-US";
}

export function formatNarrationLines(text: string): string[] {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const keyPattern =
    /(?=(?:Heritage|Direction cue|Stop point|What to notice|Narration|Next stop|Local tip|Safety|History|Historical timeline|Culture|Cultural context|Top points of interest|Suggested next stop)\s*:)/g;
  const keyedLines = normalized
    .split(keyPattern)
    .map((item) => item.trim())
    .filter(Boolean);

  if (keyedLines.length > 1) return keyedLines;

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}
