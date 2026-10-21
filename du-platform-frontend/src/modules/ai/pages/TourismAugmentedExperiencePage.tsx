import { useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useExperienceRequests,
  experienceMediaSignal,
} from "@/modules/ai/lib/useExperienceRequests";
import { useMediaStream } from "@/modules/ai/lib/useMediaStream";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, LocateFixed, MapPin, Mic } from "lucide-react";
import { getArExperienceMetadata } from "@/modules/ai/ar/arExperienceApi";
import {
  getLocalizedArPlaces,
  resolveArPreviewImages,
} from "@/modules/ai/ar/arExperienceContent";
import {
  buildLocalGuidance,
  inferNearestPlace,
} from "@/modules/ai/ar/arExperienceGuidance";
import {
  AR_CONVERSATION_TURN_MS,
  AR_GENDER_KEYWORD_MAP,
  AR_SILENT_WAV_DATA_URI,
  AR_UI_TEXT,
  formatNarrationLines,
  getLanguageLabel,
  getSpeechLanguageCode,
  normalizeUiLanguage,
} from "@/modules/ai/ar/arExperienceText";
import type {
  ArExperienceMetadata,
  ArPlaceId,
  UiLanguage,
} from "@/modules/ai/ar/arExperienceTypes";
import { isArPlaceId } from "@/modules/ai/ar/arExperienceTypes";
import { checkOnesaHealth, sendOnesaChatMessage } from "@/modules/ai/lib/aiApi";
import ZimbabweInteractiveGlobeLoader from "@/modules/ai/components/ZimbabweInteractiveGlobeLoader";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

const DEFAULT_AR_FEATURES: ArExperienceMetadata["features"] = {
  geolocation: true,
  cameraGuide: true,
  voiceNarration: true,
  conversation: true,
  audioTranscription: true,
};

export default function TourismAugmentedExperiencePage() {
  const { i18n, t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const uiLanguage = useMemo<UiLanguage>(
    () => normalizeUiLanguage(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );
  const ui = useMemo(
    () =>
      ({ ...AR_UI_TEXT.en, ...(AR_UI_TEXT[uiLanguage] ?? {}) }) as Record<
        string,
        string
      >,
    [uiLanguage]
  );
  const selectedLanguageLabel = useMemo(
    () => getLanguageLabel(uiLanguage),
    [uiLanguage]
  );
  const backToTourismLabel = t("tourism.back_to_tourism", {
    defaultValue: `Back to ${t("nav.tourism", { defaultValue: "Tourism" })}`,
  });
  const backToTourismButtonClass =
    "mb-4 inline-flex items-center text-xs uppercase tracking-widest font-bold text-white/70 transition-colors hover:text-zim-gold";
  const speechLanguageCode = useMemo(
    () => getSpeechLanguageCode(uiLanguage),
    [uiLanguage]
  );
  const localizedPlaces = useMemo(
    () => getLocalizedArPlaces(uiLanguage),
    [uiLanguage]
  );
  const [arExperienceMetadata, setArExperienceMetadata] =
    useState<ArExperienceMetadata | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<ArPlaceId | "">("");
  const [isGlobeZoomTransitioning, setIsGlobeZoomTransitioning] =
    useState(false);
  const [answer, setAnswer] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [arOverlayEnabled] = useState(true);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [microphoneError, setMicrophoneError] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [onlineStatusText, setOnlineStatusText] = useState("");
  const [voiceNarrationEnabled, setVoiceNarrationEnabled] = useState(false);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoiceGender, setSelectedVoiceGender] = useState<
    "male" | "female"
  >("female");
  const experienceContext = `${selectedPlaceId}:${uiLanguage}:${cameraEnabled}:${isConversationMode}`;
  const { getSignal: getGuideSignal } =
    useExperienceRequests(experienceContext);
  const { getSignal: getNarrationSignal, cancel: cancelNarration } =
    useExperienceRequests(`${experienceContext}:${selectedVoiceGender}`);
  const narrationVolume = 0.82;
  const [fallbackImageIndex, setFallbackImageIndex] = useState(0);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const loadingRef = useRef(false);
  const aiBackoffUntilRef = useRef(0);
  const microphone = useMediaStream();
  const camera = useMediaStream();
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
  const narrationRetryCleanupRef = useRef<(() => void) | null>(null);
  const cloudTtsRequestInFlightRef = useRef(false);
  const queuedCloudNarrationRef = useRef<string | null>(null);
  const availablePlaces = useMemo(() => {
    const configuredDestinationIds = new Set(
      arExperienceMetadata?.destinationIds ??
        localizedPlaces.map(place => place.id)
    );
    const filteredPlaces = localizedPlaces.filter(place =>
      configuredDestinationIds.has(place.id)
    );
    return filteredPlaces.length > 0 ? filteredPlaces : localizedPlaces;
  }, [arExperienceMetadata, localizedPlaces]);
  const arFeatures = arExperienceMetadata?.features ?? DEFAULT_AR_FEATURES;
  const previewImagesByPlace = useMemo(
    () => resolveArPreviewImages(arExperienceMetadata?.previewImages),
    [arExperienceMetadata]
  );

  const selectedPlace = (availablePlaces.find(
    place => place.id === selectedPlaceId
  ) ?? availablePlaces[0])!;
  const selectedPreviewImages = previewImagesByPlace[selectedPlace.id];
  const narrationLines = useMemo(() => formatNarrationLines(answer), [answer]);

  useEffect(() => {
    let cancelled = false;

    void getArExperienceMetadata({ sessionId: "tourism-augmented-experience" })
      .then(metadata => {
        if (cancelled) return;
        setArExperienceMetadata(metadata);
      })
      .catch(() => {
        if (cancelled) return;
        setArExperienceMetadata(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPlaceId) return;
    if (availablePlaces.some(place => place.id === selectedPlaceId)) return;
    setSelectedPlaceId(availablePlaces[0]?.id ?? "");
  }, [availablePlaces, selectedPlaceId]);

  const clearRecordingTurnTimer = useCallback(() => {
    if (recordingTurnTimerRef.current !== null) {
      window.clearTimeout(recordingTurnTimerRef.current);
      recordingTurnTimerRef.current = null;
    }
  }, []);

  const unlockBrowserSpeech = useCallback((): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return false;
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

  const loadVoicesWithTimeout = useCallback(async (): Promise<
    SpeechSynthesisVoice[]
  > => {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return [];
    const synth = window.speechSynthesis;
    const immediate = synth.getVoices();
    if (immediate.length) return immediate;
    return await new Promise<SpeechSynthesisVoice[]>(resolve => {
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
    narrationRetryCleanupRef.current?.();
    pendingNarrationRetryRef.current = text;
    const retry = () => {
      const queued = pendingNarrationRetryRef.current;
      if (!queued) return;
      pendingNarrationRetryRef.current = null;
      void speakWithBrowserVoice(queued, true);
    };
    narrationRetryCleanupRef.current = () =>
      window.removeEventListener("pointerdown", retry, true);
    window.addEventListener("pointerdown", retry, {
      once: true,
      passive: true,
      capture: true,
    });
  }, []);

  const speakWithBrowserVoice = useCallback(
    async (
      text: string,
      fromUserGesture = false,
      signal = getNarrationSignal()
    ): Promise<boolean> => {
      if (signal.aborted || !text) return false;
      if (typeof window === "undefined" || !("speechSynthesis" in window))
        return false;
      if (fromUserGesture) unlockBrowserSpeech();
      const synth = window.speechSynthesis;
      const speakAttempt = async (
        preferSelectedVoice: boolean
      ): Promise<boolean> => {
        return await new Promise<boolean>(resolve => {
          try {
            if (signal.aborted) return resolve(false);
            synth.resume();
            if (synth.speaking || synth.pending) synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = speechLanguageCode;
            utterance.volume = narrationVolume;

            const runtimeVoices = synth.getVoices();
            const voicePool = runtimeVoices.length
              ? runtimeVoices
              : availableVoices;
            if (preferSelectedVoice) {
              const activeLanguage = (
                i18n.resolvedLanguage ??
                i18n.language ??
                "en-US"
              ).toLowerCase();
              const targetPrefixes = Array.from(
                new Set([activeLanguage, activeLanguage.split("-")[0]])
              ).filter(Boolean);
              const languageMatches = voicePool.filter(item =>
                targetPrefixes.some(prefix =>
                  item.lang.toLowerCase().startsWith(prefix)
                )
              );
              const genderKeywords = AR_GENDER_KEYWORD_MAP[selectedVoiceGender];
              const voiceByGender = languageMatches.find(item => {
                const name = `${item.name} ${item.voiceURI}`.toLowerCase();
                return genderKeywords.some(keyword => name.includes(keyword));
              });
              const fallbackByGender = voicePool.find(item => {
                const name = `${item.name} ${item.voiceURI}`.toLowerCase();
                return genderKeywords.some(keyword => name.includes(keyword));
              });
              const voice =
                voiceByGender ??
                fallbackByGender ??
                languageMatches[0] ??
                voicePool[0];
              if (voice) utterance.voice = voice;
            }

            let settled = false;
            const done = (ok: boolean) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timerId);
              signal.removeEventListener("abort", abort);
              resolve(ok);
            };

            const abort = () => {
              synth.cancel();
              done(false);
            };
            signal.addEventListener("abort", abort, { once: true });
            utterance.onstart = () => {
              if (signal.aborted) return done(false);
              setVoiceStatus(ui.narratingBrowser);
              done(true);
            };
            utterance.onend = () => done(true);
            utterance.onerror = () => done(false);
            const timerId = window.setTimeout(() => {
              done(synth.speaking || synth.pending);
            }, 2200);
            synth.speak(utterance);
          } catch {
            resolve(false);
          }
        });
      };

      const voices = await loadVoicesWithTimeout();
      if (signal.aborted) return false;
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

    const signal = getGuideSignal();
    setLocationStatus(ui.detectingLocation);
    navigator.geolocation.getCurrentPosition(
      position => {
        if (signal.aborted) return;
        const inferred = inferNearestPlace(
          position.coords.latitude,
          position.coords.longitude
        );
        if (
          !inferred ||
          !availablePlaces.some(place => place.id === inferred)
        ) {
          setLocationStatus(ui.locationNoMatch);
          return;
        }
        setSelectedPlaceId(inferred);
        setLocationStatus(ui.locationDetected);
      },
      () => {
        if (!signal.aborted) setLocationStatus(ui.locationDetectFail);
      },
      { timeout: 10000, maximumAge: 0 }
    );
  };

  const checkHealth = useCallback(async () => {
    const health = await checkOnesaHealth(ui.localGuidanceMode);
    setIsOnline(health.online);
    setOnlineStatusText(health.statusText);
  }, [ui.localGuidanceMode]);

  const queryAI = useCallback(
    async (inputPrompt?: string) => {
      const signal = getGuideSignal();
      if (signal.aborted) return;
      const trimmed = String(inputPrompt ?? "").trim();
      if (Date.now() < aiBackoffUntilRef.current) {
        const response = buildLocalGuidance(
          selectedPlace,
          cameraEnabled,
          uiLanguage
        );
        setError("");
        setVoiceStatus(ui.localGuidanceMode);
        setAnswer(response);
        return;
      }
      loadingRef.current = true;
      setLoading(true);
      setError("");
      let response = buildLocalGuidance(
        selectedPlace,
        cameraEnabled,
        uiLanguage
      );
      // Render useful guidance immediately while cloud AI is still in-flight.
      setAnswer(response);

      try {
        const defaultGuidancePrompt =
          arOverlayEnabled && cameraEnabled
            ? [
                "The camera is a local preview only. You cannot see it or determine the visitor\'s position or heading.",
                `Current destination: ${selectedPlace.name}.`,
                `Heritage context: ${selectedPlace.heritage}`,
                `History context: ${selectedPlace.history}`,
                `Historical timeline context: ${selectedPlace.historicalTimeline}`,
                `Culture context: ${selectedPlace.culture}`,
                `Cultural highlights context: ${selectedPlace.culturalHighlights}`,
                `Reply language requirement: Respond only in ${selectedLanguageLabel}.`,
                "Provide background about the selected destination. Do not claim to identify anything in the camera.",
                "Do not invent live directions or nearby hazards. Suggest marked visitor routes and official guides.",
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
            signal,
          });
          const reply = String(data?.reply ?? "").trim();
          if (!reply) throw new Error("Empty model response.");
          return reply;
        };

        let reply = "";
        try {
          if (signal.aborted) return;
          reply = await requestAI();
        } catch {
          if (signal.aborted) return;
          // Retry once before falling back to local guidance mode.
          await new Promise(resolve => window.setTimeout(resolve, 700));
          if (signal.aborted) return;
          reply = await requestAI();
        }

        if (signal.aborted) return;
        setAnswer(reply);
        setVoiceStatus("");
        setIsOnline(true);
        setOnlineStatusText("");
        aiBackoffUntilRef.current = 0;
      } catch {
        if (signal.aborted) return;
        // Graceful fallback: keep guidance flowing without a disruptive error banner.
        setError("");
        setVoiceStatus(ui.localGuidanceMode);
        void checkHealth();
        // Prevent repeated immediate upstream retries during provider instability.
        aiBackoffUntilRef.current = Date.now() + 30000;
        setAnswer(response);
      } finally {
        if (!signal.aborted) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [
      cameraEnabled,
      selectedPlace.culturalHighlights,
      selectedPlace.culture,
      selectedPlace.heritage,
      selectedPlace.historicalTimeline,
      selectedPlace.history,
      selectedPlace.name,
      arOverlayEnabled,
      checkHealth,
      selectedLanguageLabel,
      ui.localGuidanceMode,
      uiLanguage,
    ]
  );

  const transcribeWithGroq = useCallback(
    async (blob: Blob, signal: AbortSignal): Promise<string> => {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("action", "stt");
      formData.append("provider", "groq");
      const res = await fetch("/api/speech", {
        method: "POST",
        body: formData,
        signal: experienceMediaSignal(signal),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "groq stt failed");
      }
      const payload = await res.json().catch(() => ({}) as { text?: string });
      return String(payload?.text ?? "").trim();
    },
    []
  );

  const processConversation = async (blob: Blob) => {
    const signal = getGuideSignal();
    if (signal.aborted) return;
    setLoading(true);
    setVoiceStatus(ui.transcribing);
    try {
      setVoiceStatus(ui.listeningGroq);
      const text = await transcribeWithGroq(blob, signal);
      if (signal.aborted || !isConversationModeRef.current) return;
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
        signal,
      });
      if (signal.aborted || !isConversationModeRef.current) return;
      const reply = String(data?.reply ?? "").trim();
      setAnswer(
        reply || buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage)
      );
      setVoiceStatus("");
    } catch {
      if (signal.aborted || !isConversationModeRef.current) return;
      setVoiceStatus(ui.groqUnavailable);
      setAnswer(buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  const speakWithTts = useCallback(
    async (text: string, force = false) => {
      const signal = getNarrationSignal();
      if (signal.aborted || !text) return;
      const normalized = String(text).trim();
      if (!normalized) return;
      const now = Date.now();
      if (
        normalized === lastNarratedTextRef.current &&
        now - lastNarratedAtRef.current < 2200
      )
        return;

      const audio = ttsAudioRef.current;
      const cloudPlaybackActive = Boolean(
        audio &&
          !audio.paused &&
          audio.currentSrc &&
          !audio.currentSrc.startsWith("data:")
      );
      if (cloudTtsRequestInFlightRef.current || cloudPlaybackActive) {
        queuedCloudNarrationRef.current = normalized;
        return;
      }

      if (
        force &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
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
      const selectedVoiceId =
        selectedVoiceGender === "male" ? maleVoiceId : femaleVoiceId;
      cloudTtsRequestInFlightRef.current = true;
      try {
        setVoiceStatus(ui.requestingCloudNarration);
        let res = await fetch("/api/speech", {
          signal: experienceMediaSignal(signal),
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
          await new Promise(resolve => window.setTimeout(resolve, 120));
          res = await fetch("/api/tts", {
            signal: experienceMediaSignal(signal),
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
        if (signal.aborted) return;
        const effectiveMime = String(blob.type || headerMime).toLowerCase();
        if (/audio\/l16|codec=pcm/.test(effectiveMime)) {
          ttsFailureReason = `Unsupported cloud audio format: ${effectiveMime || "unknown"}`;
          throw new Error("Unsupported cloud audio format");
        }
        const playableBlob =
          !blob.type && headerMime
            ? blob.slice(0, blob.size, headerMime)
            : blob;
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
          ttsFailureReason =
            playError instanceof Error
              ? playError.message
              : "Cloud audio playback blocked";
          throw new Error("Cloud audio playback blocked");
        }
        setVoiceStatus(ui.narrating);
        lastNarratedTextRef.current = normalized;
        lastNarratedAtRef.current = Date.now();
      } catch {
        if (signal.aborted) return;
        const quotaExceeded =
          /quota_exceeded|exceeds your quota|insufficient credits|credits remaining/i.test(
            ttsFailureReason
          );
        if (ttsUnavailable) {
          console.warn(
            "[TTS] Cloud TTS request failed. Falling back to browser voice.",
            ttsFailureReason || "unknown"
          );
          setVoiceStatus(
            quotaExceeded ? ui.elevenQuotaExceeded : ui.elevenUnavailable
          );
        } else {
          console.warn(
            "[TTS] Cloud audio could not play locally. Falling back to browser voice.",
            ttsFailureReason || "unknown"
          );
          setVoiceStatus(ui.cloudBlocked);
        }
        const browserOk = await speakWithBrowserVoice(
          normalized,
          force,
          signal
        );
        if (signal.aborted) return;
        if (!browserOk && force) {
          setVoiceStatus(ui.tapToEnableNarration);
          queueNarrationRetry(normalized);
        } else if (browserOk) {
          lastNarratedTextRef.current = normalized;
          lastNarratedAtRef.current = Date.now();
        }
      } finally {
        if (!signal.aborted) {
          cloudTtsRequestInFlightRef.current = false;
          if (
            voiceNarrationEnabled &&
            arOverlayEnabled &&
            !isConversationMode
          ) {
            const activeAudio = ttsAudioRef.current;
            const cloudStillPlaying = Boolean(
              activeAudio &&
                !activeAudio.paused &&
                activeAudio.currentSrc &&
                !activeAudio.currentSrc.startsWith("data:")
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
      }
    },
    [
      arOverlayEnabled,
      isConversationMode,
      narrationVolume,
      selectedVoiceGender,
      speakWithBrowserVoice,
      queueNarrationRetry,
      ui.cloudBlocked,
      ui.elevenQuotaExceeded,
      ui.elevenUnavailable,
      ui.narrating,
      ui.requestingCloudNarration,
      ui.tapToEnableNarration,
      uiLanguage,
      unlockBrowserSpeech,
      voiceNarrationEnabled,
    ]
  );

  useEffect(() => {
    const audio = ttsAudioRef.current;
    if (!audio) return;
    const handleCloudNarrationEnd = () => {
      if (cloudTtsRequestInFlightRef.current) return;
      if (!voiceNarrationEnabled || !arOverlayEnabled || isConversationMode)
        return;
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
  }, [
    arOverlayEnabled,
    isConversationMode,
    speakWithTts,
    voiceNarrationEnabled,
  ]);

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
      ttsAudioRef.current.src = AR_SILENT_WAV_DATA_URI;
      ttsAudioRef.current.muted = false;
      ttsAudioRef.current.volume = 0.01;
      ttsAudioRef.current
        .play()
        .then(() => {
          if (!ttsAudioRef.current) return;
          ttsAudioRef.current.pause();
          ttsAudioRef.current.currentTime = 0;
        })
        .catch(() => {
          // no-op
        });
    }

    const textToRead =
      answer || buildLocalGuidance(selectedPlace, cameraEnabled, uiLanguage);
    lastNarrationTriggerAtRef.current = Date.now();
    void speakWithTts(textToRead, true);
  }, [
    answer,
    cameraEnabled,
    narrationLines.length,
    selectedPlace,
    selectedPlaceId,
    speakWithTts,
    ui.selectDestinationFirst,
    ui.voiceNarrationOffStatus,
    ui.waitingNarrationText,
    uiLanguage,
    voiceNarrationEnabled,
  ]);

  const stopRecording = useCallback(() => {
    microphone.release();
    if (!isRecordingRef.current) return;
    clearRecordingTurnTimer();
    try {
      mediaRecorder.current?.stop();
    } catch {
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      recordingStreamRef.current = null;
    }
    isRecordingRef.current = false;
    setIsRecording(false);
  }, [clearRecordingTurnTimer, microphone]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    setMicrophoneError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      isConversationModeRef.current = false;
      setIsConversationMode(false);
      setMicrophoneError(ui.micNotSupported);
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      isConversationModeRef.current = false;
      setIsConversationMode(false);
      setMicrophoneError(ui.micNotSupported);
      return;
    }
    try {
      const stream = await microphone.acquire({ audio: true });
      if (!stream) return;
      recordingStreamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = e =>
        audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        clearRecordingTurnTimer();
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        isRecordingRef.current = false;
        setIsRecording(false);
        const recordedBlob = new Blob(audioChunks.current, {
          type: mediaRecorder.current?.mimeType || "audio/webm",
        });
        if (!isConversationModeRef.current) return;
        void (async () => {
          await processConversation(recordedBlob);
          if (!isConversationModeRef.current || isRecordingRef.current) return;
          window.setTimeout(() => {
            if (!isConversationModeRef.current || isRecordingRef.current)
              return;
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
      }, AR_CONVERSATION_TURN_MS);
      isRecordingRef.current = true;
      setIsRecording(true);
      setVoiceStatus(ui.listening);
    } catch {
      clearRecordingTurnTimer();
      isRecordingRef.current = false;
      microphone.release();
      isConversationModeRef.current = false;
      setMicrophoneError(ui.micAccessDenied);
      setIsConversationMode(false);
      setIsRecording(false);
    }
  }, [
    clearRecordingTurnTimer,
    microphone,
    processConversation,
    ui.listening,
    ui.micAccessDenied,
    ui.micNotSupported,
  ]);

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
      isConversationModeRef.current = true;
      setIsConversationMode(true);
      await startRecording();
      return;
    }
    isConversationModeRef.current = false;
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
    camera.release();
    const stream = cameraStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
    setCameraEnabled(false);
    setCameraStatus(ui.cameraTurnOnHint);
  }, [camera, ui.cameraTurnOnHint]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus(ui.cameraNotSupported);
      return;
    }
    try {
      const stream = await camera.acquire({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (!stream) return;
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setCameraEnabled(true);
      setCameraStatus(ui.cameraOnStatus);
      void queryAI();
      // Refresh AR guidance while camera mode is active.
      if (guidanceIntervalRef.current !== null)
        window.clearInterval(guidanceIntervalRef.current);
      guidanceIntervalRef.current = window.setInterval(() => {
        void queryAI();
      }, 45000);
    } catch {
      setCameraStatus(ui.cameraAccessFail);
      setCameraEnabled(false);
    }
  }, [
    camera,
    queryAI,
    ui.cameraAccessFail,
    ui.cameraNotSupported,
    ui.cameraOnStatus,
  ]);

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

  useEffect(() => {
    isConversationModeRef.current = isConversationMode;
  }, [isConversationMode]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    // Speak only when overlay + voice narration are enabled and there is content.
    if (!selectedPlaceId || !narrationLines.length) return;
    if (
      !arOverlayEnabled ||
      !voiceNarrationEnabled ||
      !answer ||
      isConversationMode
    )
      return;
    if (Date.now() - lastNarrationTriggerAtRef.current < 1800) return;
    void speakWithTts(answer);
  }, [
    answer,
    arOverlayEnabled,
    voiceNarrationEnabled,
    isConversationMode,
    narrationLines.length,
    selectedPlaceId,
    speakWithTts,
  ]);

  useEffect(() => {
    if (voiceNarrationEnabled) return;
    cancelNarration();
    narrationRetryCleanupRef.current?.();
    pendingNarrationRetryRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    queuedCloudNarrationRef.current = null;
    cloudTtsRequestInFlightRef.current = false;
  }, [voiceNarrationEnabled, cancelNarration]);

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
      isConversationModeRef.current = false;
      narrationRetryCleanupRef.current?.();
      pendingNarrationRetryRef.current = null;
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
        cameraStreamRef.current.getTracks().forEach(track => track.stop());
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
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      recordingStreamRef.current = null;
    };
  }, [clearRecordingTurnTimer]);

  useEffect(() => {
    queuedCloudNarrationRef.current = null;
    narrationRetryCleanupRef.current?.();
    pendingNarrationRetryRef.current = null;
    cloudTtsRequestInFlightRef.current = false;
    ttsAudioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, [experienceContext, selectedVoiceGender]);

  useEffect(() => {
    if (!selectedPlaceId || isConversationMode) return;
    void queryAI();
  }, [
    selectedPlaceId,
    i18n.language,
    i18n.resolvedLanguage,
    isConversationMode,
    queryAI,
  ]);

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
    window.addEventListener("pointerdown", onFirstInteraction, {
      once: true,
      passive: true,
      capture: true,
    });
    return () =>
      window.removeEventListener("pointerdown", onFirstInteraction, true);
  }, [unlockBrowserSpeech]);

  useEffect(() => {
    if (cameraEnabled || prefersReducedMotion) return;
    const timerId = window.setInterval(() => {
      setFallbackImageIndex(
        current => (current + 1) % selectedPreviewImages.length
      );
    }, 4000);
    return () => window.clearInterval(timerId);
  }, [cameraEnabled, selectedPreviewImages.length, prefersReducedMotion]);

  useEffect(() => {
    setFallbackImageIndex(0);
  }, [selectedPlaceId]);

  return (
    <Layout>
      <p role="status" aria-live="polite" className="sr-only">
        {loading ? ui.guideThinking : isOnline ? "" : onlineStatusText}
      </p>
      <audio ref={ttsAudioRef} preload="auto" style={{ display: "none" }} />
      {/* Page shell */}
      <section className="pt-28 pb-15 md:pt-32 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <Link href="/tourism" className={backToTourismButtonClass}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backToTourismLabel}
          </Link>
          <div className="content-panel mb-6 max-w-4xl p-5 md:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zim-gold">
              {t("tourism.ar.seo.badge", { defaultValue: "Onesa AI Tourism" })}
            </p>
            <h1 className="page-title mt-3">
              {t("tourism.ar.seo.title", {
                defaultValue: "Zimbabwe Augmented Tourism Guide",
              })}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/75 md:text-base">
              {t("tourism.ar.seo.description", {
                defaultValue:
                  "Explore Zimbabwe destinations with text and narrated guidance. Camera previews stay on your device; guidance uses your selected destination. This is not live navigation.",
              })}
            </p>
          </div>
          {/* Main two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left rail: location controls + narration transcript */}
            <div className="lg:col-span-3 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <Button
                onClick={handleUseMyLocation}
                disabled={!arFeatures.geolocation}
                className="w-full bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full"
              >
                <LocateFixed className="h-4 w-4 mr-2" />
                {ui.useMyLocation}
              </Button>
              <div>
                <select
                  id="aug-place"
                  aria-label={ui.selectDestination}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zim-gold/60"
                  value={selectedPlaceId}
                  onChange={event => {
                    const nextId = event.target.value;
                    if (!isArPlaceId(nextId)) return;
                    if (!selectedPlaceId && nextId) {
                      setIsGlobeZoomTransitioning(true);
                      if (globeTransitionTimerRef.current !== null) {
                        window.clearTimeout(globeTransitionTimerRef.current);
                      }
                      globeTransitionTimerRef.current = window.setTimeout(
                        () => {
                          setIsGlobeZoomTransitioning(false);
                          globeTransitionTimerRef.current = null;
                        },
                        2200
                      );
                    }
                    setSelectedPlaceId(nextId);
                  }}
                >
                  <option value="" disabled>
                    {ui.selectDestination}
                  </option>
                  {availablePlaces.map(place => (
                    <option key={place.id} value={place.id}>
                      {place.name}
                    </option>
                  ))}
                </select>
              </div>
              {locationStatus ? (
                <p className="text-xs text-white/70 leading-relaxed">
                  {locationStatus}
                </p>
              ) : null}
              <div className="mt-2 border-t border-white/10 pt-3">
                <p className="text-[10px] uppercase tracking-widest font-black text-zim-gold mb-1">
                  {selectedPlaceId ? ui.narration : ui.selectLocation}
                </p>
                {!selectedPlaceId ? null : narrationLines.length > 0 ? (
                  <div className="space-y-1.5">
                    {narrationLines.map((line, index) => (
                      <p
                        key={`${line}-${index}`}
                        className="text-sm text-white/75 leading-relaxed"
                      >
                        {line.includes(":") ? (
                          <>
                            <span className="font-black">
                              {line.split(":")[0]}:
                            </span>{" "}
                            {line.split(":").slice(1).join(":").trim()}
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
                {error ? (
                  <p className="text-[11px] text-red-300 mt-2 leading-relaxed">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Right panel: AR viewport/camera + contextual voice controls */}
            <div className="lg:col-span-9 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 pb-2 space-y-5 flex flex-col">
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                {/* Camera controls row */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => void handleCameraToggle()}
                    disabled={!arOverlayEnabled || !arFeatures.cameraGuide}
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
                      ref={video => {
                        cameraVideoRef.current = video;
                        if (video) video.srcObject = cameraStreamRef.current;
                      }}
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

              <div
                className={`${voiceNarrationEnabled ? "mt-auto" : ""} space-y-3`}
              >
                <div className="rounded-xl border border-zim-gold/20 bg-zim-gold/5 p-3 mt-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-2.5 w-2.5 text-zim-gold" />
                      <p className="text-[9px] uppercase tracking-widest font-black text-zim-gold">
                        {ui.currentContext}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={() => void handleConversationToggle()}
                        disabled={
                          !arFeatures.conversation ||
                          !arFeatures.audioTranscription
                        }
                        variant="outline"
                        aria-pressed={isConversationMode}
                        className={`min-h-11 px-3 font-black uppercase tracking-widest text-[10px] leading-none rounded-full ${
                          isConversationMode
                            ? "bg-zim-gold text-zim-black border border-zim-gold hover:bg-white"
                            : "border border-white/20 text-white hover:bg-white hover:text-zim-black"
                        }`}
                      >
                        {isConversationMode
                          ? ui.conversationOn
                          : ui.conversationOff}
                      </Button>
                      <Button
                        onClick={handleVoiceNarrationToggle}
                        disabled={!arFeatures.voiceNarration}
                        variant="outline"
                        className="min-h-11 px-3 border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[10px] leading-none rounded-full"
                      >
                        {voiceNarrationEnabled
                          ? ui.voiceNarrationOn
                          : ui.voiceNarrationOff}
                      </Button>
                      {voiceNarrationEnabled ? (
                        <div className="min-h-11 px-3 border border-white/20 text-white rounded-full flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white">
                            {ui.voice}
                          </span>
                          <select
                            id="voice-gender-inline"
                            aria-label={ui.voice}
                            value={selectedVoiceGender}
                            onChange={event =>
                              setSelectedVoiceGender(
                                event.target.value as "male" | "female"
                              )
                            }
                            className="bg-transparent text-[8px] font-black uppercase tracking-widest text-zim-gold focus:outline-none"
                          >
                            <option
                              className="text-zim-gold bg-slate-950"
                              value="male"
                            >
                              {ui.male}
                            </option>
                            <option
                              className="text-zim-gold bg-slate-950"
                              value="female"
                            >
                              {ui.female}
                            </option>
                          </select>
                        </div>
                      ) : null}
                      {isConversationMode ? (
                        <Button
                          onClick={toggleRecording}
                          disabled={!arFeatures.audioTranscription}
                          aria-pressed={isRecording}
                          className={`min-h-11 px-3 font-black uppercase tracking-widest text-[10px] leading-none rounded-full border ${
                            isRecording
                              ? "bg-red-500 text-white border-red-400 hover:bg-red-400"
                              : "border-white/20 text-white hover:bg-white hover:text-zim-black"
                          }`}
                        >
                          {isRecording ? (
                            <Mic className="h-3 w-3 mr-1" />
                          ) : (
                            <Mic className="h-3 w-3 mr-1" />
                          )}
                          {isRecording ? ui.voiceInputOn : ui.voiceInput}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 border-t border-white/15" />
                  {selectedPlaceId ? (
                    <>
                      <h2 className="!text-lg font-black text-white leading-tight mt-2">
                        {selectedPlace.name}
                      </h2>
                      <p className="text-[11px] text-white/70 mt-1 leading-snug">
                        {selectedPlace.heritage}
                      </p>
                    </>
                  ) : null}
                </div>

                {microphoneError ? (
                  <p role="alert" className="text-sm text-red-300">
                    {microphoneError}
                  </p>
                ) : null}
                <div className="space-y-0">
                  <p className="m-0 text-[11px] text-white/70 leading-relaxed">
                    {ui.arOverlayVoice}{" "}
                    {arOverlayEnabled && voiceNarrationEnabled
                      ? ui.enabled
                      : ui.disabled}
                    . {ui.cameraLabel}{" "}
                    {cameraEnabled ? ui.cameraOnSummary : ui.cameraOffSummary}
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
