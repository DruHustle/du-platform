import type { UiLanguage, VoiceGender } from "./arExperienceTypes";

export const AR_UI_TEXT: Record<UiLanguage, Partial<Record<string, string>>> = {
  en: {
    useMyLocation: "Use My Location",
    selectDestination: "Select destination",
    narration: "Narration",
    selectLocation: "Select location",
    narrationPending:
      "Narration will appear here once AI guidance is generated.",
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
    cameraOnSummary:
      "on: destination information is shown over the camera view.",
    cameraOffSummary: "off: summary narration mode active.",
    geoNotSupported: "Geolocation is not supported on this device.",
    detectingLocation: "Detecting your location...",
    locationNoMatch:
      "No listed destination is near your location. Please select one manually.",
    locationDetected:
      "Location found. Showing the closest destination listed in this guide.",
    locationDetectFail:
      "Unable to detect location. Please select a destination manually.",
    localGuidanceMode: "Using local guidance mode.",
    transcribing: "Transcribing...",
    listeningGroq: "Listening…",
    noSpeechDetected: "No speech detected.",
    guideThinking: "Guide is thinking...",
    groqUnavailable:
      "Voice transcription is unavailable. You can still read the destination guide.",
    requestingCloudNarration: "Requesting cloud narration...",
    narrating: "Narrating...",
    narratingBrowser: "Narrating (Browser Voice)...",
    elevenQuotaExceeded:
      "Online narration is unavailable. Try the browser voice instead.",
    elevenUnavailable:
      "Online narration is unavailable. Using the browser voice.",
    cloudBlocked: "Cloud audio blocked locally. Using browser voice.",
    tapToEnableNarration: "Tap anywhere to enable narration.",
    voiceNarrationOffStatus: "Voice narration off.",
    selectDestinationFirst: "Select destination first.",
    waitingNarrationText: "Waiting for narration text...",
    micNotSupported: "Microphone not supported in this browser.",
    listening: "Listening...",
    micAccessDenied: "Microphone access denied.",
    cameraTurnOnHint:
      "Camera is optional. Turn it on to view destination information over the camera image.",
    cameraNotSupported: "Camera is not supported in this browser.",
    cameraOnStatus: "Camera on. Destination context is displayed.",
    cameraAccessFail:
      "Unable to access camera. Check permissions and try again.",
    arOverlayOff: "AR Overlay is off. Camera is not required.",
    enableVoiceModeFirst: "Enable Voice Mode first to use Ask Mode.",
    voiceRecognitionUnsupported:
      "Voice recognition is not supported in this browser.",
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
    narrationPending:
      "Rondedzero ichaonekwa pano kana AI yapedza kugadzira gwara.",
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
    cameraOnSummary:
      "yabatidzwa: ruzivo rwenzvimbo runoratidzwa pamusoro pekamera.",
    cameraOffSummary: "yadzimwa: rondedzero pfupi iri kushanda.",
    geoNotSupported: "Geolocation haisi kutsigirwa pachishandiso ichi.",
    detectingLocation: "Tiri kutsvaga nzvimbo yako...",
    locationNoMatch:
      "Hapana nzvimbo iri pedyo yakanyorwa. Sarudza nzvimbo nemaoko.",
    locationDetected:
      "Nzvimbo yawanikwa. Tiri kuratidza nzvimbo iri pedyo pane dzakanyorwa mugwara iri.",
    locationDetectFail:
      "Tatadza kuona nzvimbo yako. Ndapota sarudza nzvimbo nemaoko.",
    localGuidanceMode: "Kushandisa gwara remuno.",
    transcribing: "Tiri kushandura izwi kuita chinyorwa...",
    listeningGroq: "Tiri kuteerera…",
    noSpeechDetected: "Hapana izwi rawanikwa.",
    guideThinking: "Gwara riri kufunga...",
    groqUnavailable:
      "Kushandura izwi kuita chinyorwa hakuwanikwi. Unogona kuramba uchiverenga gwara.",
    requestingCloudNarration: "Kukumbira rondedzero yegore...",
    narrating: "Kutaura kuri kuitika...",
    narratingBrowser: "Kutaura kuri kuitika (Browser Voice)...",
    elevenQuotaExceeded:
      "Rondedzero yepainternet haisi kuwanikwa. Edza izwi rebrowser.",
    elevenUnavailable:
      "Rondedzero yepainternet haisi kuwanikwa. Tiri kushandisa izwi rebrowser.",
    cloudBlocked: "Cloud audio yarambidzwa pano. Kushandisa izwi rebrowser.",
    tapToEnableNarration: "Bata chero panzvimbo kuti rondedzero ishande.",
    voiceNarrationOffStatus: "Rondedzero yezwi yadzimwa.",
    selectDestinationFirst: "Tanga wasarudza nzvimbo.",
    waitingNarrationText: "Mirira kuti chinyorwa cherondedzero chioneke...",
    micNotSupported: "Maikorofoni haisi kutsigirwa mubrowser rino.",
    listening: "Tiri kuteerera...",
    micAccessDenied: "Kupinda kumaikorofoni kwarambwa.",
    cameraTurnOnHint:
      "Kamera haimanikidzwi. Ibatidze kuti uone ruzivo rwenzvimbo pamusoro pemufananidzo.",
    cameraNotSupported: "Kamera haisi kutsigirwa mubrowser rino.",
    cameraOnStatus: "Kamera yabatidzwa. Ruzivo rwenzvimbo rwuri kuratidzwa.",
    cameraAccessFail:
      "Hatina kukwanisa kushandisa kamera. Tarisa mvumo woedza zvakare.",
    arOverlayOff: "AR Overlay yadzimwa. Kamera haidiwi.",
    enableVoiceModeFirst: "Tanga wabatidza Voice Mode kuti ushandise Ask Mode.",
    voiceRecognitionUnsupported: "Kuziva izwi hakutsigirwi mubrowser rino.",
    askModeListening: "Ask Mode iri kuteerera...",
    askModeError:
      "Ask Mode: kukanganisa pakutora izwi. Edza kubatidza zvakare.",
    unableStartAskMode: "Tatadza kutanga Ask Mode.",
    askModeOffBecauseVoiceOff: "Ask Mode yadzimwa nekuti Voice Mode yadzimwa.",
  },
  nd: {
    cameraOnSummary: "ivuliwe: ulwazi lwendawo luboniswa phezu kwekhamera.",
    cameraTurnOnHint:
      "Ikhamera ayiphoqwa. Ivule ukuze ubone ulwazi lwendawo phezu komfanekiso.",
    cameraOnStatus: "Ikhamera ivuliwe. Ulwazi lwendawo luyaboniswa.",
    locationNoMatch: "Akulandawo eseduze ebhalwe lapha. Sicela ukhethe indawo.",
    locationDetected:
      "Indawo itholakele. Kuboniswa indawo eseduze ebhalwe kulo mhlahlandlela.",
    listeningGroq: "Kulalelwe…",
    groqUnavailable:
      "Ukuguqula ilizwi libe ngumbhalo akutholakali. Ungaqhubeka ufunda umhlahlandlela.",
    elevenQuotaExceeded:
      "Ukulandisa kwe-inthanethi akutholakali. Zama ilizwi lebrawuza.",
    elevenUnavailable:
      "Ukulandisa kwe-inthanethi akutholakali. Kusetshenziswa ilizwi lebrawuza.",
  },
  de: {
    cameraOnSummary:
      "an: Ortsinformationen werden über dem Kamerabild angezeigt.",
    cameraTurnOnHint:
      "Die Kamera ist optional. Aktivieren Sie sie für Ortsinformationen über dem Kamerabild.",
    cameraOnStatus: "Kamera an. Ortsinformationen werden angezeigt.",
    locationNoMatch:
      "Kein gelistetes Ziel liegt in Ihrer Nähe. Bitte wählen Sie eines aus.",
    locationDetected:
      "Standort gefunden. Das nächstgelegene Ziel dieses Führers wird angezeigt.",
    listeningGroq: "Zuhören…",
    groqUnavailable:
      "Spracherkennung nicht verfügbar. Sie können den Reiseführer weiterhin lesen.",
    elevenQuotaExceeded:
      "Online-Erzählung nicht verfügbar. Versuchen Sie die Browserstimme.",
    elevenUnavailable:
      "Online-Erzählung nicht verfügbar. Die Browserstimme wird verwendet.",
  },
};

export const AR_SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
export const AR_CONVERSATION_TURN_MS = 7000;

export const AR_GENDER_KEYWORD_MAP: Record<VoiceGender, string[]> = {
  male: [
    "male",
    "man",
    "david",
    "daniel",
    "george",
    "john",
    "paul",
    "tom",
    "michael",
    "alex",
  ],
  female: [
    "female",
    "woman",
    "samantha",
    "karen",
    "zira",
    "emma",
    "aria",
    "victoria",
    "linda",
    "anna",
    "zoe",
  ],
};

export function normalizeUiLanguage(value: unknown): UiLanguage {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "en";
  const base = raw.split("-")[0];
  if (base === "en" || base === "sn" || base === "nd" || base === "de")
    return base;
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
  if (language === "nd") return "nd-ZW";
  if (language === "de") return "de-DE";
  return "en-US";
}

export function formatNarrationLines(text: string): string[] {
  const normalized = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];

  const keyPattern =
    /(?=(?:Heritage|Direction cue|Stop point|What to notice|Narration|Next stop|Local tip|Safety|History|Historical timeline|Culture|Cultural context|Top points of interest|Suggested next stop)\s*:)/g;
  const keyedLines = normalized
    .split(keyPattern)
    .map(item => item.trim())
    .filter(Boolean);

  if (keyedLines.length > 1) return keyedLines;

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map(item => item.trim())
    .filter(Boolean);
}
