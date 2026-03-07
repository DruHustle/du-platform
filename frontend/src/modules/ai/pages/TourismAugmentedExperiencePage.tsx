import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, LocateFixed, MapPin, Mic } from "lucide-react";
import { checkOnesaHealth, sendOnesaChatMessage } from "@/modules/ai/lib/aiApi";
import ZimbabweInteractiveGlobeLoader from "@/modules/ai/components/ZimbabweInteractiveGlobeLoader";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

type PlaceProfile = {
  id: string;
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

type UiLanguage = "en" | "sn" | "nd" | "de";

function normalizeUiLanguage(value: unknown): UiLanguage {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "en";
  const base = raw.split("-")[0];
  if (base === "en" || base === "sn" || base === "nd" || base === "de") return base;
  if (raw === "shona") return "sn";
  if (raw === "ndebele") return "nd";
  if (raw === "german" || raw === "deutsch") return "de";
  return "en";
}

function getLanguageLabel(language: UiLanguage): string {
  if (language === "sn") return "Shona";
  if (language === "nd") return "Ndebele";
  if (language === "de") return "German";
  return "English";
}

const UI_COPY: Record<UiLanguage, Partial<Record<string, string>>> = {
  en: {
    // labels
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
    // statuses
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

const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=";
const CONVERSATION_TURN_MS = 7000;

const GENDER_KEYWORD_MAP: Record<"male" | "female", string[]> = {
  male: ["male", "man", "david", "daniel", "george", "john", "paul", "tom", "michael", "alex"],
  female: ["female", "woman", "samantha", "karen", "zira", "emma", "aria", "victoria", "linda", "anna", "zoe"],
};

// Rough geofencing used only to preselect a likely nearby destination on-device.
function inferNearestPlace(latitude: number, longitude: number): string {
  // Lightweight location heuristic based on rough city bounds to keep this fully client-side.
  if (latitude > -18 && latitude < -16 && longitude > 25 && longitude < 27) return "victoria_falls";
  if (latitude > -21 && latitude < -19 && longitude > 27 && longitude < 30) return "hwange";
  if (latitude > -18 && latitude < -16 && longitude > 30 && longitude < 32) return "harare";
  if (latitude > -21 && latitude < -19 && longitude > 28 && longitude < 30) return "bulawayo";
  return "great_zimbabwe";
}

// Local fallback guidance keeps the UX responsive when AI/network is unavailable.
function buildLocalGuidance(place: PlaceProfile, cameraEnabled: boolean, language: UiLanguage = "en"): string {
  const isShona = language === "sn";
  const labels = isShona
    ? {
        historicalTimeline: "Nguva yenhoroondo",
        heritage: "Nhaka",
        directionCue: "Zano rekufamba",
        stopPoint: "Nzvimbo yekumira",
        whatToNotice: "Zvaunofanira kuona",
        culture: "Tsika",
        culturalContext: "Mamiro etsika",
        nextStop: "Nzvimbo inotevera",
        localTip: "Zano remuno",
        safety: "Chengetedzo",
        history: "Nhoroondo",
        topPois: "Nzvimbo huru dzekushanya",
        suggestedNext: "Nzvimbo inotevera inokurudzirwa",
      }
    : {
        historicalTimeline: "Historical timeline",
        heritage: "Heritage",
        directionCue: "Direction cue",
        stopPoint: "Stop point",
        whatToNotice: "What to notice",
        culture: "Culture",
        culturalContext: "Cultural context",
        nextStop: "Next stop",
        localTip: "Local tip",
        safety: "Safety",
        history: "History",
        topPois: "Top points of interest",
        suggestedNext: "Suggested next stop",
      };
  if (cameraEnabled) {
    return [
      `${place.name}: ${place.history}`,
      `${labels.historicalTimeline}: ${place.historicalTimeline}`,
      `${labels.heritage}: ${place.heritage}`,
      `${labels.directionCue}: ${place.directionTips[0] ?? "Move slowly and keep your camera aligned with your path."}`,
      `${labels.stopPoint}: ${place.pointsOfInterest[0] ?? "Main viewpoint area"} — pause and observe before continuing.`,
      `${labels.whatToNotice}: ${place.pointsOfInterest[1] ?? "Watch for nearby interpretation markers and cultural details."}`,
      `${labels.culture}: ${place.culture}`,
      `${labels.culturalContext}: ${place.culturalHighlights}`,
      `${labels.nextStop}: ${place.nextStops[0] ?? "Nearby heritage point"}.`,
      `${labels.localTip}: ${place.directionTips[1] ?? "Take your time at each stop to hear full narration before moving."}`,
      `${labels.safety}: ${place.safetyNote}`,
    ].join(" ");
  }

  return [
    `${place.name}: ${place.heritage}`,
    `${labels.history}: ${place.history}`,
    `${labels.historicalTimeline}: ${place.historicalTimeline}`,
    `${labels.culture}: ${place.culture}`,
    `${labels.culturalContext}: ${place.culturalHighlights}`,
    `${labels.whatToNotice}: ${place.pointsOfInterest[0] ?? "Main destination highlights"}.`,
    `${labels.topPois}: ${place.pointsOfInterest.slice(0, 2).join("; ")}.`,
    `${labels.directionCue}: ${place.directionTips[0] ?? "Follow marked visitor routes and pause at key viewpoints."}`,
    `${labels.suggestedNext}: ${place.nextStops[0] ?? "Local visitor center"}.`,
    `${labels.localTip}: ${place.directionTips[1] ?? "Use official guides and interpretation signage for deeper context."}`,
    `${labels.safety}: ${place.safetyNote}`,
  ].join(" ");
}

// Split AI response into readable UI lines; prefers keyed sections when present.
function formatNarrationLines(text: string): string[] {
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

export default function TourismAugmentedExperiencePage() {
  const { i18n, t } = useTranslation();
  const uiLanguage = useMemo<UiLanguage>(
    () => normalizeUiLanguage(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );
  const ui = useMemo(
    () => ({ ...UI_COPY.en, ...(UI_COPY[uiLanguage] ?? {}) }) as Record<string, string>,
    [uiLanguage]
  );
  const selectedLanguageLabel = useMemo(() => getLanguageLabel(uiLanguage), [uiLanguage]);
  const backToTourismLabel = t("tourism.back_to_tourism", {
    defaultValue: `Back to ${t("nav.tourism", { defaultValue: "Tourism" })}`,
  });
  const speechLanguageCode = useMemo(() => {
    if (uiLanguage === "sn") return "sn-ZW";
    if (uiLanguage === "nd") return "nr-ZW";
    if (uiLanguage === "de") return "de-DE";
    return "en-US";
  }, [uiLanguage]);
  // Static destination profiles used for both AI prompts and local fallback content.
  const places: PlaceProfile[] = useMemo(
    () => [
      {
        id: "victoria_falls",
        name: "Victoria Falls",
        heritage: "A UNESCO World Heritage destination and one of the world's most iconic waterfall landscapes.",
        history: "Known as Mosi-oa-Tunya, this zone has long served as a cultural and trade corridor along the Zambezi.",
        historicalTimeline: "Local communities have revered the falls for centuries, David Livingstone documented it to global audiences in 1855, and UNESCO listed the site in 1989.",
        culture: "Local communities shape the destination through craft traditions, storytelling, and hospitality experiences.",
        culturalHighlights: "Tonga and Lozi storytelling, river-linked ceremonies, and market craft traditions remain central to the destination identity.",
        pointsOfInterest: [
          "Main Falls viewpoints and rainforest trail",
          "Devil's Cataract lookout",
          "Zambezi riverfront interpretation points",
        ],
        directionTips: [
          "Move forward along the marked viewpoint trail, then keep left for the main panorama deck",
          "Pause at each spray-zone viewpoint for narration points",
        ],
        nextStops: ["Victoria Falls Bridge precinct", "Zambezi sunset cruise launch area"],
        safetyNote: "Use marked paths, watch slippery sections, and follow local ranger guidance.",
      },
      {
        id: "great_zimbabwe",
        name: "Great Zimbabwe",
        heritage: "The largest pre-colonial stone complex in southern Africa and a symbol of national identity.",
        history: "Developed between the 11th and 15th centuries as a major political and economic center.",
        historicalTimeline: "Construction and expansion are traced to roughly the 11th-15th centuries, with global recognition reinforced by UNESCO listing in 1986.",
        culture: "The site reflects deep historical craftsmanship and living heritage links across Zimbabwe.",
        culturalHighlights: "Dry-stone architecture, oral histories of statecraft, and enduring identity narratives make it a core symbol of Zimbabwean heritage.",
        pointsOfInterest: [
          "Great Enclosure stone walls",
          "Hill Complex ritual and leadership zones",
          "Valley Ruins interpretation routes",
        ],
        directionTips: [
          "Start at the lower interpretive route and continue uphill to the Hill Complex",
          "Stop at the enclosure walls for architectural narration markers",
        ],
        nextStops: ["Great Zimbabwe Museum", "Masvingo heritage circuit"],
        safetyNote: "Respect protected structures and keep to designated heritage paths.",
      },
      {
        id: "harare",
        name: "Harare",
        heritage: "Zimbabwe's capital and a central gateway for business, urban culture, and creative industries.",
        history: "Harare has evolved into a key modern hub connecting national institutions and regional travelers.",
        historicalTimeline: "The modern city was established as Salisbury in 1890 and officially renamed Harare in 1982 after independence.",
        culture: "Explore local cuisine, contemporary art, music spaces, and cultural districts across the city.",
        culturalHighlights: "Urban culture blends mbira and contemporary music scenes, gallery circuits, and neighborhood food culture rooted in local markets.",
        pointsOfInterest: [
          "National Gallery precinct",
          "City center heritage avenues",
          "Local food and market corridors",
        ],
        directionTips: [
          "Proceed toward the central culture district and pause at major art landmarks",
          "Use main pedestrian routes and stop at signed heritage markers",
        ],
        nextStops: ["National Gallery of Zimbabwe", "Mbare cultural market routes"],
        safetyNote: "Use trusted transport options and remain aware in high-traffic zones.",
      },
      {
        id: "bulawayo",
        name: "Bulawayo",
        heritage: "A heritage-rich city anchored by museums, colonial-era architecture, and nearby Matobo landscapes.",
        history: "Historically central to rail and industrial growth, Bulawayo remains a major cultural anchor.",
        historicalTimeline: "The Ndebele royal center developed in the 19th century, and the modern city footprint expanded significantly after 1894.",
        culture: "Visitors can engage with strong performing arts, local cuisine, and regional craft communities.",
        culturalHighlights: "Ndebele heritage, museum culture, and strong performing arts traditions shape the city's living cultural identity.",
        pointsOfInterest: [
          "Railway and city museums zone",
          "Historic architecture corridors",
          "Gateway route to Matobo landscapes",
        ],
        directionTips: [
          "Begin in the central museum corridor, then continue along the heritage architecture route",
          "Pause at museum forecourts for narration points before moving onward",
        ],
        nextStops: ["Natural History Museum", "Matobo day-route staging point"],
        safetyNote: "Follow museum/site opening guidance and use official guide services for Matobo routes.",
      },
      {
        id: "hwange",
        name: "Hwange National Park",
        heritage: "Zimbabwe's flagship wildlife landscape with major elephant corridors and protected ecosystems.",
        history: "The park has become a cornerstone of conservation and safari tourism development in the region.",
        historicalTimeline: "Gazetted in 1928 as Wankie Game Reserve and later renamed Hwange, it has grown into one of southern Africa's key conservation landscapes.",
        culture: "Community-linked tourism and ranger-led interpretation add local context to wildlife experiences.",
        culturalHighlights: "Community conservation partnerships, tracker knowledge, and ranger interpretation connect wildlife viewing to local livelihoods.",
        pointsOfInterest: [
          "Waterhole observation sectors",
          "Primary safari game-view corridors",
          "Ranger interpretation and conservation points",
        ],
        directionTips: [
          "Move slowly along designated safari tracks and stop at marked observation points",
          "Pause at waterhole viewpoints for wildlife narration and tracking guidance",
        ],
        nextStops: ["Main game drive loop", "Ranger briefing and visitor center point"],
        safetyNote: "Remain in designated areas and follow all ranger safety instructions around wildlife.",
      },
    ],
    []
  );

  const localizedPlaces = useMemo(() => {
    if (uiLanguage !== "sn") return places;
    const shonaOverrides: Record<string, Partial<PlaceProfile>> = {
      victoria_falls: {
        heritage: "Nzvimbo yeUNESCO World Heritage uye imwe yemapopoma ane mukurumbira pasi rose.",
        history: "Inozivikanwa seMosi-oa-Tunya, nzvimbo iyi yakagara iri nzira yakakosha yekutengeserana netsika paZambezi.",
        historicalTimeline: "Vanhu vemuno vakagara vachiremekedza mapopoma aya kwemazana emakore; David Livingstone akanyora nezvawo muna 1855, uye UNESCO yakazonyora nzvimbo iyi muna 1989.",
        culture: "Nharaunda dzemuno dzinoramba dzichisimbisa nzvimbo iyi kuburikidza neunyanzvi, ngano, uye kugamuchira vaenzi.",
        culturalHighlights: "Ngano dzeTonga neLozi, tsika dzine chekuita nerwizi, nemisika yezvigadzirwa zvemuno zvinoramba zvakakosha.",
        pointsOfInterest: ["Nzvimbo dzekuona Main Falls", "Devil's Cataract", "Nzvimbo dzekutsanangura paZambezi"],
        directionTips: ["Famba munzira yakatarwa wozoenda kuruboshwe padhikhi guru rekuona.", "Mira pane imwe neimwe spray-zone kuti unzwe rondedzero."],
        nextStops: ["Victoria Falls Bridge", "Nzvimbo yekutangira sunset cruise paZambezi"],
        safetyNote: "Shandisa nzira dzakatarwa, chenjerera panotsvedza, uye tevera mirayiridzo yeranger.",
      },
      great_zimbabwe: {
        heritage: "Nzvimbo huru yematombo ekare muSouthern Africa uye mucherechedzo wechizvarwa cheZimbabwe.",
        history: "Yakakura pakati pezana remakore rechi11 nerechi15 senzvimbo yezvematongerwo enyika nehupfumi.",
        historicalTimeline: "Kuvakwa nekuwedzera kwakanyanya kwakaitika muzana remakore rechi11 kusvika rechi15; UNESCO yakanyora nzvimbo iyi muna 1986.",
        culture: "Nzvimbo iyi inoratidza hunyanzvi hwekuvaka nematombo uye nhaka inorarama muZimbabwe.",
        culturalHighlights: "Dry-stone architecture, ngano dzechinyakare dzehutungamiri, uye kuzivikanwa kwenyika.",
      },
      harare: {
        heritage: "Guta guru reZimbabwe uye musuwo mukuru webhizimisi, tsika dzekumaguta, uye maindasitiri ekusika.",
        history: "Harare yakava nzvimbo huru inobatanidza masangano enyika nevafambi vemudunhu.",
        historicalTimeline: "Guta ranhasi rakatangwa seSalisbury muna 1890 uye rakatumidzwa zita rekuti Harare muna 1982 mushure merusununguko.",
        culture: "Ongorora chikafu chemuno, art yemazuva ano, mimhanzi, nenzvimbo dzetsika dzeguta.",
        culturalHighlights: "Mbira nemimhanzi yemazuva ano, ma gallery, uye tsika dzechikafu chemumarket.",
      },
      bulawayo: {
        heritage: "Guta rine nhaka yakadzama rine mamuseum, zvivakwa zvekare, uye pedyo neMatobo.",
        history: "Bulawayo yakava guta rakakosha muchitima nemaindasitiri uye richiri nzvimbo yakakosha yetsika.",
        historicalTimeline: "Pakati pezana remakore rechi19 ndiyo yaive nzvimbo yakakosha yeNdebele; guta razvino rakakura zvikuru mushure ma1894.",
        culture: "Vashanyi vanowana mitambo yetsika, chikafu chemuno, uye mabasa emaoko.",
        culturalHighlights: "Nhaka yeNdebele, tsika dzemamuseum, uye performing arts zvinoramba zvichiita kuti guta ripenye.",
      },
      hwange: {
        heritage: "Paki huru yewildlife yeZimbabwe ine nzira huru dzenzou nezvimwe zvipenyu zvakachengetedzwa.",
        history: "Paki iyi yakava musimboti mukuru wekuchengetedza zvipenyu nesafari mudunhu.",
        historicalTimeline: "Yakagadzwa muna 1928 seWankie Game Reserve, yozotumidzwa zita rekuti Hwange.",
        culture: "Tourism yakabatana nenharaunda uye dudziro yeranger inowedzera ruzivo rwemuno.",
        culturalHighlights: "Kubatana kwenharaunda mukuchengetedza, ruzivo rwevatsvakurudzi, uye kudzidzisa kwevaranger.",
      },
    };
    return places.map((place) => ({ ...place, ...(shonaOverrides[place.id] ?? {}) }));
  }, [places, uiLanguage]);

  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [isGlobeZoomTransitioning, setIsGlobeZoomTransitioning] = useState(false);
  const [answer, setAnswer] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [arOverlayEnabled, setArOverlayEnabled] = useState(true);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [onlineStatusText, setOnlineStatusText] = useState("");
  const [voiceNarrationEnabled, setVoiceNarrationEnabled] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceGender, setSelectedVoiceGender] = useState<"male" | "female">("female");
  const narrationVolume = 0.82;
  const [fallbackImageIndex, setFallbackImageIndex] = useState(0);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const loadingRef = useRef(false);
  const aiBackoffUntilRef = useRef(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTurnTimerRef = useRef<number | null>(null);
  const isConversationModeRef = useRef(false);
  const isRecordingRef = useRef(false);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const guidanceIntervalRef = useRef<number | null>(null);
  const globeTransitionTimerRef = useRef<number | null>(null);
  const speechUnlockedRef = useRef(false);
  const lastNarrationTriggerAtRef = useRef(0);
  const lastNarratedTextRef = useRef("");
  const lastNarratedAtRef = useRef(0);
  const pendingNarrationRetryRef = useRef<string | null>(null);
  const cloudTtsRequestInFlightRef = useRef(false);
  const queuedCloudNarrationRef = useRef<string | null>(null);
  const previewImagesByPlace = useMemo<Record<string, string[]>>(
    () => ({
      victoria_falls: ["/images/pages/tourism/victoria_falls.jpg"],
      great_zimbabwe: ["/images/pages/tourism/great_zimbabwe.jpeg"],
      harare: ["/images/pages/tourism/balancing_rocks.jpg"],
      bulawayo: ["/images/pages/tourism/dest_matobo.jpg"],
      hwange: ["/images/pages/tourism/dest_hwange.png"],
    }),
    []
  );

  const selectedPlace = localizedPlaces.find((place) => place.id === selectedPlaceId) ?? localizedPlaces[0];
  const selectedPreviewImages = previewImagesByPlace[selectedPlaceId] ?? ["/images/pages/tourism/victoria_falls.jpg"];
  const narrationLines = useMemo(() => formatNarrationLines(answer), [answer]);

  const clearRecordingTurnTimer = useCallback(() => {
    if (recordingTurnTimerRef.current !== null) {
      window.clearTimeout(recordingTurnTimerRef.current);
      recordingTurnTimerRef.current = null;
    }
  }, []);

  const unlockBrowserSpeech = useCallback((): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    if (speechUnlockedRef.current) return true;
    try {
      speechUnlockedRef.current = true;
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
      const warm = new SpeechSynthesisUtterance(" ");
      warm.volume = 0;
      window.speechSynthesis.speak(warm);
      return true;
    } catch {
      return false;
    }
  }, []);

  const loadVoicesWithTimeout = useCallback(async (): Promise<SpeechSynthesisVoice[]> => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    const synth = window.speechSynthesis;
    const immediate = synth.getVoices();
    if (immediate.length) return immediate;
    return await new Promise<SpeechSynthesisVoice[]>((resolve) => {
      let settled = false;
      const done = (voices: SpeechSynthesisVoice[]) => {
        if (settled) return;
        settled = true;
        synth.onvoiceschanged = prevHandler;
        window.clearTimeout(timerId);
        resolve(voices);
      };
      const prevHandler = synth.onvoiceschanged;
      synth.onvoiceschanged = () => {
        done(synth.getVoices());
      };
      const timerId = window.setTimeout(() => {
        done(synth.getVoices());
      }, 1200);
    });
  }, []);

  const queueNarrationRetry = useCallback((text: string) => {
    pendingNarrationRetryRef.current = text;
    const retry = () => {
      const queued = pendingNarrationRetryRef.current;
      if (!queued) return;
      pendingNarrationRetryRef.current = null;
      void speakWithBrowserVoice(queued, true);
    };
    window.addEventListener("pointerdown", retry, { once: true, passive: true, capture: true });
  }, []);

  const speakWithBrowserVoice = useCallback(
    async (text: string, fromUserGesture = false): Promise<boolean> => {
      if (!text) return false;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
      if (fromUserGesture) unlockBrowserSpeech();
      const synth = window.speechSynthesis;
      const speakAttempt = async (preferSelectedVoice: boolean): Promise<boolean> => {
        return await new Promise<boolean>((resolve) => {
          try {
            synth.resume();
            if (synth.speaking || synth.pending) synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = speechLanguageCode;
            utterance.volume = narrationVolume;

            const runtimeVoices = synth.getVoices();
            const voicePool = runtimeVoices.length ? runtimeVoices : availableVoices;
            if (preferSelectedVoice) {
              const activeLanguage = (i18n.resolvedLanguage ?? i18n.language ?? "en-US").toLowerCase();
              const targetPrefixes = Array.from(new Set([activeLanguage, activeLanguage.split("-")[0]])).filter(Boolean);
              const languageMatches = voicePool.filter((item) =>
                targetPrefixes.some((prefix) => item.lang.toLowerCase().startsWith(prefix))
              );
              const genderKeywords = GENDER_KEYWORD_MAP[selectedVoiceGender];
              const voiceByGender = languageMatches.find((item) => {
                const name = `${item.name} ${item.voiceURI}`.toLowerCase();
                return genderKeywords.some((keyword) => name.includes(keyword));
              });
              const fallbackByGender = voicePool.find((item) => {
                const name = `${item.name} ${item.voiceURI}`.toLowerCase();
                return genderKeywords.some((keyword) => name.includes(keyword));
              });
              const voice = voiceByGender ?? fallbackByGender ?? languageMatches[0] ?? voicePool[0];
              if (voice) utterance.voice = voice;
            }

            let settled = false;
            const done = (ok: boolean) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timerId);
              resolve(ok);
            };

            utterance.onstart = () => {
              setVoiceStatus(ui.narratingBrowser);
              done(true);
            };
            utterance.onend = () => done(true);
            utterance.onerror = () => done(false);
            synth.speak(utterance);

            const timerId = window.setTimeout(() => {
              done(synth.speaking || synth.pending);
            }, 2200);
          } catch {
            resolve(false);
          }
        });
      };

      const voices = await loadVoicesWithTimeout();
      if (voices.length > 0) setAvailableVoices(voices);

      let started = await speakAttempt(true);
      if (!started) started = await speakAttempt(false);
      return started;
    },
    [
      availableVoices,
      speechLanguageCode,
      narrationVolume,
      selectedVoiceGender,
      loadVoicesWithTimeout,
      unlockBrowserSpeech,
      queueNarrationRetry,
      ui.narratingBrowser,
    ]
  );

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus(ui.geoNotSupported);
      return;
    }

    setLocationStatus(ui.detectingLocation);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const inferred = inferNearestPlace(position.coords.latitude, position.coords.longitude);
        setSelectedPlaceId(inferred);
        setLocationStatus(ui.locationDetected);
      },
      () => {
        setLocationStatus(ui.locationDetectFail);
      }
    );
  };

  const checkHealth = useCallback(async () => {
    const health = await checkOnesaHealth(ui.localGuidanceMode);
    setIsOnline(health.online);
    setOnlineStatusText(health.statusText);
  }, [ui.localGuidanceMode]);

  const queryAI = useCallback(async (inputPrompt?: string) => {
    const trimmed = String(inputPrompt ?? "").trim();
    if (loadingRef.current) return;
    if (Date.now() < aiBackoffUntilRef.current) {
      const response = buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage);
      setError("");
      setVoiceStatus(ui.localGuidanceMode);
      setAnswer(response);
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    setError("");
    let response = buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage);
    // Render useful guidance immediately while cloud AI is still in-flight.
    setAnswer(response);

    try {
      const defaultGuidancePrompt = arOverlayEnabled && cameraEnabled
        ? [
            "Camera is ON. You are Onesa AR guide in street-view style.",
            `Current destination: ${selectedPlace.name}.`,
            `Heritage context: ${selectedPlace.heritage}`,
            `History context: ${selectedPlace.history}`,
            `Historical timeline context: ${selectedPlace.historicalTimeline}`,
            `Culture context: ${selectedPlace.culture}`,
            `Cultural highlights context: ${selectedPlace.culturalHighlights}`,
            `Reply language requirement: Respond only in ${selectedLanguageLabel}.`,
            "Provide directional guidance as if the user is walking and looking through camera.",
            "Tell the user where to move next (left/right/forward), where to pause at points of interest, and narrate those stops.",
            "Use concise, practical voice-friendly sentences, include a safety cue, and include at least one concrete date or historical period.",
          ].join("\n")
        : [
            "AR Overlay is OFF or camera is OFF. Provide a concise place summary for the user.",
            `Current destination: ${selectedPlace.name}.`,
            `Heritage context: ${selectedPlace.heritage}`,
            `History context: ${selectedPlace.history}`,
            `Historical timeline context: ${selectedPlace.historicalTimeline}`,
            `Culture context: ${selectedPlace.culture}`,
            `Cultural highlights context: ${selectedPlace.culturalHighlights}`,
            `Reply language requirement: Respond only in ${selectedLanguageLabel}.`,
            "Return 5 short parts: 1) Place summary, 2) Key history with at least one date, 3) Cultural highlight, 4) Why culture matters today, 5) Next best place to visit.",
          ].join("\n");
      const prompt = [
        `You are Onesa AI Local Guide for Zimbabwe.`,
        `Response language: ${selectedLanguageLabel}.`,
        `Current destination: ${selectedPlace.name}.`,
        `Heritage context: ${selectedPlace.heritage}`,
        `History context: ${selectedPlace.history}`,
        `Historical timeline context: ${selectedPlace.historicalTimeline}`,
        `Culture context: ${selectedPlace.culture}`,
        `Cultural highlights context: ${selectedPlace.culturalHighlights}`,
        trimmed ? `Visitor voice prompt: ${trimmed}` : defaultGuidancePrompt,
        "Answer with practical, visitor-friendly guidance in 6-8 sentences. Include one concrete year or time range and one cultural practice/tradition.",
        `Use ${selectedLanguageLabel} only.`,
      ].join("\n");
      const requestAI = async () => {
        const { data } = await sendOnesaChatMessage({
          messages: [{ role: "user", content: prompt }],
          language: uiLanguage,
        });
        const reply = String(data?.reply ?? "").trim();
        if (!reply) throw new Error("Empty model response.");
        return reply;
      };

      let reply = "";
      try {
        reply = await requestAI();
      } catch {
        // Retry once before falling back to local guidance mode.
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        reply = await requestAI();
      }

      setAnswer(reply);
      setVoiceStatus("");
      setIsOnline(true);
      setOnlineStatusText("");
      aiBackoffUntilRef.current = 0;
    } catch {
      // Graceful fallback: keep guidance flowing without a disruptive error banner.
      setError("");
      setVoiceStatus(ui.localGuidanceMode);
      void checkHealth();
      // Prevent repeated immediate upstream retries during provider instability.
      aiBackoffUntilRef.current = Date.now() + 30000;
      setAnswer(response);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cameraEnabled, selectedPlace.culturalHighlights, selectedPlace.culture, selectedPlace.heritage, selectedPlace.historicalTimeline, selectedPlace.history, selectedPlace.name, arOverlayEnabled, checkHealth, selectedLanguageLabel, ui.localGuidanceMode, uiLanguage]);

  const transcribeWithGroq = useCallback(
    async (blob: Blob): Promise<string> => {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("action", "stt");
      formData.append("provider", "groq");
      const res = await fetch("/api/speech", { method: "POST", body: formData });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "groq stt failed");
      }
      const payload = await res.json().catch(() => ({} as { text?: string }));
      return String(payload?.text ?? "").trim();
    },
    []
  );

  const processConversation = async (blob: Blob) => {
    setLoading(true);
    setVoiceStatus(ui.transcribing);
    try {
      setVoiceStatus(ui.listeningGroq);
      const text = await transcribeWithGroq(blob);
      if (!text) {
        setVoiceStatus(ui.noSpeechDetected);
        return;
      }
      setVoiceStatus(ui.guideThinking);
      const prompt = [
        `You are Onesa AI Local Guide for Zimbabwe.`,
        `Response language: ${selectedLanguageLabel}.`,
        `Current destination: ${selectedPlace.name}.`,
        `Heritage context: ${selectedPlace.heritage}`,
        `History context: ${selectedPlace.history}`,
        `Historical timeline context: ${selectedPlace.historicalTimeline}`,
        `Culture context: ${selectedPlace.culture}`,
        `Cultural highlights context: ${selectedPlace.culturalHighlights}`,
        `Visitor voice prompt: ${text}`,
        "Answer with practical, visitor-friendly guidance in 5-7 sentences. Include at least one concrete date or historical period and one cultural detail.",
        `Use ${selectedLanguageLabel} only.`,
      ].join("\n");
      const { data } = await sendOnesaChatMessage({
        messages: [{ role: "user", content: prompt }],
        language: uiLanguage,
      });
      const reply = String(data?.reply ?? "").trim();
      setAnswer(reply || buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage));
      setVoiceStatus("");
    } catch {
      setVoiceStatus(ui.groqUnavailable);
      setAnswer(buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage));
    } finally {
      setLoading(false);
    }
  };

  const speakWithTts = useCallback(async (text: string, force = false) => {
    if (!text) return;
    const normalized = String(text).trim();
    if (!normalized) return;
    const now = Date.now();
    if (normalized === lastNarratedTextRef.current && now - lastNarratedAtRef.current < 2200) return;

    const audio = ttsAudioRef.current;
    const cloudPlaybackActive = Boolean(audio && !audio.paused && audio.currentSrc && !audio.currentSrc.startsWith("data:"));
    if (cloudTtsRequestInFlightRef.current || cloudPlaybackActive) {
      queuedCloudNarrationRef.current = normalized;
      return;
    }

    if (force && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        unlockBrowserSpeech();
      } catch {
        // no-op
      }
    }

    let ttsUnavailable = false;
    let ttsFailureReason = "";
    const femaleVoiceId = "EXAVITQu4vr4xnSDxMaL";
    const maleVoiceId = "VR6AewLTigWG4xSOukaG";
    const selectedVoiceId = selectedVoiceGender === "male" ? maleVoiceId : femaleVoiceId;
    cloudTtsRequestInFlightRef.current = true;
    try {
      setVoiceStatus(ui.requestingCloudNarration);
      let res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tts",
          text: normalized,
          voiceId: selectedVoiceId,
          language: uiLanguage,
        }),
      });
      if (!res.ok) {
        ttsFailureReason = await res.text().catch(() => "");
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: normalized,
            voiceId: selectedVoiceId,
            language: uiLanguage,
          }),
        });
        if (!res.ok) {
          ttsUnavailable = true;
          ttsFailureReason = await res.text().catch(() => ttsFailureReason);
          throw new Error(`ElevenLabs TTS failed (${res.status})`);
        }
      }
      const headerMime = String(res.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const blob = await res.blob();
      const effectiveMime = String(blob.type || headerMime).toLowerCase();
      if (/audio\/l16|codec=pcm/.test(effectiveMime)) {
        ttsFailureReason = `Unsupported cloud audio format: ${effectiveMime || "unknown"}`;
        throw new Error("Unsupported cloud audio format");
      }
      const playableBlob = !blob.type && headerMime ? blob.slice(0, blob.size, headerMime) : blob;
      const url = URL.createObjectURL(playableBlob);
      if (!ttsAudioRef.current) throw new Error("No audio element available");
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
      }
      ttsAudioUrlRef.current = url;
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = url;
      ttsAudioRef.current.volume = narrationVolume;
      try {
        await ttsAudioRef.current.play();
      } catch (playError) {
        ttsFailureReason = playError instanceof Error ? playError.message : "Cloud audio playback blocked";
        throw new Error("Cloud audio playback blocked");
      }
      setVoiceStatus(ui.narrating);
      lastNarratedTextRef.current = normalized;
      lastNarratedAtRef.current = Date.now();
    } catch {
      const quotaExceeded = /quota_exceeded|exceeds your quota|insufficient credits|credits remaining/i.test(ttsFailureReason);
      if (ttsUnavailable) {
        console.warn("[TTS] Cloud TTS request failed. Falling back to browser voice.", ttsFailureReason || "unknown");
        setVoiceStatus(quotaExceeded ? ui.elevenQuotaExceeded : ui.elevenUnavailable);
      } else {
        console.warn("[TTS] Cloud audio could not play locally. Falling back to browser voice.", ttsFailureReason || "unknown");
        setVoiceStatus(ui.cloudBlocked);
      }
      const browserOk = await speakWithBrowserVoice(normalized, force);
      if (!browserOk && force) {
        setVoiceStatus(ui.tapToEnableNarration);
        queueNarrationRetry(normalized);
      } else if (browserOk) {
        lastNarratedTextRef.current = normalized;
        lastNarratedAtRef.current = Date.now();
      }
    } finally {
      cloudTtsRequestInFlightRef.current = false;
      if (voiceNarrationEnabled && arOverlayEnabled && !isConversationMode) {
        const activeAudio = ttsAudioRef.current;
        const cloudStillPlaying = Boolean(
          activeAudio && !activeAudio.paused && activeAudio.currentSrc && !activeAudio.currentSrc.startsWith("data:")
        );
        if (!cloudStillPlaying) {
          const queued = queuedCloudNarrationRef.current;
          if (queued) {
            queuedCloudNarrationRef.current = null;
            void speakWithTts(queued, false);
          }
        }
      }
    }
  }, [arOverlayEnabled, isConversationMode, narrationVolume, selectedVoiceGender, speakWithBrowserVoice, queueNarrationRetry, ui.cloudBlocked, ui.elevenQuotaExceeded, ui.elevenUnavailable, ui.narrating, ui.requestingCloudNarration, ui.tapToEnableNarration, uiLanguage, unlockBrowserSpeech, voiceNarrationEnabled]);

  useEffect(() => {
    const audio = ttsAudioRef.current;
    if (!audio) return;
    const handleCloudNarrationEnd = () => {
      if (cloudTtsRequestInFlightRef.current) return;
      if (!voiceNarrationEnabled || !arOverlayEnabled || isConversationMode) return;
      const queued = queuedCloudNarrationRef.current;
      if (!queued) return;
      queuedCloudNarrationRef.current = null;
      void speakWithTts(queued, false);
    };
    audio.addEventListener("ended", handleCloudNarrationEnd);
    audio.addEventListener("error", handleCloudNarrationEnd);
    audio.addEventListener("pause", handleCloudNarrationEnd);
    audio.addEventListener("stalled", handleCloudNarrationEnd);
    audio.addEventListener("abort", handleCloudNarrationEnd);
    return () => {
      audio.removeEventListener("ended", handleCloudNarrationEnd);
      audio.removeEventListener("error", handleCloudNarrationEnd);
      audio.removeEventListener("pause", handleCloudNarrationEnd);
      audio.removeEventListener("stalled", handleCloudNarrationEnd);
      audio.removeEventListener("abort", handleCloudNarrationEnd);
    };
  }, [arOverlayEnabled, isConversationMode, speakWithTts, voiceNarrationEnabled]);

  const handleVoiceNarrationToggle = useCallback(() => {
    const next = !voiceNarrationEnabled;
    setVoiceNarrationEnabled(next);

    if (!next) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
      queuedCloudNarrationRef.current = null;
      cloudTtsRequestInFlightRef.current = false;
      setVoiceStatus(ui.voiceNarrationOffStatus);
      return;
    }

    if (!selectedPlaceId) {
      setVoiceStatus(ui.selectDestinationFirst);
      return;
    }

    if (!narrationLines.length) {
      setVoiceStatus(ui.waitingNarrationText);
      return;
    }

    if (ttsAudioRef.current) {
      ttsAudioRef.current.src = SILENT_WAV_DATA_URI;
      ttsAudioRef.current.muted = false;
      ttsAudioRef.current.volume = 0.01;
      ttsAudioRef.current.play().then(() => {
        if (!ttsAudioRef.current) return;
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
      }).catch(() => {
        // no-op
      });
    }

    const textToRead = answer || buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage);
    lastNarrationTriggerAtRef.current = Date.now();
    void speakWithTts(textToRead, true);
  }, [answer, cameraEnabled, narrationLines.length, selectedPlace, selectedPlaceId, speakWithTts, ui.selectDestinationFirst, ui.voiceNarrationOffStatus, ui.waitingNarrationText, uiLanguage, voiceNarrationEnabled]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    clearRecordingTurnTimer();
    try {
      mediaRecorder.current?.stop();
    } catch {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    isRecordingRef.current = false;
    setIsRecording(false);
  }, [clearRecordingTurnTimer]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceStatus(ui.micNotSupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        clearRecordingTurnTimer();
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        isRecordingRef.current = false;
        setIsRecording(false);
        const recordedBlob = new Blob(audioChunks.current, {
          type: mediaRecorder.current?.mimeType || "audio/webm",
        });
        void (async () => {
          await processConversation(recordedBlob);
          if (!isConversationModeRef.current || isRecordingRef.current) return;
          window.setTimeout(() => {
            if (!isConversationModeRef.current || isRecordingRef.current) return;
            void startRecording();
          }, 320);
        })();
      };
      mediaRecorder.current.start();
      clearRecordingTurnTimer();
      recordingTurnTimerRef.current = window.setTimeout(() => {
        if (!isConversationModeRef.current || !isRecordingRef.current) return;
        try {
          mediaRecorder.current?.stop();
        } catch {
          // no-op
        }
      }, CONVERSATION_TURN_MS);
      isRecordingRef.current = true;
      setIsRecording(true);
      setVoiceStatus(ui.listening);
    } catch {
      clearRecordingTurnTimer();
      isRecordingRef.current = false;
      setVoiceStatus(ui.micAccessDenied);
      setIsConversationMode(false);
      setIsRecording(false);
    }
  }, [clearRecordingTurnTimer, processConversation, ui.listening, ui.micAccessDenied, ui.micNotSupported]);

  const toggleRecording = useCallback(() => {
    if (!isConversationMode) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    void startRecording();
  }, [isConversationMode, isRecording, startRecording, stopRecording]);

  const handleConversationToggle = useCallback(async () => {
    if (!isConversationMode) {
      setIsConversationMode(true);
      await startRecording();
      return;
    }
    stopRecording();
    setIsConversationMode(false);
    setVoiceStatus("");
  }, [isConversationMode, startRecording, stopRecording]);

  const stopCamera = useCallback(() => {
    // Stop periodic guidance loop and release hardware resources immediately.
    if (guidanceIntervalRef.current !== null) {
      window.clearInterval(guidanceIntervalRef.current);
      guidanceIntervalRef.current = null;
    }
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
    setCameraStatus(ui.cameraTurnOnHint);
  }, [ui.cameraTurnOnHint]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus(ui.cameraNotSupported);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      setCameraStatus(ui.cameraOnStatus);
      await queryAI();
      // Refresh AR guidance while camera mode is active.
      if (guidanceIntervalRef.current !== null) window.clearInterval(guidanceIntervalRef.current);
      guidanceIntervalRef.current = window.setInterval(() => {
        void queryAI();
      }, 45000);
    } catch {
      setCameraStatus(ui.cameraAccessFail);
      setCameraEnabled(false);
    }
  }, [queryAI, ui.cameraAccessFail, ui.cameraNotSupported, ui.cameraOnStatus]);

  const handleCameraToggle = async () => {
    if (!arOverlayEnabled) {
      setCameraStatus(ui.arOverlayOff);
      return;
    }
    if (cameraEnabled) {
      stopCamera();
      await queryAI("Camera turned off. Provide a concise place summary.");
      return;
    }
    await startCamera();
  };

  const handleVoiceToggle = () => {
    if (!voiceNarrationEnabled) {
      setVoiceStatus(ui.enableVoiceModeFirst);
      return;
    }
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!voiceModeEnabled) {
      if (!SpeechRecognitionCtor) {
        setVoiceStatus(ui.voiceRecognitionUnsupported);
        return;
      }
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = speechLanguageCode;
      recognition.interimResults = false;
      recognition.continuous = true;
      recognition.onstart = () => setVoiceStatus(ui.askModeListening);
      recognition.onresult = async (event: any) => {
        const last = event.results?.[event.results.length - 1];
        const transcript = String(last?.[0]?.transcript ?? "").trim();
        if (!transcript) return;
        await queryAI(transcript);
      };
      recognition.onerror = () => setVoiceStatus(ui.askModeError);
      recognition.onend = () => {
        // Keep listening continuously until Ask Mode is explicitly turned off.
        if (voiceModeRef.current) {
          try {
            recognition.start();
          } catch {
            // no-op
          }
        } else {
          setVoiceStatus("");
        }
      };
      recognitionRef.current = recognition;
      voiceModeRef.current = true;
      setVoiceModeEnabled(true);
      try {
        recognition.start();
      } catch {
        setVoiceStatus(ui.unableStartAskMode);
      }
      return;
    }

    setVoiceModeEnabled(false);
    voiceModeRef.current = false;
    setVoiceStatus("");
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    isConversationModeRef.current = isConversationMode;
  }, [isConversationMode]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    // Speak only when overlay + voice narration are enabled and there is content.
    if (!selectedPlaceId || !narrationLines.length) return;
    if (!arOverlayEnabled || !voiceNarrationEnabled || !answer || isConversationMode) return;
    if (Date.now() - lastNarrationTriggerAtRef.current < 1800) return;
    void speakWithTts(answer);
  }, [answer, arOverlayEnabled, voiceNarrationEnabled, isConversationMode, narrationLines.length, selectedPlaceId, speakWithTts]);

  useEffect(() => {
    if (voiceNarrationEnabled) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    queuedCloudNarrationRef.current = null;
    cloudTtsRequestInFlightRef.current = false;
  }, [voiceNarrationEnabled]);

  useEffect(() => {
    if (voiceNarrationEnabled) return;
    if (!voiceModeEnabled) return;
    setVoiceModeEnabled(false);
    voiceModeRef.current = false;
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // no-op
    }
    setVoiceStatus(ui.askModeOffBecauseVoiceOff);
  }, [voiceModeEnabled, voiceNarrationEnabled, ui.askModeOffBecauseVoiceOff]);

  useEffect(() => {
    if (arOverlayEnabled) return;
    if (cameraEnabled) {
      stopCamera();
    }
    setCameraStatus(ui.arOverlayOff);
  }, [arOverlayEnabled, cameraEnabled, stopCamera, ui.arOverlayOff]);

  useEffect(() => {
    if (!cameraEnabled && arOverlayEnabled) {
      setCameraStatus(ui.cameraTurnOnHint);
      return;
    }
    if (!cameraEnabled && !arOverlayEnabled) {
      setCameraStatus(ui.arOverlayOff);
    }
  }, [arOverlayEnabled, cameraEnabled, ui.arOverlayOff, ui.cameraTurnOnHint]);

  useEffect(() => {
    // Global cleanup for recognition, camera, timers, and TTS on unmount.
    return () => {
      if (globeTransitionTimerRef.current !== null) {
        window.clearTimeout(globeTransitionTimerRef.current);
        globeTransitionTimerRef.current = null;
      }
      if (guidanceIntervalRef.current !== null) {
        window.clearInterval(guidanceIntervalRef.current);
      }
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // no-op
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
        ttsAudioUrlRef.current = null;
      }
      clearRecordingTurnTimer();
      isRecordingRef.current = false;
      queuedCloudNarrationRef.current = null;
      cloudTtsRequestInFlightRef.current = false;
      try {
        mediaRecorder.current?.stop();
      } catch {
        // no-op
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    };
  }, [clearRecordingTurnTimer]);

  useEffect(() => {
    if (!selectedPlaceId || isConversationMode) return;
    void queryAI();
  }, [selectedPlaceId, i18n.language, i18n.resolvedLanguage, isConversationMode, queryAI]);

  useEffect(() => {
    void checkHealth();
    const intervalId = window.setInterval(() => {
      void checkHealth();
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [checkHealth]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [i18n.language, i18n.resolvedLanguage]);

  useEffect(() => {
    const onFirstInteraction = () => {
      unlockBrowserSpeech();
    };
    window.addEventListener("pointerdown", onFirstInteraction, { once: true, passive: true, capture: true });
    return () => window.removeEventListener("pointerdown", onFirstInteraction, true);
  }, [unlockBrowserSpeech]);

  useEffect(() => {
    if (cameraEnabled) return;
    const timerId = window.setInterval(() => {
      setFallbackImageIndex((current) => (current + 1) % selectedPreviewImages.length);
    }, 4000);
    return () => window.clearInterval(timerId);
  }, [cameraEnabled, selectedPreviewImages.length]);

  useEffect(() => {
    setFallbackImageIndex(0);
  }, [selectedPlaceId]);

  return (
    <Layout>
      <audio ref={ttsAudioRef} preload="auto" style={{ display: "none" }} />
      {/* Page shell */}
      <section className="pt-28 pb-15 md:pt-32 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <Link href="/tourism" className="mb-4 inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 hover:text-zim-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backToTourismLabel}
          </Link>
          {/* Main two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left rail: location controls + narration transcript */}
              <div className="lg:col-span-3 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <Button
                  onClick={handleUseMyLocation}
                  className="w-full bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full"
                >
                  <LocateFixed className="h-4 w-4 mr-2" />
                  {ui.useMyLocation}
                </Button>
                <div>
                  <select
                    id="aug-place"
                    className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zim-gold/60"
                    value={selectedPlaceId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      if (!selectedPlaceId && nextId) {
                        setIsGlobeZoomTransitioning(true);
                        if (globeTransitionTimerRef.current !== null) {
                          window.clearTimeout(globeTransitionTimerRef.current);
                        }
                        globeTransitionTimerRef.current = window.setTimeout(() => {
                          setIsGlobeZoomTransitioning(false);
                          globeTransitionTimerRef.current = null;
                        }, 2200);
                      }
                      setSelectedPlaceId(nextId);
                    }}
                  >
                    <option value="" disabled>
                      {ui.selectDestination}
                    </option>
                    {localizedPlaces.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </div>
                {locationStatus ? <p className="text-xs text-white/70 leading-relaxed">{locationStatus}</p> : null}
                <div className="mt-2 border-t border-white/10 pt-3">
                  <p className="text-[10px] uppercase tracking-widest font-black text-zim-gold mb-1">
                    {selectedPlaceId ? ui.narration : ui.selectLocation}
                  </p>
                  {!selectedPlaceId ? null : narrationLines.length > 0 ? (
                    <div className="space-y-1.5">
                      {narrationLines.map((line, index) => (
                        <p key={`${line}-${index}`} className="text-sm text-white/75 leading-relaxed">
                          {line.includes(":") ? (
                            <>
                              <span className="font-black">{line.split(":")[0]}:</span> {line.split(":").slice(1).join(":").trim()}
                            </>
                          ) : (
                            line
                          )}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/70 leading-relaxed">
                      {ui.narrationPending}
                    </p>
                  )}
                  {error ? <p className="text-[11px] text-red-300 mt-2 leading-relaxed">{error}</p> : null}
                </div>
              </div>

              {/* Right panel: AR viewport/camera + contextual voice controls */}
              <div className="lg:col-span-9 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 pb-2 space-y-5 flex flex-col">
                <div className="flex flex-col gap-3 flex-1 min-h-0">
                  {/* Camera controls row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => void handleCameraToggle()}
                      disabled={!arOverlayEnabled}
                      className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {cameraEnabled ? ui.turnCameraOff : ui.turnCameraOn}
                    </Button>
                    <p className="text-xs text-white/70">{cameraStatus}</p>
                  </div>
                  {/* Live camera feed or fallback rotating preview */}
                  <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40 flex-1 min-h-[26rem] md:min-h-[32rem]">
                    {!selectedPlaceId || isGlobeZoomTransitioning ? (
                      <div
                        className={`h-full w-full transition-transform duration-[2200ms] ease-in ${
                          isGlobeZoomTransitioning ? "scale-[3.2]" : "scale-100"
                        }`}
                      >
                        <ZimbabweInteractiveGlobeLoader />
                      </div>
                    ) : cameraEnabled ? (
                      <video
                        ref={cameraVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-100 transition-[height] duration-300"
                      />
                    ) : (
                      <div className="relative w-full h-full transition-[height] duration-300">
                        <img
                          src={selectedPreviewImages[fallbackImageIndex]}
                          alt={`${selectedPlace.name} preview visual`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                        <p className="absolute left-3 bottom-3 text-[10px] uppercase tracking-widest font-black text-white/85">
                          {selectedPlace.name} {ui.preview}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`${voiceNarrationEnabled ? "mt-auto" : ""} space-y-3`}>
                  <div className="rounded-xl border border-zim-gold/20 bg-zim-gold/5 p-3 mt-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-2.5 w-2.5 text-zim-gold" />
                        <p className="text-[9px] uppercase tracking-widest font-black text-zim-gold">{ui.currentContext}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={() => void handleConversationToggle()}
                          variant="outline"
                          aria-pressed={isConversationMode}
                          className={`h-6 px-2.5 font-black uppercase tracking-widest text-[8px] leading-none rounded-full ${
                            isConversationMode
                              ? "bg-zim-gold text-zim-black border border-zim-gold hover:bg-white"
                              : "border border-white/20 text-white hover:bg-white hover:text-zim-black"
                          }`}
                        >
                          {isConversationMode ? ui.conversationOn : ui.conversationOff}
                        </Button>
                        <Button
                          onClick={handleVoiceNarrationToggle}
                          variant="outline"
                          className="h-6 px-2.5 border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[8px] leading-none rounded-full"
                        >
                          {voiceNarrationEnabled ? ui.voiceNarrationOn : ui.voiceNarrationOff}
                        </Button>
                        {voiceNarrationEnabled ? (
                          <div className="h-6 px-2.5 border border-white/20 text-white rounded-full flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white">{ui.voice}</span>
                            <select
                              id="voice-gender-inline"
                              value={selectedVoiceGender}
                              onChange={(event) => setSelectedVoiceGender(event.target.value as "male" | "female")}
                              className="bg-transparent text-[8px] font-black uppercase tracking-widest text-zim-gold focus:outline-none"
                            >
                              <option className="text-zim-gold bg-slate-950" value="male">{ui.male}</option>
                              <option className="text-zim-gold bg-slate-950" value="female">{ui.female}</option>
                            </select>
                          </div>
                        ) : null}
                        {isConversationMode ? (
                          <Button
                            onClick={toggleRecording}
                            aria-pressed={isRecording}
                            className={`h-6 px-2.5 font-black uppercase tracking-widest text-[8px] leading-none rounded-full border ${
                              isRecording
                                ? "bg-red-500 text-white border-red-400 hover:bg-red-400"
                                : "border-white/20 text-white hover:bg-white hover:text-zim-black"
                            }`}
                          >
                            {isRecording ? <Mic className="h-3 w-3 mr-1" /> : <Mic className="h-3 w-3 mr-1" />}
                            {isRecording ? ui.voiceInputOn : ui.voiceInput}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 border-t border-white/15" />
                    {selectedPlaceId ? (
                      <>
                        <h2 className="!text-lg font-black text-white leading-tight mt-2">{selectedPlace.name}</h2>
                        <p className="text-[11px] text-white/70 mt-1 leading-snug">{selectedPlace.heritage}</p>
                      </>
                    ) : null}
                  </div>

                  <div className="space-y-0">
                  <p className="m-0 text-[11px] text-white/70 leading-relaxed">
                    {ui.arOverlayVoice} {arOverlayEnabled && voiceNarrationEnabled ? ui.enabled : ui.disabled}.
                    {" "}{ui.cameraLabel} {cameraEnabled ? ui.cameraOnSummary : ui.cameraOffSummary}
                    {voiceStatus ? ` ${voiceStatus}` : ""}
                  </p>
                  </div>
                </div>

                
              </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
