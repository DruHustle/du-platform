import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Camera, LocateFixed, MapPin, Mic } from "lucide-react";
import { checkOnesaHealth, sendOnesaChatMessage } from "./OnesaAI";
import { useTranslation } from "react-i18next";
import ZimbabweInteractiveGlobe from "@/components/ZimbabweInteractiveGlobe";

type PlaceProfile = {
  id: string;
  name: string;
  heritage: string;
  history: string;
  culture: string;
  pointsOfInterest: string[];
  directionTips: string[];
  nextStops: string[];
  safetyNote: string;
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
function buildLocalGuidance(place: PlaceProfile, cameraEnabled: boolean): string {
  if (cameraEnabled) {
    return [
      `${place.name}: ${place.history}`,
      `Heritage: ${place.heritage}`,
      `Direction cue: ${place.directionTips[0] ?? "Move slowly and keep your camera aligned with your path."}`,
      `Stop point: ${place.pointsOfInterest[0] ?? "Main viewpoint area"} — pause and observe before continuing.`,
      `What to notice: ${place.pointsOfInterest[1] ?? "Watch for nearby interpretation markers and cultural details."}`,
      `Narration: ${place.culture}`,
      `Next stop: ${place.nextStops[0] ?? "Nearby heritage point"}.`,
      `Local tip: ${place.directionTips[1] ?? "Take your time at each stop to hear full narration before moving."}`,
      `Safety: ${place.safetyNote}`,
    ].join(" ");
  }

  return [
    `${place.name}: ${place.heritage}`,
    `History: ${place.history}`,
    `Culture: ${place.culture}`,
    `What to notice: ${place.pointsOfInterest[0] ?? "Main destination highlights"}.`,
    `Top points of interest: ${place.pointsOfInterest.slice(0, 2).join("; ")}.`,
    `Direction cue: ${place.directionTips[0] ?? "Follow marked visitor routes and pause at key viewpoints."}`,
    `Suggested next stop: ${place.nextStops[0] ?? "Local visitor center"}.`,
    `Local tip: ${place.directionTips[1] ?? "Use official guides and interpretation signage for deeper context."}`,
    `Safety: ${place.safetyNote}`,
  ].join(" ");
}

// Split AI response into readable UI lines; prefers keyed sections when present.
function formatNarrationLines(text: string): string[] {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const keyPattern =
    /(?=(?:Heritage|Direction cue|Stop point|What to notice|Narration|Next stop|Local tip|Safety|History|Culture|Top points of interest|Suggested next stop)\s*:)/g;
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

export default function OnesaAITourismAugmentedExperience() {
  const { i18n } = useTranslation();
  // Static destination profiles used for both AI prompts and local fallback content.
  const places: PlaceProfile[] = useMemo(
    () => [
      {
        id: "victoria_falls",
        name: "Victoria Falls",
        heritage: "A UNESCO World Heritage destination and one of the world's most iconic waterfall landscapes.",
        history: "Known as Mosi-oa-Tunya, this zone has long served as a cultural and trade corridor along the Zambezi.",
        culture: "Local communities shape the destination through craft traditions, storytelling, and hospitality experiences.",
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
        culture: "The site reflects deep historical craftsmanship and living heritage links across Zimbabwe.",
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
        culture: "Explore local cuisine, contemporary art, music spaces, and cultural districts across the city.",
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
        culture: "Visitors can engage with strong performing arts, local cuisine, and regional craft communities.",
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
        culture: "Community-linked tourism and ranger-led interpretation add local context to wildlife experiences.",
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
  const [cameraStatus, setCameraStatus] = useState("Turn on camera for a full AR experience.");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceLanguage, setSelectedVoiceLanguage] = useState("english");
  const [selectedVoiceGender, setSelectedVoiceGender] = useState<"male" | "female">("female");
  const [narrationVolume, setNarrationVolume] = useState(0.9);
  const [fallbackImageIndex, setFallbackImageIndex] = useState(0);
  const [settingsPanelHeight, setSettingsPanelHeight] = useState(0);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const loadingRef = useRef(false);
  const aiBackoffUntilRef = useRef(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const guidanceIntervalRef = useRef<number | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const globeTransitionTimerRef = useRef<number | null>(null);
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

  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0];
  const selectedPreviewImages = previewImagesByPlace[selectedPlaceId] ?? ["/images/pages/tourism/victoria_falls.jpg"];
  const narrationLines = useMemo(() => formatNarrationLines(answer), [answer]);
  const previewHeightStyle = useMemo(
    () => ({ ["--settings-space" as string]: `${voiceNarrationEnabled ? 0 : settingsPanelHeight}px` }),
    [voiceNarrationEnabled, settingsPanelHeight]
  );
  const voiceLanguageMap: Record<string, string[]> = {
    english: ["en"],
    shona: ["sn"],
    german: ["de"],
    french: ["fr"],
    spanish: ["es"],
    ndebele: ["nd", "nr"],
  };
  const genderKeywordMap: Record<"male" | "female", string[]> = {
    male: ["male", "man", "david", "daniel", "george", "john", "paul", "tom", "michael", "alex"],
    female: ["female", "woman", "samantha", "karen", "zira", "emma", "aria", "victoria", "linda", "anna", "zoe"],
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported on this device.");
      return;
    }

    setLocationStatus("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const inferred = inferNearestPlace(position.coords.latitude, position.coords.longitude);
        setSelectedPlaceId(inferred);
        setLocationStatus("Location detected. Onesa AI-powered Local Guide is now focused on your nearest destination.");
      },
      () => {
        setLocationStatus("Unable to detect location. Please select a destination manually.");
      }
    );
  };

  const checkHealth = useCallback(async () => {
    const health = await checkOnesaHealth("Onesa is currently unavailable. AI mode is off");
    setIsOnline(health.online);
    setOnlineStatusText(health.statusText);
  }, []);

  const queryAI = useCallback(async (inputPrompt?: string) => {
    const trimmed = String(inputPrompt ?? "").trim();
    if (loadingRef.current) return;
    if (Date.now() < aiBackoffUntilRef.current) {
      const response = buildLocalGuidance(selectedPlace, cameraEnabled);
      setError("");
      setVoiceStatus("Using local guidance mode.");
      setAnswer(response);
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    setError("");
    let response = buildLocalGuidance(selectedPlace, cameraEnabled);

    try {
      const defaultGuidancePrompt = arOverlayEnabled && cameraEnabled
        ? [
            "Camera is ON. You are Onesa AR guide in street-view style.",
            `Current destination: ${selectedPlace.name}.`,
            `Heritage context: ${selectedPlace.heritage}`,
            `History context: ${selectedPlace.history}`,
            `Culture context: ${selectedPlace.culture}`,
            "Provide directional guidance as if the user is walking and looking through camera.",
            "Tell the user where to move next (left/right/forward), where to pause at points of interest, and narrate those stops.",
            "Use concise, practical voice-friendly sentences and include a safety cue.",
          ].join("\n")
        : [
            "AR Overlay is OFF or camera is OFF. Provide a concise place summary for the user.",
            `Current destination: ${selectedPlace.name}.`,
            `Heritage context: ${selectedPlace.heritage}`,
            `History context: ${selectedPlace.history}`,
            `Culture context: ${selectedPlace.culture}`,
            "Return 4 short parts: 1) Place summary, 2) Key history, 3) Cultural highlight, 4) Next best place to visit.",
          ].join("\n");
      const prompt = [
        `You are Onesa AI Local Guide for Zimbabwe.`,
        `Current destination: ${selectedPlace.name}.`,
        `Heritage context: ${selectedPlace.heritage}`,
        `History context: ${selectedPlace.history}`,
        `Culture context: ${selectedPlace.culture}`,
        trimmed ? `Visitor voice prompt: ${trimmed}` : defaultGuidancePrompt,
        "Answer with practical, concise, visitor-friendly guidance in 4-6 sentences.",
      ].join("\n");
      const requestAI = async () => {
        const { data } = await sendOnesaChatMessage({
          messages: [{ role: "user", content: prompt }],
          language: i18n.resolvedLanguage ?? i18n.language ?? "en",
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
      setVoiceStatus("Using local guidance mode.");
      void checkHealth();
      // Prevent repeated immediate upstream retries during provider instability.
      aiBackoffUntilRef.current = Date.now() + 30000;
      setAnswer(response);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cameraEnabled, i18n.language, i18n.resolvedLanguage, selectedPlace.culture, selectedPlace.heritage, selectedPlace.history, selectedPlace.name]);

  const processConversation = async (blob: Blob) => {
    setLoading(true);
    setVoiceStatus("Transcribing...");
    try {
      const res = await fetch("/api/whisper", { method: "POST", body: blob });
      const whisperPayload = await res.json().catch(() => ({} as { text?: string; error?: string }));
      const whisperError = String(whisperPayload?.error ?? "");
      const whisperQuotaBlocked =
        res.status === 429 || /insufficient_quota|quota|rate[\s_-]?limit/i.test(whisperError);

      if (!res.ok || !whisperPayload?.text) {
        if (whisperQuotaBlocked) {
          setVoiceStatus("Whisper unavailable. Falling back to Onesa AI guidance...");
          const fallbackPrompt = [
            "Whisper transcription is temporarily unavailable due quota/rate limits.",
            `Current destination: ${selectedPlace.name}.`,
            `Heritage context: ${selectedPlace.heritage}`,
            `History context: ${selectedPlace.history}`,
            `Culture context: ${selectedPlace.culture}`,
            "Provide concise visitor guidance in 3-5 sentences.",
          ].join("\n");
          const { data } = await sendOnesaChatMessage({
            messages: [{ role: "user", content: fallbackPrompt }],
            language: i18n.resolvedLanguage ?? i18n.language ?? "en",
          });
          const reply = String(data?.reply ?? "").trim();
          setAnswer(reply || buildLocalGuidance(selectedPlace, cameraEnabled));
          setVoiceStatus("Using Onesa AI fallback.");
          return;
        }
        throw new Error("Whisper failed");
      }

      const text = whisperPayload.text;
      setVoiceStatus("Guide is thinking...");
      const prompt = [
        `You are Onesa AI Local Guide for Zimbabwe.`,
        `Current destination: ${selectedPlace.name}.`,
        `Heritage context: ${selectedPlace.heritage}`,
        `History context: ${selectedPlace.history}`,
        `Culture context: ${selectedPlace.culture}`,
        `Visitor voice prompt: ${text}`,
        "Answer with practical, concise, visitor-friendly guidance in 3-5 sentences.",
      ].join("\n");
      const { data } = await sendOnesaChatMessage({
        messages: [{ role: "user", content: prompt }],
        language: i18n.resolvedLanguage ?? i18n.language ?? "en",
      });
      const reply = String(data?.reply ?? "").trim();
      setAnswer(reply || buildLocalGuidance(selectedPlace, cameraEnabled));
      setVoiceStatus("");
    } catch {
      setVoiceStatus("Voice Error");
    } finally {
      setLoading(false);
    }
  };

  const speakWithTts = async (text: string) => {
    if (!text) return;
    let ttsQuotaBlocked = false;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: selectedVoiceGender === "male" ? "echo" : "alloy",
          speed: 1,
        }),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        ttsQuotaBlocked = res.status === 429 || /insufficient_quota|quota|rate[\s_-]?limit/i.test(errorText);
        throw new Error("TTS failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (!ttsAudioRef.current) {
        ttsAudioRef.current = new Audio();
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
      }
      ttsAudioUrlRef.current = url;
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = url;
      ttsAudioRef.current.volume = narrationVolume;
      await ttsAudioRef.current.play();
    } catch {
      if (ttsQuotaBlocked) {
        setVoiceStatus("OpenAI TTS unavailable. Using Onesa AI text guidance.");
      }
      // Fallback to browser TTS if OpenAI TTS fails.
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = i18n.resolvedLanguage ?? i18n.language ?? "en-US";
        utterance.volume = narrationVolume;
        const targetPrefixes = voiceLanguageMap[selectedVoiceLanguage] ?? ["en"];
        const languageMatches = availableVoices.filter((item) =>
          targetPrefixes.some((prefix) => item.lang.toLowerCase().startsWith(prefix))
        );
        const genderKeywords = genderKeywordMap[selectedVoiceGender];
        const voiceByGender = languageMatches.find((item) => {
          const name = `${item.name} ${item.voiceURI}`.toLowerCase();
          return genderKeywords.some((keyword) => name.includes(keyword));
        });
        const voice = voiceByGender ?? languageMatches[0] ?? availableVoices[0];
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
      } catch {
        // no-op
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    try {
      mediaRecorder.current?.stop();
    } catch {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    }
    setIsRecording(false);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceStatus("Microphone not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        void processConversation(new Blob(audioChunks.current));
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setVoiceStatus("Listening...");
    } catch {
      setVoiceStatus("Microphone access denied.");
      setIsConversationMode(false);
      setIsRecording(false);
    }
  }, [isRecording, processConversation]);

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
    setCameraStatus("Turn on camera for a full AR experience.");
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("Camera is not supported in this browser.");
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
      setCameraStatus("Camera is on. AR live guidance is active.");
      await queryAI();
      // Refresh AR guidance while camera mode is active.
      if (guidanceIntervalRef.current !== null) window.clearInterval(guidanceIntervalRef.current);
      guidanceIntervalRef.current = window.setInterval(() => {
        void queryAI();
      }, 45000);
    } catch {
      setCameraStatus("Unable to access camera. Check permissions and try again.");
      setCameraEnabled(false);
    }
  }, [queryAI]);

  const handleCameraToggle = async () => {
    if (!arOverlayEnabled) {
      setCameraStatus("AR Overlay is off. Camera is not required.");
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
      setVoiceStatus("Enable Voice Mode first to use Ask Mode.");
      return;
    }
    const SpeechRecognitionCtor =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!voiceModeEnabled) {
      if (!SpeechRecognitionCtor) {
        setVoiceStatus("Voice recognition is not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = i18n.resolvedLanguage ?? i18n.language ?? "en-US";
      recognition.interimResults = false;
      recognition.continuous = true;
      recognition.onstart = () => setVoiceStatus("Ask Mode is listening...");
      recognition.onresult = async (event: any) => {
        const last = event.results?.[event.results.length - 1];
        const transcript = String(last?.[0]?.transcript ?? "").trim();
        if (!transcript) return;
        await queryAI(transcript);
      };
      recognition.onerror = () => setVoiceStatus("Ask Mode: Voice capture error. Try toggling Ask Mode again.");
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
        setVoiceStatus("Unable to start Ask Mode.");
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
    // Speak only when overlay + voice narration are enabled and there is content.
    if (!arOverlayEnabled || !voiceNarrationEnabled || !answer || isConversationMode) return;
    void speakWithTts(answer);
  }, [answer, arOverlayEnabled, voiceNarrationEnabled, isConversationMode]);

  useEffect(() => {
    if (voiceNarrationEnabled) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
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
    setVoiceStatus("Ask Mode is off because Voice Mode is off.");
  }, [voiceModeEnabled, voiceNarrationEnabled]);

  useEffect(() => {
    if (arOverlayEnabled) return;
    if (cameraEnabled) {
      stopCamera();
    }
    setCameraStatus("AR Overlay is off. Camera is not required.");
  }, [arOverlayEnabled, cameraEnabled, stopCamera]);

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
      try {
        mediaRecorder.current?.stop();
      } catch {
        // no-op
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
    };
  }, []);

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
    if (cameraEnabled) return;
    const timerId = window.setInterval(() => {
      setFallbackImageIndex((current) => (current + 1) % selectedPreviewImages.length);
    }, 4000);
    return () => window.clearInterval(timerId);
  }, [cameraEnabled, selectedPreviewImages.length]);

  useEffect(() => {
    setFallbackImageIndex(0);
  }, [selectedPlaceId]);

  useEffect(() => {
    if (!voiceNarrationEnabled) return;
    const panel = settingsPanelRef.current;
    if (!panel) return;

    const updateHeight = () => {
      setSettingsPanelHeight(Math.ceil(panel.getBoundingClientRect().height));
    };

    updateHeight();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(panel);
    return () => observer.disconnect();
  }, [voiceNarrationEnabled]);

  return (
    <Layout>
      {/* Page shell */}
      <section className="pt-28 pb-15 md:pt-32 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          {/* Main two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left rail: location controls + narration transcript */}
              <div className="lg:col-span-3 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <Button
                  onClick={handleUseMyLocation}
                  className="w-full bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full"
                >
                  <LocateFixed className="h-4 w-4 mr-2" />
                  Use My Location
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
                      Select destination
                    </option>
                    {places.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </div>
                {locationStatus ? <p className="text-xs text-white/70 leading-relaxed">{locationStatus}</p> : null}
                <div className="mt-2 border-t border-white/10 pt-3">
                  <p className="text-[10px] uppercase tracking-widest font-black text-zim-gold mb-1">
                    {selectedPlaceId ? "Narration" : "Select location"}
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
                      Narration will appear here once AI guidance is generated.
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
                      {cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
                    </Button>
                    <p className="text-xs text-white/70">{cameraStatus}</p>
                  </div>
                  {/* Live camera feed or fallback rotating preview */}
                  <div
                    style={previewHeightStyle}
                    className="rounded-xl border border-white/10 overflow-hidden bg-black/40 flex-1 min-h-[calc(26rem+var(--settings-space))] md:min-h-[calc(32rem+var(--settings-space))]"
                  >
                    {!selectedPlaceId || isGlobeZoomTransitioning ? (
                      <div
                        className={`h-full w-full transition-transform duration-[2200ms] ease-in ${
                          isGlobeZoomTransitioning ? "scale-[3.2]" : "scale-100"
                        }`}
                      >
                        <ZimbabweInteractiveGlobe />
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
                          {selectedPlace.name} Preview
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
                        <p className="text-[9px] uppercase tracking-widest font-black text-zim-gold">Current Context</p>
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
                          {isConversationMode ? "Conversation: On" : "Conversation: Off"}
                        </Button>
                        <Button
                          onClick={() => setVoiceNarrationEnabled((current) => !current)}
                          variant="outline"
                          className="h-6 px-2.5 border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[8px] leading-none rounded-full"
                        >
                          {voiceNarrationEnabled ? "Voice Narration: On" : "Voice Narration: Off"}
                        </Button>
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
                            {isRecording ? "Voice Input: On" : "Voice Input"}
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
                    {voiceNarrationEnabled ? (
                      <div ref={settingsPanelRef} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                        <div className="space-y-1 text-center">
                          <label htmlFor="voice-type" className="block text-[8px] uppercase tracking-widest font-black text-white/70 text-center">
                            Language
                          </label>
                          <select
                            id="voice-type"
                            value={selectedVoiceLanguage}
                            onChange={(event) => setSelectedVoiceLanguage(event.target.value)}
                            className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-[10px] text-white text-center focus:outline-none focus:ring-2 focus:ring-zim-gold/60"
                          >
                            <option value="english">English</option>
                            <option value="shona">Shona</option>
                            <option value="german">German</option>
                            <option value="french">French</option>
                            <option value="spanish">Spanish</option>
                            <option value="ndebele">Ndebele</option>
                          </select>
                        </div>
                        <div className="space-y-1 text-center">
                          <label htmlFor="voice-gender" className="block text-[8px] uppercase tracking-widest font-black text-white/70 text-center">
                            Voice Gender
                          </label>
                          <select
                            id="voice-gender"
                            value={selectedVoiceGender}
                            onChange={(event) => setSelectedVoiceGender(event.target.value as "male" | "female")}
                            className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-[10px] text-white text-center focus:outline-none focus:ring-2 focus:ring-zim-gold/60"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                        </div>
                        <div className="space-y-1 text-center">
                          <label htmlFor="voice-volume" className="block text-[8px] uppercase tracking-widest font-black text-white/70 text-center">
                            Volume ({Math.round(narrationVolume * 100)}%)
                          </label>
                          <input
                            id="voice-volume"
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={narrationVolume}
                            onChange={(event) => setNarrationVolume(Number(event.target.value))}
                            className="w-full accent-[#d4af37]"
                          />
                        </div>
                      </div>
                    ) : null}
                  <p className="m-0 text-[11px] text-white/60 leading-relaxed">
                    AR Overlay voice narration is {arOverlayEnabled && voiceNarrationEnabled ? "enabled" : "disabled"}.
                    Camera {cameraEnabled ? "on: live directional AR guidance active." : "off: summary narration mode active."}
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
