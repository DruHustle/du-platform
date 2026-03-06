import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture, Points, PointMaterial, PositionalAudio } from "@react-three/drei";
import { XR, createXRStore, useXR } from "@react-three/xr";
import { VRFloatingControls } from "@/modules/ai/vr/VRFloatingControls";
import { animateCameraFocus } from "@/modules/ai/vr/interactionManager";
import { PoiBillboard } from "@/modules/ai/vr/poiSystem";
import * as THREE from "three";
import { ACESFilmicToneMapping, Vector3 } from "three";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CircleHelp,
  MapPin,
  Maximize,
  Minimize,
  MessageSquare,
  RotateCcw,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { sendOnesaChatMessage } from "./OnesaAI";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

const xrStore = createXRStore();
const LazyZimbabweInteractiveGlobe = lazy(() => import("@/components/ZimbabweInteractiveGlobe"));

type Hotspot = {
  targetId: string;
  label: string;
  position: [number, number, number];
};

type PointOfInterest = {
  id: string;
  label: string;
  position: [number, number, number];
};

type VirtualWalkStage = {
  id: string;
  title: string;
  image: string;
  caption: string;
  hotspots?: Hotspot[];
  pointsOfInterest?: PointOfInterest[];
};

type VirtualDestination = {
  id: string;
  name: string;
  image: string;
  vibe?: string;
  summary: string;
  experiences?: string[];
  coordinates: string;
  locationHighlights?: string[];
  walkStages: VirtualWalkStage[];
};

function formatNarrationLines(text: string): string[] {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

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

function buildPostIntroStartGuidance(language: UiLanguage, stage: VirtualWalkStage): string {
  const hotspotLabel = stage.hotspots?.[0]?.label;
  const poiLabel = stage.pointsOfInterest?.[0]?.label;
  if (language === "sn") {
    return [
      "Nhanganyaya yapera. Tangai demo zvino.",
      hotspotLabel
        ? `Dzvanya mhete yegoridhe ine zita rekuti ${hotspotLabel} kuti mufambe kuenda kune inotevera stage.`
        : "Dzvanya mhete dzegoridhe kuti mufambe kuenda kune inotevera stage.",
      poiLabel
        ? `Wobva wadzvanya point rekuti ${poiLabel} uye chiratidzo chefaira kuti muwane ruzivo rwenzvimbo.`
        : "Wobva wadzvanya point yebhuruu nechiratidzo chefaira kuti muwane ruzivo rwenzvimbo.",
    ].join(" ");
  }
  if (language === "de") {
    return [
      "Die Einfuehrung ist beendet. Starten Sie jetzt die Demo.",
      hotspotLabel
        ? `Klicken Sie auf den goldenen Ring ${hotspotLabel}, um zur naechsten Szene zu wechseln.`
        : "Klicken Sie auf die goldenen Ringe, um zur naechsten Szene zu wechseln.",
      poiLabel
        ? `Klicken Sie danach auf den Punkt ${poiLabel} und auf das Dokument-Symbol fuer Ortsinformationen.`
        : "Klicken Sie danach auf einen blauen Punkt und auf das Dokument-Symbol fuer Ortsinformationen.",
    ].join(" ");
  }
  if (language === "nd") {
    return [
      "Isingeniso sesiphelile. Qalisa idemo khathesi.",
      hotspotLabel
        ? `Chofoza iringi yegolide ethi ${hotspotLabel} ukuze uye esigabeni esilandelayo.`
        : "Chofoza amaringi egolide ukuze uye esigabeni esilandelayo.",
      poiLabel
        ? `Bese uchofoza iphoyinti ethi ${poiLabel} kanye lesithonjana sedokhumenti ukuze uthole ulwazi lwendawo.`
        : "Bese uchofoza iphoyinti eliluhlaza kanye lesithonjana sedokhumenti ukuze uthole ulwazi lwendawo.",
    ].join(" ");
  }
  return [
    "The intro is complete. Start the demo now.",
    hotspotLabel
      ? `Click the gold movement ring labeled ${hotspotLabel} to go to the next scene.`
      : "Click the gold movement rings to go to the next scene.",
    poiLabel
      ? `Then click the point named ${poiLabel} and use the document icon for place information.`
      : "Then click a blue point and use the document icon for place information.",
  ].join(" ");
}

function buildNarrationButtonIntro(language: UiLanguage, destinationName: string, destinationSummary: string): string {
  const summaryLines = formatNarrationLines(destinationSummary);
  const summarySnippet = summaryLines.slice(0, 2).join(" ").trim();
  const fallbackSummary =
    summarySnippet || `${destinationName} is ready for an immersive virtual walkthrough experience.`;

  if (language === "sn") {
    return [
      "Mhoro, ndiri Onesa, gwara renyu reVR.",
      `Mauya ku ${destinationName}.`,
      fallbackSummary,
      "Kana magadzirira, dzvanyai mubatise bhatani re Push To Talk kuti mutange hurukuro neni.",
    ].join(" ");
  }

  if (language === "de") {
    return [
      "Hallo, ich bin Onesa, Ihr virtueller Reisefuehrer.",
      `Willkommen in ${destinationName}.`,
      fallbackSummary,
      "Wenn Sie bereit sind, halten Sie die Push-To-Talk-Taste gedrueckt, um ein Gespraech mit mir zu starten.",
    ].join(" ");
  }

  if (language === "nd") {
    return [
      "Sawubona, ngingu Onesa, umhlahlandlela wakho we VR.",
      `Wamukelekile e ${destinationName}.`,
      fallbackSummary,
      "Nxa usulungile, bamba ibhathini le Push To Talk ukuze uqale ingxoxo lami.",
    ].join(" ");
  }

  return [
    "Hello, I am Onesa, your virtual guide.",
    `Welcome to ${destinationName}.`,
    fallbackSummary,
    "When you are ready, press and hold the Push To Talk button to start a conversation with me.",
  ].join(" ");
}

const VR_UI_COPY: Record<UiLanguage, Partial<Record<string, string>>> = {
  en: {
    systemReady: "System Ready",
    guideThinking: "Guide is thinking...",
    requestingCloudNarration: "Requesting cloud narration...",
    transcribing: "Transcribing...",
    whisperFallback: "Speech transcription unavailable. Falling back to Onesa AI...",
    onesaFallback: "Using Onesa AI fallback.",
    localGuidance: "Using local guidance mode.",
    listening: "Listening...",
    micNotSupported: "Microphone not supported",
    micDenied: "Microphone access denied",
    noAudio: "Audio unavailable. Using browser voice.",
    cloudQuotaExceeded: "Cloud TTS quota exceeded. Top up credits to keep cloud narration on.",
    cloudFailed: "Cloud TTS unavailable. Using browser voice.",
    browserBlocked: "Browser voice blocked. Tap Narration again.",
    selectDestination: "Select destination",
    narration: "Narration",
    selectLocation: "Select location",
    narrationPending: "Narration will appear here once AI guidance is generated.",
    conversationEnabled: "enabled",
    conversationDisabled: "disabled",
    ambientOn: "on",
    ambientOff: "off",
    conversation: "Conversation",
    sttText: "You",
    response: "Response",
    sttUnavailable: "Could not transcribe audio.",
    pushToTalk: "Push To Talk",
    releaseToSend: "Release To Send",
    holdToSpeakHint: "Hold the talk button to speak.",
    ambient: "Ambient sound",
    currentContext: "Current Context",
    conversationOn: "Conversation: On",
    conversationOff: "Conversation: Off",
    ambientOnBadge: "Ambient: On",
    ambientOffBadge: "Ambient: Off",
    narrationOn: "NARRATION: On",
    narrationOff: "NARRATION: Off",
    vrStartNarration: "Start Narration",
    vrStartConversation: "Start Conversation",
    voice: "Voice",
    male: "Male",
    female: "Female",
    minimize: "Minimize",
    fullscreen: "Fullscreen",
    autoOn: "Auto: On",
    autoOff: "Auto: Off",
    walkthrough: "Walkthrough",
    close: "Close",
    highlights: "Highlights",
    loadingPoi: "Loading POI information...",
    stageLabel: "Stage",
    pointOfInterest: "Point of interest",
    nearbyHighlights: "Nearby highlights",
    relatedHighlights: "Related highlights",
    enterFullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetView: "Reset view",
    toggleAutoRotate: "Toggle auto rotate",
    showPlaceInformation: "Show place information",
    lookUp: "Look up",
    lookLeft: "Look left",
    lookRight: "Look right",
    lookDown: "Look down",
    muteAmbientSound: "Mute ambient sound",
    enableAmbientSound: "Enable ambient sound",
    disableTts: "Disable text-to-speech",
    enableTts: "Enable text-to-speech",
  },
  sn: {
    systemReady: "System yagadzirira",
    guideThinking: "Gwara riri kufunga...",
    requestingCloudNarration: "Kukumbira rondedzero yegore...",
    transcribing: "Tiri kushandura izwi kuita chinyorwa...",
    whisperFallback: "Kushandura izwi hakusi kuwanikwa. Tiri kushandisa Onesa AI...",
    onesaFallback: "Kushandisa Onesa AI fallback.",
    localGuidance: "Kushandisa gwara remuno.",
    listening: "Tiri kuteerera...",
    micNotSupported: "Maikorofoni haisi kutsigirwa",
    micDenied: "Kupinda kumaikorofoni kwarambwa",
    noAudio: "Audio haisi kuwanikwa. Kushandisa izwi rebrowser.",
    cloudQuotaExceeded: "Makiredhiti eCloud TTS apera. Wedzera makiredhiti kuti cloud narration irambe iripo.",
    cloudFailed: "Cloud TTS haisi kuwanikwa. Kushandisa izwi rebrowser.",
    browserBlocked: "Izwi rebrowser rarambidzwa. Bata Narration zvakare.",
    selectDestination: "Sarudza nzvimbo",
    narration: "Rondedzero",
    selectLocation: "Sarudza nzvimbo",
    narrationPending: "Rondedzero ichaonekwa pano kana AI yapedza kugadzira gwara.",
    conversationEnabled: "yabatidzwa",
    conversationDisabled: "yadzimwa",
    ambientOn: "yabatidzwa",
    ambientOff: "yadzimwa",
    conversation: "Hurukuro",
    sttText: "Iwe",
    response: "Mhinduro",
    sttUnavailable: "Hatina kukwanisa kushandura izwi kuita chinyorwa.",
    pushToTalk: "Bata Utaure",
    releaseToSend: "Sunungura Kutumira",
    holdToSpeakHint: "Bata bhatani kuti utaure.",
    ambient: "Ruzha rwenzvimbo",
    currentContext: "Mamiro Azvino",
    conversationOn: "Hurukuro: Yabatidzwa",
    conversationOff: "Hurukuro: Yadzimwa",
    ambientOnBadge: "Ambient: Yabatidzwa",
    ambientOffBadge: "Ambient: Yadzimwa",
    narrationOn: "RONDEDZERO: Yabatidzwa",
    narrationOff: "RONDEDZERO: Yadzimwa",
    vrStartNarration: "Tanga Rondedzero",
    vrStartConversation: "Tanga Hurukuro",
    voice: "Izwi",
    male: "Murume",
    female: "Mukadzi",
    minimize: "Deredza",
    fullscreen: "Sikirini Yakazara",
    autoOn: "Auto: Yabatidzwa",
    autoOff: "Auto: Yadzimwa",
    walkthrough: "Rwendo",
    close: "Vhara",
    highlights: "Zvinoshamisa",
    loadingPoi: "Tiri kurodha ruzivo rwePOI...",
    stageLabel: "Chikamu",
    pointOfInterest: "Nzvimbo inokosha",
    nearbyHighlights: "Zvimwe zviri pedyo",
    relatedHighlights: "Zvimwe zvinoenderana",
    enterFullscreen: "Pinda fullscreen",
    exitFullscreen: "Buda fullscreen",
    zoomIn: "Swedera pedyo",
    zoomOut: "Svedera kure",
    resetView: "Dzoreredza muono",
    toggleAutoRotate: "Batidza/dzima auto rotate",
    showPlaceInformation: "Ratidza ruzivo rwenzvimbo",
    lookUp: "Tarisa kumusoro",
    lookLeft: "Tarisa kuruboshwe",
    lookRight: "Tarisa kurudyi",
    lookDown: "Tarisa pasi",
    muteAmbientSound: "Dzima ambient sound",
    enableAmbientSound: "Batidza ambient sound",
    disableTts: "Dzima text-to-speech",
    enableTts: "Batidza text-to-speech",
  },
  nd: {},
  de: {},
};

const CONVERSATION_TURN_MS = 7000;

// --- 3D SUB-COMPONENTS ---

function VRScene({
  stage,
  currentStageIndex,
  stageOrder,
  onNavigate,
  onNavigatePrevious,
  onPointOfInterestClick,
  onPointOfInterestInfoClick,
  hiddenPoiInfoIconIds,
  ambientAudioEnabled,
  narrationButtonLabel,
  conversationButtonLabel,
  narrationActive,
  conversationActive,
  onToggleNarration,
  onToggleConversation,
  onLandmarkClick,
}: {
  stage: VirtualWalkStage;
  currentStageIndex: number;
  stageOrder: string[];
  onNavigate: (targetId: string) => void;
  onNavigatePrevious: () => void;
  onPointOfInterestClick: (poiLabel: string, poiPosition: [number, number, number]) => void;
  onPointOfInterestInfoClick: (poiId: string, poiLabel: string) => void;
  hiddenPoiInfoIconIds: ReadonlySet<string>;
  ambientAudioEnabled: boolean;
  narrationButtonLabel: string;
  conversationButtonLabel: string;
  narrationActive: boolean;
  conversationActive: boolean;
  onToggleNarration: () => void;
  onToggleConversation: () => void;
  onLandmarkClick: (position: [number, number, number]) => void;
}) {
  const { scene } = useThree();
  const ambientAudioRef = useRef<THREE.PositionalAudio>(null);
  const isInVrSession = useXR((state) => state.mode === "immersive-vr");
  const [showVrHint, setShowVrHint] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const guideOrbCooldownRef = useRef(0);

  const registerVrInteraction = useCallback(() => {
    setInteractionCount((count) => count + 1);
    setShowVrHint(false);
  }, []);

  const hotspotBuckets = useMemo(() => {
    const byId = new Map(stageOrder.map((id, idx) => [id, idx]));
    const all = stage.hotspots ?? [];
    const forward = all.filter((hs) => {
      const targetIdx = byId.get(hs.targetId);
      return typeof targetIdx === "number" ? targetIdx > currentStageIndex : !/back/i.test(hs.label);
    });
    const backward = all.filter((hs) => {
      const targetIdx = byId.get(hs.targetId);
      return typeof targetIdx === "number" ? targetIdx < currentStageIndex : /back/i.test(hs.label);
    });
    return { forward, backward };
  }, [stage.hotspots, stageOrder, currentStageIndex]);
  
  // FIX: Type assertion to handle the TypeScript 'MappedTextureType' error
  const texture = useTexture(stage.image) as THREE.Texture;
  
  useEffect(() => {
    if (texture && texture instanceof THREE.Texture) {
      // Correct mapping for 360 images
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 16;
      
      scene.background = texture;
      scene.environment = texture;
    }
  }, [texture, scene]);

  useEffect(() => {
    if (!isInVrSession) {
      setShowVrHint(false);
      return;
    }
    setShowVrHint(true);
    const timer = window.setTimeout(() => {
      setShowVrHint(false);
    }, 11000);
    return () => window.clearTimeout(timer);
  }, [isInVrSession, stage.id]);

  useEffect(() => {
    const audioNode = ambientAudioRef.current;
    if (!audioNode) return;
    if (ambientAudioEnabled) {
      if (!audioNode.isPlaying) {
        audioNode.play();
      }
      audioNode.setVolume(1);
    } else if (audioNode.isPlaying) {
      audioNode.pause();
    }
  }, [ambientAudioEnabled]);

  return (
    <group>
      <PositionalAudio
        ref={ambientAudioRef as any}
        url="/sounds/nature_ambient.mp3"
        loop
        autoplay={false}
        distance={60}
      />
      <AtmosphericParticles />
      {hotspotBuckets.forward.map((hs) => (
        <ForwardWalkRing
          key={`forward-${hs.targetId}`}
          position={hs.position}
          onClick={() => {
            registerVrInteraction();
            onNavigate(hs.targetId);
          }}
        />
      ))}
      {hotspotBuckets.backward.map((hs) => (
        <BackwardWalkRing
          key={`back-${hs.targetId}`}
          position={hs.position}
          onClick={() => {
            registerVrInteraction();
            onNavigatePrevious();
          }}
        />
      ))}
      {stage.pointsOfInterest?.map((poi) => (
        <InterestRing
          key={poi.id}
          position={poi.position}
          label={poi.label}
          onClick={() => {
            registerVrInteraction();
            onPointOfInterestClick(poi.label, poi.position);
          }}
          onInfoClick={() => {
            registerVrInteraction();
            onPointOfInterestInfoClick(poi.id, poi.label);
          }}
          infoHidden={hiddenPoiInfoIconIds.has(poi.id)}
        />
      ))}
      <InteractiveLandmark
        position={[0, -0.95, -4.25]}
        onClick={(position) => {
          registerVrInteraction();
          onLandmarkClick(position);
        }}
      />
      <VRGuideOrb
        visible={isInVrSession}
        onActivate={() => {
          const now = performance.now();
          if (now - guideOrbCooldownRef.current < 1400) return;
          guideOrbCooldownRef.current = now;
          registerVrInteraction();
          const primaryPoi = stage.pointsOfInterest?.[0];
          if (primaryPoi) {
            onPointOfInterestClick(primaryPoi.label, primaryPoi.position);
            return;
          }
          onLandmarkClick([0, -0.95, -4.25]);
        }}
      />
      <VRSessionHintPanel
        visible={isInVrSession && showVrHint}
        stageTitle={stage.title}
        interactionCount={interactionCount}
      />
      <VRFloatingControls
        visible={isInVrSession}
        narrationLabel={narrationButtonLabel}
        conversationLabel={conversationButtonLabel}
        narrationActive={narrationActive}
        conversationActive={conversationActive}
        onToggleNarration={() => {
          registerVrInteraction();
          onToggleNarration();
        }}
        onToggleConversation={() => {
          registerVrInteraction();
          onToggleConversation();
        }}
      />
    </group>
  );
}

function createVrHintTexture(stageTitle: string, interactionCount: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bg.addColorStop(0, "rgba(8,14,30,0.92)");
  bg.addColorStop(1, "rgba(23,37,60,0.9)");
  ctx.fillStyle = bg;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 6;
  const radius = 42;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(canvas.width - radius, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
  ctx.lineTo(canvas.width, canvas.height - radius);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
  ctx.lineTo(radius, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(250,204,21,0.98)";
  ctx.font = "900 42px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VR GUIDE", canvas.width * 0.5, 72);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`Stage: ${stageTitle}`, canvas.width * 0.5, 142);

  ctx.font = "600 30px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Tap hotspots, POI rings, or the guide orb to explore.", canvas.width * 0.5, 198);

  ctx.fillStyle = "rgba(148,163,184,0.95)";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(`Interactions this stage: ${interactionCount}`, canvas.width * 0.5, 252);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function VRSessionHintPanel({
  visible,
  stageTitle,
  interactionCount,
}: {
  visible: boolean;
  stageTitle: string;
  interactionCount: number;
}) {
  const { camera } = useThree();
  const panelRef = useRef<THREE.Mesh>(null);
  const forwardRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3());
  const texture = useMemo(() => createVrHintTexture(stageTitle, interactionCount), [stageTitle, interactionCount]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((_, delta) => {
    if (!panelRef.current || !visible) return;
    forwardRef.current.set(0, 0.2, -1.55).applyQuaternion(camera.quaternion);
    targetPositionRef.current.copy(camera.position).add(forwardRef.current);
    panelRef.current.position.lerp(targetPositionRef.current, Math.min(1, delta * 8));
    panelRef.current.quaternion.slerp(camera.quaternion, Math.min(1, delta * 10));
  });

  if (!visible) return null;

  return (
    <mesh ref={panelRef} renderOrder={130}>
      <planeGeometry args={[1.18, 0.37]} />
      <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
}

function VRGuideOrb({
  visible,
  onActivate,
}: {
  visible: boolean;
  onActivate: () => void;
}) {
  const { camera } = useThree();
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const forwardRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!groupRef.current || !visible) return;
    const t = state.clock.elapsedTime;
    forwardRef.current.set(0.72, -0.34, -1.42).applyQuaternion(camera.quaternion);
    targetPositionRef.current.copy(camera.position).add(forwardRef.current);
    targetPositionRef.current.y += Math.sin(t * 2.1) * 0.025;
    groupRef.current.position.lerp(targetPositionRef.current, Math.min(1, delta * 10));
    groupRef.current.quaternion.slerp(camera.quaternion, Math.min(1, delta * 10));

    if (orbRef.current) {
      const targetScale = pressed ? 0.92 : hovered ? 1.12 : 1;
      const s = THREE.MathUtils.lerp(orbRef.current.scale.x, targetScale, Math.min(1, delta * 12));
      orbRef.current.scale.setScalar(s);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.4;
      const pulse = hovered ? 1.22 : 1.08 + Math.sin(t * 3.5) * 0.08;
      ringRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.085, 0.008, 18, 44]} />
        <meshBasicMaterial color={hovered ? "#facc15" : "#93c5fd"} transparent opacity={0.9} />
      </mesh>
      <mesh
        ref={orbRef}
        onClick={onActivate}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => {
          setHovered(false);
          setPressed(false);
        }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
      >
        <sphereGeometry args={[0.052, 28, 28]} />
        <meshStandardMaterial
          color={hovered ? "#fef3c7" : "#f8fafc"}
          emissive={hovered ? "#7c5a00" : "#1d4ed8"}
          emissiveIntensity={hovered ? 0.95 : 0.45}
          metalness={0.25}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function ForwardWalkRing({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
}) {
  const { camera } = useThree();
  const ringRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const hitRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const clickPulseRef = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    clickPulseRef.current = Math.max(0, clickPulseRef.current - delta * 3.5);
    const hoverBoost = hovered ? 0.1 : 0;
    const clickBoost = clickPulseRef.current * 0.25;
    if (ringRef.current) {
      ringRef.current.lookAt(camera.position);
      const s = 1 + Math.sin(t * 2.4) * 0.08 + hoverBoost + clickBoost;
      ringRef.current.scale.set(s, s, s);
    }
    if (haloRef.current) {
      haloRef.current.lookAt(camera.position);
      const s = 1.08 + Math.sin(t * 1.6) * 0.1 + hoverBoost * 0.6 + clickBoost * 0.8;
      haloRef.current.scale.set(s, s, s);
    }
    if (hitRef.current) {
      hitRef.current.lookAt(camera.position);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <ringGeometry args={[0.28, 0.4, 48]} />
        <meshBasicMaterial color={hovered ? "#facc15" : "#d4af37"} transparent opacity={hovered ? 0.45 : 0.3} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.2, 0.26, 48]} />
        <meshBasicMaterial color={hovered ? "#fde047" : "#facc15"} transparent opacity={hovered ? 1 : 0.92} />
      </mesh>

      {/* Fused control: ring + up-arrow as one in-scene marker */}
      <group>
        <mesh position={[0, 0.055, 0]}>
          <coneGeometry args={[0.05, 0.095, 22]} />
          <meshBasicMaterial color="#fff6c2" transparent opacity={0.98} />
        </mesh>
        <mesh position={[0, -0.005, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.07, 16]} />
          <meshBasicMaterial color="#fff6c2" transparent opacity={0.95} />
        </mesh>
      </group>

      <mesh
        ref={hitRef}
        onClick={() => {
          clickPulseRef.current = 0.24;
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[0.17, 40]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function BackwardWalkRing({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
}) {
  const { camera } = useThree();
  const ringRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const hitRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const clickPulseRef = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    clickPulseRef.current = Math.max(0, clickPulseRef.current - delta * 3.5);
    const hoverBoost = hovered ? 0.1 : 0;
    const clickBoost = clickPulseRef.current * 0.25;
    if (ringRef.current) {
      ringRef.current.lookAt(camera.position);
      const s = 1 + Math.sin(t * 2.2) * 0.08 + hoverBoost + clickBoost;
      ringRef.current.scale.set(s, s, s);
    }
    if (haloRef.current) {
      haloRef.current.lookAt(camera.position);
      const s = 1.08 + Math.sin(t * 1.5) * 0.1 + hoverBoost * 0.6 + clickBoost * 0.8;
      haloRef.current.scale.set(s, s, s);
    }
    if (hitRef.current) {
      hitRef.current.lookAt(camera.position);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <ringGeometry args={[0.28, 0.4, 48]} />
        <meshBasicMaterial color={hovered ? "#93c5fd" : "#60a5fa"} transparent opacity={hovered ? 0.45 : 0.28} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.2, 0.26, 48]} />
        <meshBasicMaterial color={hovered ? "#dbeafe" : "#93c5fd"} transparent opacity={hovered ? 1 : 0.9} />
      </mesh>

      <group>
        <mesh position={[0, -0.055, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.05, 0.095, 22]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.98} />
        </mesh>
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.07, 16]} />
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.95} />
        </mesh>
      </group>

      <mesh
        ref={hitRef}
        onClick={() => {
          clickPulseRef.current = 0.24;
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[0.17, 40]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function InteractiveLandmark({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: (position: [number, number, number]) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const clickPulseRef = useRef(0);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    clickPulseRef.current = Math.max(0, clickPulseRef.current - delta * 3);
    const t = state.clock.elapsedTime;
    const floatOffset = Math.sin(t * 1.2) * 0.03;
    const hoverScale = hovered ? 1.08 : 1;
    const clickScale = 1 + clickPulseRef.current * 0.22;
    const scale = hoverScale * clickScale;

    groupRef.current.position.set(position[0], position[1] + floatOffset, position[2]);
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.08;
    groupRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={() => {
        clickPulseRef.current = 0.28;
        onClick(position);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.36, 0.36, 0.36]} />
        <meshStandardMaterial
          color={hovered ? "#facc15" : "#94a3b8"}
          emissive={hovered ? "#7c5a00" : "#111827"}
          emissiveIntensity={hovered ? 0.75 : 0.28}
          metalness={0.25}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <coneGeometry args={[0.24, 0.2, 4]} />
        <meshStandardMaterial
          color={hovered ? "#fde68a" : "#e2e8f0"}
          emissive={hovered ? "#8a6500" : "#0f172a"}
          emissiveIntensity={hovered ? 0.55 : 0.18}
          metalness={0.1}
          roughness={0.55}
        />
      </mesh>
    </group>
  );
}

function GazeHotspot({
  position,
  onClick,
}: {
  position: [number, number, number];
  onClick: () => void;
}) {
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef(0);
  const arrowGroupRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const worldPos = new Vector3(...position);
    const camDir = new Vector3();
    camera.getWorldDirection(camDir);
    const toPoint = worldPos.sub(camera.position).normalize();
    const hit = camDir.dot(toPoint) > 0.994;
    const t = state.clock.elapsedTime;

    if (hit) {
      setHovered(true);
      timer.current += delta;
      setProgress(Math.min(timer.current / 1.5, 1));
      if (timer.current >= 1.5) { 
        timer.current = 0; 
        onClick(); 
      }
    } else {
      setHovered(false);
      timer.current = Math.max(0, timer.current - delta * 2);
      setProgress(timer.current / 1.5);
    }

    if (arrowGroupRef.current) {
      arrowGroupRef.current.lookAt(camera.position);
      arrowGroupRef.current.position.y = 0.28 + Math.sin(t * 2.4) * 0.04;
      const hoverScale = hovered ? 1.16 : 1;
      arrowGroupRef.current.scale.setScalar(hoverScale + Math.sin(t * 3.2) * 0.04);
    }
    if (pulseRingRef.current) {
      const ringScale = 1 + Math.sin(t * 3.8) * 0.18;
      pulseRingRef.current.scale.set(ringScale, ringScale, 1);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <ringGeometry args={[0.18, 0.2, 32]} />
        <meshBasicMaterial color={hovered ? "#d4af37" : "#fff"} transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.29, 40]} />
        <meshBasicMaterial color="#d4af37" transparent opacity={hovered ? 0.45 : 0.18} />
      </mesh>
      {progress > 0 && (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.21, 0.24, 32, 1, 0, progress * Math.PI * 2]} />
          <meshBasicMaterial color="#d4af37" />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <group ref={arrowGroupRef} position={[0, 0.28, 0]}>
        <mesh position={[0, 0.08, 0]}>
          <coneGeometry args={[0.08, 0.18, 24]} />
          <meshBasicMaterial color={hovered ? "#facc15" : "#f8fafc"} />
        </mesh>
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.1, 18]} />
          <meshBasicMaterial color={hovered ? "#facc15" : "#f8fafc"} />
        </mesh>
        <mesh ref={pulseRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <ringGeometry args={[0.11, 0.13, 28]} />
          <meshBasicMaterial color="#facc15" transparent opacity={hovered ? 0.85 : 0.55} />
        </mesh>
      </group>
    </group>
  );
}

function InterestRing({
  position,
  label,
  onClick,
  onInfoClick,
  infoHidden,
}: {
  position: [number, number, number];
  label: string;
  onClick: () => void;
  onInfoClick: () => void;
  infoHidden?: boolean;
}) {
  const { camera } = useThree();
  const ringRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const clickPulseRef = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    clickPulseRef.current = Math.max(0, clickPulseRef.current - delta * 3.2);
    const hoverBoost = hovered ? 0.12 : 0;
    const clickBoost = clickPulseRef.current * 0.35;
    if (ringRef.current) {
      ringRef.current.lookAt(camera.position);
      const s = 1 + Math.sin(t * 2.2) * 0.06 + hoverBoost + clickBoost;
      ringRef.current.scale.set(s, s, s);
    }
    if (haloRef.current) {
      haloRef.current.lookAt(camera.position);
      const s = 1.06 + Math.sin(t * 1.7) * 0.08 + hoverBoost * 0.55 + clickBoost * 0.75;
      haloRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <ringGeometry args={[0.22, 0.3, 40]} />
        <meshBasicMaterial color={hovered ? "#60a5fa" : "#3b82f6"} transparent opacity={hovered ? 0.34 : 0.22} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.17, 0.2, 40]} />
        <meshBasicMaterial color={hovered ? "#dbeafe" : "#93c5fd"} transparent opacity={hovered ? 0.95 : 0.8} />
      </mesh>
      <mesh
        onClick={() => {
          clickPulseRef.current = 0.25;
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[0.03, 20]} />
        <meshBasicMaterial color={hovered ? "#ffffff" : "#dbeafe"} transparent opacity={hovered ? 1 : 0.95} />
      </mesh>
      <PoiBillboard label={label} onInfoClick={onInfoClick} infoHidden={infoHidden} />
    </group>
  );
}

function AtmosphericParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const points = useMemo(() => new Float32Array(300).map(() => (Math.random() - 0.5) * 12), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    pointsRef.current.rotation.y = t * 0.015;
    pointsRef.current.rotation.x = Math.sin(t * 0.25) * 0.05;
  });

  return (
    <Points ref={pointsRef as any} positions={points} stride={3}>
      <PointMaterial transparent color="#fff" size={0.012} sizeAttenuation depthWrite={false} opacity={0.2} />
    </Points>
  );
}

function SceneLoadingFallback() {
  return (
    <group>
      <AtmosphericParticles />
    </group>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function OnesaAITourismVirtualExperience() {
  const { i18n, t } = useTranslation();
  const uiLanguage = useMemo<UiLanguage>(
    () => normalizeUiLanguage(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );
  const ui = useMemo(
    () => ({ ...VR_UI_COPY.en, ...(VR_UI_COPY[uiLanguage] ?? {}) }) as Record<string, string>,
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
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [virtualNarrative, setVirtualNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [isGlobeZoomTransitioning, setIsGlobeZoomTransitioning] = useState(false);
  const [walkStageIndex, setWalkStageIndex] = useState(0);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [selectedVoiceGender, setSelectedVoiceGender] = useState<"male" | "female">("female");
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const [conversationTranscript, setConversationTranscript] = useState("");
  const [conversationResponse, setConversationResponse] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStageInfo, setShowStageInfo] = useState(false);
  const [showPoiInfo, setShowPoiInfo] = useState(false);
  const [poiInfoTitle, setPoiInfoTitle] = useState("");
  const [poiInfoText, setPoiInfoText] = useState("");
  const [poiInfoLoading, setPoiInfoLoading] = useState(false);
  const [hiddenPoiInfoIconIds, setHiddenPoiInfoIconIds] = useState<Set<string>>(() => new Set());
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioUrlRef = useRef<string | null>(null);
  const ttsAudioContextRef = useRef<AudioContext | null>(null);
  const ttsAudioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const ttsAudioHighShelfRef = useRef<BiquadFilterNode | null>(null);
  const ttsAudioLowPassRef = useRef<BiquadFilterNode | null>(null);
  const cloudTtsRequestInFlightRef = useRef(false);
  const queuedCloudNarrationRef = useRef<string | null>(null);
  const lastVrGuidanceAtRef = useRef(0);
  const introNarratedDestinationIdRef = useRef<string | null>(null);
  const speechUnlockedRef = useRef(false);
  const orbitControlsRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotationAnimFrameRef = useRef<number | null>(null);
  const pinchScaleRef = useRef<number>(1);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTurnTimerRef = useRef<number | null>(null);
  const isConversationModeRef = useRef(false);
  const isRecordingRef = useRef(false);
  const globeTransitionTimerRef = useRef<number | null>(null);

  const destinations: VirtualDestination[] = useMemo(
    () => [
      {
        id: "cape_town",
        name: "Sample City",
        image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
        vibe: "Clifftop + Coastal View",
        summary:
          "Sample City is a VR demo scene showing how the experience works: pick a destination, move between 360 stages using hotspots, and listen through Narration or Conversation mode. Once Zimbabwe destination image data is uploaded, the same flow will run on those real locations.",
        experiences: [],
        coordinates: "-33.9249, 18.4241",
        locationHighlights: [
          "360 stage-to-stage hotspot navigation",
          "Point-of-interest click and info overlay flow",
          "Narration and live conversation guidance modes",
        ],
        walkStages: [
          {
            id: "vf360_1",
            title: "Clifftop Vista",
            image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
            caption:
              "Orientation stage for testing the core controls: look around, zoom, and inspect points of interest.",
            hotspots: [{ targetId: "vf360_2", label: "To Rock Arch View", position: [5, -1, -4] }],
            pointsOfInterest: [
              { id: "vf360_1_poi_1", label: "Ridge Edge", position: [2.1, -0.8, -5.4] },
              { id: "vf360_1_poi_2", label: "Skyline Frame", position: [-2.4, -0.6, -5.1] },
            ],
          },
          {
            id: "vf360_2",
            title: "Rock Arch View",
            image: "/images/pages/tourism/vr-walk/vf_360_02.jpg",
            caption: "Interaction stage for moving between scenes with hotspots while testing guided narration behavior.",
            hotspots: [
              { targetId: "vf360_3", label: "To Summit Panorama", position: [4.8, -1, -3.7] },
              { targetId: "vf360_1", label: "Back to Clifftop Vista", position: [-5, -1, 4] },
            ],
            pointsOfInterest: [
              { id: "vf360_2_poi_1", label: "Rock Arch", position: [0.8, -0.7, -5.7] },
              { id: "vf360_2_poi_2", label: "Valley Opening", position: [-1.8, -0.9, -5.4] },
            ],
          },
          {
            id: "vf360_3",
            title: "Summit Panorama",
            image: "/images/pages/tourism/vr-walk/vf_360_03.jpg",
            caption:
              "Final stage showing the complete VR tour loop before production Zimbabwe destination media is connected.",
            hotspots: [{ targetId: "vf360_1", label: "Back to Clifftop Vista", position: [-4.8, -1, 3.8] }],
            pointsOfInterest: [
              { id: "vf360_3_poi_1", label: "Panorama Crest", position: [1.3, -0.8, -5.8] },
              { id: "vf360_3_poi_2", label: "Horizon Point", position: [-2.2, -0.7, -5.3] },
            ],
          },
        ],
      },
    ],
    []
  );

  const localizedDestinations = useMemo(() => {
    if (uiLanguage !== "sn") return destinations;
    return destinations.map((destination) => ({
      ...destination,
      name: "Guta Rekuyedza",
      vibe: "Pamusoro pegomo + Muono wemahombekombe",
      summary:
        "Guta Rekuyedza inzvimbo yekuratidza mashandiro eVR: sarudza nzvimbo, famba pakati pema360 stages uchishandisa hotspots, uye shandisa Narration kana Conversation mode. Kana mifananidzo yenzvimbo dzekushanya dzeZimbabwe yaiswa, mashandiro aya achashanda panzvimbo chaidzo.",
      locationHighlights: [
        "Hotspot navigation pakati pema360 stages",
        "Point-of-interest kubaya nekuona ruzivo",
        "Narration neConversation guidance modes",
      ],
      walkStages: destination.walkStages.map((stage, idx) => ({
        ...stage,
        title:
          idx === 0
            ? "Muono wePamusoro"
            : idx === 1
              ? "Muono weRock Arch"
              : "Muono Wakafara",
        caption:
          idx === 0
            ? "Stage yekutanga yekuyedza ma-control: tarisa-tarisa, zoom, uye bvunza point of interest."
            : idx === 1
              ? "Stage yekudyidzana yekufamba pakati pezviitiko uchishandisa hotspots uye kuyedza narration."
              : "Stage yekupedzisira inoratidza kutenderera kwakazara kweVR tisati tabatanidza media yeZimbabwe.",
      })),
    }));
  }, [destinations, uiLanguage]);

  const stageImageUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const destination of localizedDestinations) {
      for (const stage of destination.walkStages) {
        if (stage.image) urls.add(stage.image);
      }
    }
    return Array.from(urls);
  }, [localizedDestinations]);

  const stopViewportMusic = useCallback(() => {
    const allAudioNodes = new Set<HTMLAudioElement>();
    const host = containerRef.current;
    if (host) {
      host.querySelectorAll("audio").forEach((audio) => allAudioNodes.add(audio));
    }
    if (typeof document !== "undefined") {
      document.querySelectorAll<HTMLAudioElement>('audio[data-onesa-globe-music="true"]').forEach((audio) => allAudioNodes.add(audio));
      document
        .querySelectorAll<HTMLAudioElement>('audio[src*="zimbabwe_a_world_of_wonders.mp3"]')
        .forEach((audio) => allAudioNodes.add(audio));
    }

    allAudioNodes.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = true;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("onesa:stop-globe-music"));
    }
  }, []);

  useEffect(() => {
    if (!selectedDestinationId) return;
    stopViewportMusic();
  }, [selectedDestinationId, stopViewportMusic]);

  const currentDestination =
    localizedDestinations.find((destination) => destination.id === selectedDestinationId) ?? localizedDestinations[0];
  const walkStages = currentDestination.walkStages;
  const currentStage = walkStages[walkStageIndex];
  const sidebarNarration = useMemo(() => {
    if (!isConversationMode) {
      return [currentDestination.summary, `${ui.stageLabel}: ${currentStage.title}`, currentStage.caption].join(" ");
    }
    return virtualNarrative;
  }, [currentDestination.summary, currentStage.caption, currentStage.title, isConversationMode, ui.stageLabel, virtualNarrative]);
  const sidebarNarrationLines = useMemo(() => formatNarrationLines(sidebarNarration), [sidebarNarration]);

  const clearRecordingTurnTimer = useCallback(() => {
    if (recordingTurnTimerRef.current !== null) {
      window.clearTimeout(recordingTurnTimerRef.current);
      recordingTurnTimerRef.current = null;
    }
  }, []);

  const unlockAudio = useCallback(async (): Promise<boolean> => {
    if (speechUnlockedRef.current && audioReady) return true;
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.load();
      }
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") await ctx.resume();
        const buffer = ctx.createBuffer(1, 220, 22050);
        buffer.getChannelData(0).fill(0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        setTimeout(() => { void ctx.close().catch(() => {}); }, 1000);
      }
      speechUnlockedRef.current = true;
      setAudioReady(true);
      return true;
    } catch {
      speechUnlockedRef.current = false;
      setAudioReady(false);
      return false;
    }
  }, [audioReady]);

  const ensureCloudAudioNoiseFilter = useCallback(async () => {
    if (typeof window === "undefined") return;
    const audioElement = ttsAudioRef.current;
    if (!audioElement) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!ttsAudioContextRef.current) {
      ttsAudioContextRef.current = new AudioCtx();
    }
    const context = ttsAudioContextRef.current;
    if (context.state === "suspended") {
      await context.resume().catch(() => undefined);
    }

    if (!ttsAudioSourceNodeRef.current) {
      const source = context.createMediaElementSource(audioElement);
      const highShelf = context.createBiquadFilter();
      highShelf.type = "highshelf";
      highShelf.frequency.value = 3400;
      highShelf.gain.value = -10;

      const lowPass = context.createBiquadFilter();
      lowPass.type = "lowpass";
      lowPass.frequency.value = 6200;
      lowPass.Q.value = 0.9;

      source.connect(highShelf);
      highShelf.connect(lowPass);
      lowPass.connect(context.destination);

      ttsAudioSourceNodeRef.current = source;
      ttsAudioHighShelfRef.current = highShelf;
      ttsAudioLowPassRef.current = lowPass;
    }
  }, []);

  useEffect(() => {
    setAiStatus(ui.systemReady);
  }, [ui.systemReady]);

  useEffect(() => {
    stageImageUrls.forEach((imageUrl) => {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = imageUrl;
    });
  }, [stageImageUrls]);

  useEffect(() => {
    if (walkStageIndex >= walkStages.length) {
      setWalkStageIndex(0);
    }
  }, [walkStageIndex, walkStages.length]);

  useEffect(() => {
    const getFullscreenElement = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    };
    const onFullscreenChange = () => {
      setIsFullscreen(getFullscreenElement() === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const unlockSpeech = () => {
      void unlockAudio();
    };
    window.addEventListener("pointerdown", unlockSpeech, { once: true, passive: true, capture: true });
    return () => window.removeEventListener("pointerdown", unlockSpeech, true);
  }, [unlockAudio]);

  useEffect(() => {
    if (!selectedDestinationId || isConversationMode) return;
    if (introNarratedDestinationIdRef.current === selectedDestinationId) return;
    introNarratedDestinationIdRef.current = selectedDestinationId;
    const destination = localizedDestinations.find((item) => item.id === selectedDestinationId);
    if (!destination) {
      introNarratedDestinationIdRef.current = null;
      return;
    }
    const runNarration = async () => {
      setLoading(true);
      setAiStatus(ui.guideThinking);
      setVirtualNarrative(destination.summary);
      try {
        const sampleCityNarrationHint =
          destination.id === "cape_town"
            ? "For Sample City, clearly explain this is a VR feature demo and that the same workflow will run for Zimbabwe destinations once their image data is uploaded. Mention location selection, hotspot movement, and narration/conversation audio."
            : "";
        const prompt = [
          "Provide a concise, visitor-friendly narration for this destination in 3-4 sentences.",
          `Response language: ${selectedLanguageLabel}.`,
          `Destination: ${destination.name}.`,
          `Summary: ${destination.summary}`,
          destination.locationHighlights?.length
            ? `Highlights: ${destination.locationHighlights.join("; ")}.`
            : "",
          sampleCityNarrationHint,
          `Use ${selectedLanguageLabel} only.`,
        ]
          .filter(Boolean)
          .join("\n");
        const { data } = await sendOnesaChatMessage({
          messages: [{ role: "user", content: prompt }],
          language: uiLanguage,
        });
        const reply = String(data?.reply ?? "").trim();
        const finalText = reply || destination.summary;
        const introStage = destination.walkStages[0] ?? destination.walkStages[walkStageIndex];
        setVirtualNarrative(finalText);
        const introFinished = await speakWithTts(finalText, false, true);
        if (introFinished && introStage) {
          const demoStartGuidance = buildPostIntroStartGuidance(uiLanguage, introStage);
          await speakWithTts(demoStartGuidance);
        }
      } catch {
        const introStage = destination.walkStages[0] ?? destination.walkStages[walkStageIndex];
        const fallbackText = destination.summary;
        setVirtualNarrative(fallbackText);
        const introFinished = await speakWithTts(fallbackText, false, true);
        if (introFinished && introStage) {
          const demoStartGuidance = buildPostIntroStartGuidance(uiLanguage, introStage);
          await speakWithTts(demoStartGuidance);
        }
      } finally {
        setAiStatus(ui.systemReady);
        setLoading(false);
      }
    };
    void runNarration();
  }, [localizedDestinations, ui.guideThinking, ui.systemReady, selectedLanguageLabel, isConversationMode, selectedDestinationId, uiLanguage]);

  // --- AUDIO & AI UTILITIES ---

  useEffect(() => {
    if (isConversationMode) return;
    const ctx = THREE.AudioContext.getContext() as unknown as {
      state?: string;
      resume?: () => Promise<void>;
    };
    if (ctx?.state === "suspended" && ctx.resume) {
      void ctx.resume().catch(() => undefined);
    }
  }, [isConversationMode]);

  const speakWithTts = async (text: string, force = false, waitForCompletion = false): Promise<boolean> => {
    if (!text) return false;
    if (!force && !isTtsEnabled) return false;
    let cloudFailureReason = "";

    const audio = ttsAudioRef.current;
    const cloudPlaybackActive = Boolean(audio && !audio.paused && audio.currentSrc && !audio.currentSrc.startsWith("data:"));
    if (cloudTtsRequestInFlightRef.current || cloudPlaybackActive) {
      queuedCloudNarrationRef.current = text;
      return true;
    }

    const speakWithBrowserVoice = async () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
      try {
        if (ttsAudioRef.current) {
          ttsAudioRef.current.pause();
          ttsAudioRef.current.currentTime = 0;
          ttsAudioRef.current.removeAttribute("src");
          ttsAudioRef.current.load();
        }
        if (force) {
          await unlockAudio();
        }
        const synth = window.speechSynthesis;
        const voices = synth.getVoices();
        if (!voices.length) {
          await new Promise<void>((resolve) => {
            let settled = false;
            const finish = () => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timerId);
              synth.onvoiceschanged = prevHandler;
              resolve();
            };
            const prevHandler = synth.onvoiceschanged;
            synth.onvoiceschanged = () => finish();
            const timerId = window.setTimeout(() => finish(), 1200);
          });
        }

        const speakAttempt = async (useBestVoice: boolean) => {
          synth.resume();
          synth.cancel();
          setIsNarrationPlaying(false);

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.volume = 0.82;
          utterance.rate = selectedVoiceGender === "male" ? 0.96 : 1.02;
          utterance.pitch = selectedVoiceGender === "male" ? 0.78 : 1.14;
          const safeLang = speechLanguageCode;
          utterance.lang = safeLang;

          const runtimeVoices = synth.getVoices();
          const localVoices = runtimeVoices.filter((v) => v.localService);
          const pool = localVoices.length ? localVoices : runtimeVoices;
          const languagePrefix = safeLang.split("-")[0].toLowerCase();
          const genderPattern =
            selectedVoiceGender === "male"
              ? /(male|man|david|daniel|alex|fred|thomas|tom|michael|john|james|oliver|liam|andreas|hans|wolfgang)/i
              : /(female|woman|samantha|victoria|karen|zira|ava|susan|allison|amy|emma|olivia|sarah|sofia|anna|heidi)/i;
          const neutralQualityPattern = /google|natural|premium|enhanced|neural|compact|online/i;
          const languagePool = pool.filter((v) => v.lang.toLowerCase().startsWith(languagePrefix));
          const searchPool = languagePool.length ? languagePool : pool;

          const preferred =
            (useBestVoice ? searchPool.find((v) => genderPattern.test(v.name)) : undefined) ??
            searchPool.find((v) => genderPattern.test(v.name)) ??
            (useBestVoice ? searchPool.find((v) => neutralQualityPattern.test(v.name)) : undefined) ??
            searchPool.find((v) => v.default) ??
            searchPool[0] ??
            pool.find((v) => v.lang.toLowerCase().startsWith("en")) ??
            pool[0];

          if (preferred) {
            utterance.voice = preferred;
            utterance.lang = preferred.lang || safeLang;
          } else {
            utterance.lang = safeLang;
          }

          return await new Promise<boolean>((resolve) => {
            let settled = false;
            let started = false;
            const finish = (ok: boolean) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(timer);
              resolve(ok);
            };
            const timerMs = waitForCompletion ? Math.min(90000, Math.max(6000, text.length * 90)) : 2300;
            const timer = window.setTimeout(() => {
              if (!waitForCompletion && synth.speaking) {
                finish(true);
                return;
              }
              if (waitForCompletion && started && !synth.speaking) {
                finish(true);
                return;
              }
              setIsNarrationPlaying(false);
              finish(false);
            }, timerMs);
            utterance.onstart = () => {
              started = true;
              setIsNarrationPlaying(true);
              setAiStatus(ui.systemReady);
              if (!waitForCompletion) finish(true);
            };
            utterance.onend = () => {
              setIsNarrationPlaying(false);
              finish(true);
            };
            utterance.onerror = () => {
              setIsNarrationPlaying(false);
              finish(false);
            };
            try {
              synth.speak(utterance);
            } catch {
              setIsNarrationPlaying(false);
              finish(false);
            }
          });
        };

        let started = await speakAttempt(true);
        if (!started) started = await speakAttempt(false);
        return started;
      } catch (e) {
        console.error("TTS Error:", e);
        return false;
      }
    };

    const playCloudResponse = async (response: Response): Promise<boolean> => {
      if (!response.ok) {
        cloudFailureReason = await response.text().catch(() => "");
        return false;
      }
      if (!ttsAudioRef.current) return false;
      const headerMime = String(response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const blob = await response.blob();
      const effectiveMime = String(blob.type || headerMime).toLowerCase();
      if (/audio\/l16|codec=pcm/.test(effectiveMime)) {
        cloudFailureReason = `Unsupported cloud audio format: ${effectiveMime || "unknown"}`;
        return false;
      }
      const playableBlob = !blob.type && headerMime ? blob.slice(0, blob.size, headerMime) : blob;
      const url = URL.createObjectURL(playableBlob);
      if (ttsAudioUrlRef.current) URL.revokeObjectURL(ttsAudioUrlRef.current);
      ttsAudioUrlRef.current = url;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      ttsAudioRef.current.src = url;
      ttsAudioRef.current.volume = 0.72;
      ttsAudioRef.current.playbackRate = 1;
      if ("preservesPitch" in ttsAudioRef.current) {
        (ttsAudioRef.current as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
      }
      if ("webkitPreservesPitch" in (ttsAudioRef.current as any)) {
        (ttsAudioRef.current as any).webkitPreservesPitch = true;
      }
      await ensureCloudAudioNoiseFilter();
      setIsNarrationPlaying(true);
      try {
        await ttsAudioRef.current.play();
      } catch {
        setIsNarrationPlaying(false);
        throw new Error("Cloud audio playback failed");
      }
      setAiStatus(ui.systemReady);
      if (waitForCompletion) {
        const timeoutMs = Math.min(90000, Math.max(6000, text.length * 90));
        await new Promise<void>((resolve) => {
          if (!ttsAudioRef.current) {
            resolve();
            return;
          }
          const audioEl = ttsAudioRef.current;
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            audioEl.removeEventListener("ended", finish);
            audioEl.removeEventListener("error", finish);
            audioEl.removeEventListener("abort", finish);
            resolve();
          };
          const timeoutId = window.setTimeout(finish, timeoutMs);
          audioEl.addEventListener("ended", finish, { once: true });
          audioEl.addEventListener("error", finish, { once: true });
          audioEl.addEventListener("abort", finish, { once: true });
        });
      }
      return true;
    };

    const tryCloudTts = async (): Promise<boolean> => {
      // Prioritized by gender so "male/female" keeps working even if one voice is unavailable.
      const maleVoiceIds = ["ErXwobaYiN019PkySvjV", "pNInz6obpgDQGcFmaJgB", "VR6AewLTigWG4xSOukaG"];
      const femaleVoiceIds = ["EXAVITQu4vr4xnSDxMaL", "MF3mGyEYCl7XYWbV9V6O", "XB0fDUnXU5powFXDhCwa"];
      const voiceIdCandidates = selectedVoiceGender === "male" ? maleVoiceIds : femaleVoiceIds;

      const shouldTryNextVoice = (status: number, reason: string): boolean => {
        if (status === 400) return /voice|invalid|not\s*found|unsupported/i.test(reason);
        return false;
      };

      for (const selectedVoiceId of voiceIdCandidates) {
        try {
          setAiStatus(ui.requestingCloudNarration ?? ui.guideThinking);
          const speechRes = await fetch("/api/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "tts",
              text,
              voiceId: selectedVoiceId,
              language: uiLanguage,
            }),
          });
          if (await playCloudResponse(speechRes)) return true;
          const speechFailure = await speechRes.text().catch(() => "");
          if (!shouldTryNextVoice(speechRes.status, speechFailure)) {
            cloudFailureReason = speechFailure;
          }
        } catch {
          // continue to /api/tts fallback for the same voice
        }
        try {
          const ttsRes = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              voiceId: selectedVoiceId,
              language: uiLanguage,
            }),
          });
          if (await playCloudResponse(ttsRes)) return true;
          const ttsFailure = await ttsRes.text().catch(() => "");
          if (!shouldTryNextVoice(ttsRes.status, ttsFailure)) {
            cloudFailureReason = ttsFailure;
          }
        } catch {
          // try next candidate
        }
      }
      return false;
    };

    cloudTtsRequestInFlightRef.current = true;
    try {
      try {
        const cloudOk = await tryCloudTts();
        if (cloudOk) return true;
      } catch {
        // handled by browser fallback below
      }
      const quotaExceeded = /quota_exceeded|exceeds your quota|insufficient credits|credits remaining/i.test(cloudFailureReason);
      setAiStatus(quotaExceeded ? ui.cloudQuotaExceeded : ui.cloudFailed);
      const browserOk = await speakWithBrowserVoice();
      if (!browserOk) {
        setAiStatus(ui.browserBlocked);
        return false;
      }
      return true;
    } finally {
      cloudTtsRequestInFlightRef.current = false;
      if (isTtsEnabled && !isConversationMode) {
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
  };

  useEffect(() => {
    const audio = ttsAudioRef.current;
    if (!audio) return;
    const handleNarrationStarted = () => {
      setIsNarrationPlaying(true);
    };
    const handleNarrationStopped = () => {
      setIsNarrationPlaying(false);
    };
    const handleCloudNarrationEnd = () => {
      if (cloudTtsRequestInFlightRef.current) return;
      if (!isTtsEnabled || isConversationMode) return;
      const queued = queuedCloudNarrationRef.current;
      if (!queued) return;
      queuedCloudNarrationRef.current = null;
      void speakWithTts(queued, false);
    };
    audio.addEventListener("play", handleNarrationStarted);
    audio.addEventListener("playing", handleNarrationStarted);
    audio.addEventListener("ended", handleNarrationStopped);
    audio.addEventListener("error", handleNarrationStopped);
    audio.addEventListener("pause", handleNarrationStopped);
    audio.addEventListener("stalled", handleNarrationStopped);
    audio.addEventListener("abort", handleNarrationStopped);
    audio.addEventListener("ended", handleCloudNarrationEnd);
    audio.addEventListener("error", handleCloudNarrationEnd);
    audio.addEventListener("pause", handleCloudNarrationEnd);
    audio.addEventListener("stalled", handleCloudNarrationEnd);
    audio.addEventListener("abort", handleCloudNarrationEnd);
    return () => {
      audio.removeEventListener("play", handleNarrationStarted);
      audio.removeEventListener("playing", handleNarrationStarted);
      audio.removeEventListener("ended", handleNarrationStopped);
      audio.removeEventListener("error", handleNarrationStopped);
      audio.removeEventListener("pause", handleNarrationStopped);
      audio.removeEventListener("stalled", handleNarrationStopped);
      audio.removeEventListener("abort", handleNarrationStopped);
      audio.removeEventListener("ended", handleCloudNarrationEnd);
      audio.removeEventListener("error", handleCloudNarrationEnd);
      audio.removeEventListener("pause", handleCloudNarrationEnd);
      audio.removeEventListener("stalled", handleCloudNarrationEnd);
      audio.removeEventListener("abort", handleCloudNarrationEnd);
    };
  }, [isConversationMode, isTtsEnabled, speakWithTts]);

  const handleNarrationToggle = useCallback(() => {
    const forceStopConversationRecording = () => {
      if (!isRecordingRef.current) return;
      clearRecordingTurnTimer();
      try {
        mediaRecorder.current?.stop();
      } catch {
        recordingStream.current?.getTracks().forEach((track) => track.stop());
        recordingStream.current = null;
      }
      isRecordingRef.current = false;
      setIsRecording(false);
    };

    if (isConversationMode) {
      isConversationModeRef.current = false;
      forceStopConversationRecording();
      setIsConversationMode(false);
      setIsTtsEnabled(false);
      setIsNarrationPlaying(false);
      return;
    }
    const nextEnabled = !isTtsEnabled;
    setIsTtsEnabled(nextEnabled);

    if (!nextEnabled) {
      window.speechSynthesis.cancel();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
      setIsNarrationPlaying(false);
      return;
    }

    if (!selectedDestinationId) {
      setAiStatus(ui.selectDestination);
      return;
    }
    // Narration must never activate the microphone path.
    isConversationModeRef.current = false;
    forceStopConversationRecording();
    setIsConversationMode(false);
    setIsSoundEnabled(false);

    const introText = buildNarrationButtonIntro(uiLanguage, currentDestination.name, currentDestination.summary);
    if (!introText) {
      setAiStatus(ui.narrationPending);
      return;
    }
    setVirtualNarrative(introText);
    void (async () => {
      await unlockAudio();
      void speakWithTts(introText, true);
    })();
  }, [
    clearRecordingTurnTimer,
    currentDestination.name,
    currentDestination.summary,
    isConversationMode,
    isTtsEnabled,
    setIsSoundEnabled,
    setIsConversationMode,
    selectedDestinationId,
    speakWithTts,
    uiLanguage,
    ui.narrationPending,
    ui.selectDestination,
    unlockAudio,
  ]);

  useEffect(() => {
    if (isTtsEnabled) return;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsNarrationPlaying(false);
    queuedCloudNarrationRef.current = null;
    cloudTtsRequestInFlightRef.current = false;
  }, [isTtsEnabled]);

  useEffect(() => {
    isConversationModeRef.current = isConversationMode;
  }, [isConversationMode]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const extractTranscriptText = useCallback((payload: unknown): string => {
    if (!payload || typeof payload !== "object") return "";
    const source = payload as Record<string, unknown>;
    const candidates = [
      source.text,
      source.transcript,
      source.result,
      source.output,
      source.message,
      source.response,
      (source.data as Record<string, unknown> | undefined)?.text,
      (source.data as Record<string, unknown> | undefined)?.transcript,
      (source.data as Record<string, unknown> | undefined)?.result,
    ];
    for (const candidate of candidates) {
      const value = String(candidate ?? "").trim();
      if (value) return value;
    }
    return "";
  }, []);

  const transcribeWithGroq = useCallback(async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("action", "stt");
    formData.append("provider", "groq");
    const res = await fetch("/api/speech", { method: "POST", body: formData });
    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(message || `Groq STT failed (${res.status})`);
    }
    const payload = await res.json().catch(() => ({}));
    return extractTranscriptText(payload);
  }, [extractTranscriptText]);

  const transcribeWithWhisper = useCallback(async (blob: Blob): Promise<string> => {
    const res = await fetch("/api/whisper", { method: "POST", body: blob });
    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(message || `Whisper STT failed (${res.status})`);
    }
    const payload = await res.json().catch(() => ({}));
    return extractTranscriptText(payload);
  }, [extractTranscriptText]);

  const transcribeWithBrowserSpeech = useCallback(async (): Promise<string> => {
    if (typeof window === "undefined") {
      throw new Error("Browser speech recognition unavailable");
    }
    const RecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!RecognitionCtor) {
      throw new Error("Browser speech recognition unsupported");
    }

    return await new Promise<string>((resolve, reject) => {
      const recognition = new RecognitionCtor();
      recognition.lang = speechLanguageCode;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let settled = false;
      const finish = (result?: string, error?: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        if (result && result.trim()) {
          resolve(result.trim());
          return;
        }
        reject(error ?? new Error("No speech detected"));
      };

      const timeoutId = window.setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          // no-op
        }
        finish(undefined, new Error("Browser speech recognition timed out"));
      }, 10000);

      recognition.onresult = (event: any) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript ?? "").trim();
        finish(transcript);
      };
      recognition.onerror = (event: any) => {
        finish(undefined, new Error(String(event?.error ?? "Browser speech recognition failed")));
      };
      recognition.onnomatch = () => {
        finish(undefined, new Error("No matching speech recognized"));
      };
      recognition.onend = () => {
        finish(undefined, new Error("Browser speech recognition ended without text"));
      };

      try {
        recognition.start();
      } catch (error) {
        finish(undefined, error instanceof Error ? error : new Error("Unable to start browser speech recognition"));
      }
    });
  }, [speechLanguageCode]);

  const processConversation = async (blob: Blob) => {
    setLoading(true);
    setAiStatus(ui.transcribing);
    let capturedTranscript = "";
    try {
      // Prefer multipart Groq STT path used across modules, with Whisper-route fallback.
      let text = "";
      try {
        text = await transcribeWithGroq(blob);
      } catch {
        try {
          text = await transcribeWithWhisper(blob);
        } catch {
          setAiStatus(ui.whisperFallback);
          text = await transcribeWithBrowserSpeech();
        }
      }
      if (!text) {
        setConversationTranscript(ui.sttUnavailable ?? "Could not transcribe audio.");
        throw new Error("No speech detected");
      }
      capturedTranscript = text;
      setConversationTranscript(text);

      setAiStatus(ui.guideThinking);

      // 2. Send text to Onesa AI
      const { data } = await sendOnesaChatMessage({
        messages: [{ role: "user", content: `Response language: ${selectedLanguageLabel}.\nUse ${selectedLanguageLabel} only.\n${text}` }],
        language: uiLanguage,
      });

      const reply = String(data?.reply ?? "").trim() || ui.guideThinking;
      setVirtualNarrative(reply);
      setConversationResponse(reply);
      await speakWithTts(reply, true);
      setAiStatus(ui.systemReady);
    } catch {
      if (!capturedTranscript) {
        setConversationTranscript(ui.sttUnavailable ?? "Could not transcribe audio.");
      }
      setAiStatus(ui.whisperFallback);
      const fallbackPrompt = [
        "Speech transcription is temporarily unavailable. Provide a concise destination update.",
        `Response language: ${selectedLanguageLabel}.`,
        `Destination: ${currentDestination.name}.`,
        `Current stage: ${currentStage.title}.`,
        `Stage context: ${currentStage.caption}`,
        `Destination summary: ${currentDestination.summary}`,
        "Provide concise visitor guidance in 3-5 sentences.",
        `Use ${selectedLanguageLabel} only.`,
      ].join("\n");
      try {
        const { data } = await sendOnesaChatMessage({
          messages: [{ role: "user", content: fallbackPrompt }],
          language: uiLanguage,
        });
        const reply = String(data?.reply ?? "").trim() || currentDestination.summary;
        setVirtualNarrative(reply);
        setConversationResponse(reply);
        await speakWithTts(reply, true);
        setAiStatus(ui.onesaFallback);
      } catch {
        const localFallback = String(currentDestination.summary || currentStage.caption || "").trim();
        setVirtualNarrative(localFallback);
        setConversationResponse(localFallback);
        await speakWithTts(localFallback, true);
        setAiStatus(ui.localGuidance);
      }
    } finally {
      setLoading(false);
    }
  };

  const buildClickGuidanceNarration = useCallback(() => {
    const hotspotLabels = (currentStage.hotspots ?? []).map((hotspot) => hotspot.label).filter(Boolean);
    const poiLabels = (currentStage.pointsOfInterest ?? []).map((poi) => poi.label).filter(Boolean);
    const hotspotText = hotspotLabels.length
      ? hotspotLabels.slice(0, 3).join(", ")
      : uiLanguage === "sn"
        ? "mhete dzegoridhe dzekufambira mberi"
        : "the glowing gold movement rings";
    const poiText = poiLabels.length
      ? poiLabels.slice(0, 2).join(", ")
      : uiLanguage === "sn"
        ? "mapoinzi ebhuruu"
        : "blue points of interest";

    if (uiLanguage === "sn") {
      return [
        `Uri pa ${currentStage.title} mu ${currentDestination.name}.`,
        `Tinya mhete dzegoridhe kuti ufambe ku ${hotspotText}.`,
        `Kuti uwane tsananguro yenzvimbo, tinya ${poiText}, wobva wadzvanya chiratidzo chefaira.`,
      ].join(" ");
    }

    return [
      `You are at ${currentStage.title} in ${currentDestination.name}.`,
      `Tap the glowing gold rings to move to ${hotspotText}.`,
      `For place details, tap ${poiText}, then tap the document icon.`,
    ].join(" ");
  }, [currentDestination.name, currentStage.hotspots, currentStage.pointsOfInterest, currentStage.title, uiLanguage]);

  const handleVrPointerMissed = useCallback(() => {
    if (!selectedDestinationId || isGlobeZoomTransitioning) return;
    if (isConversationMode || !isTtsEnabled) return;
    const now = Date.now();
    if (now - lastVrGuidanceAtRef.current < 2400) return;
    lastVrGuidanceAtRef.current = now;

    const guidance = buildClickGuidanceNarration();
    if (!guidance) return;
    void (async () => {
      await unlockAudio();
      await speakWithTts(guidance);
    })();
  }, [
    buildClickGuidanceNarration,
    isConversationMode,
    isGlobeZoomTransitioning,
    isTtsEnabled,
    selectedDestinationId,
    speakWithTts,
    unlockAudio,
  ]);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    clearRecordingTurnTimer();
    try {
      mediaRecorder.current?.stop();
    } catch {
      // no-op
    }
    isRecordingRef.current = false;
    setIsRecording(false);
  }, [clearRecordingTurnTimer]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    if (!isConversationModeRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setAiStatus(ui.micNotSupported);
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setAiStatus(ui.micNotSupported);
      isConversationModeRef.current = false;
      setIsConversationMode(false);
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isConversationModeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      recordingStream.current = stream;
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => {
        clearRecordingTurnTimer();
        stream.getTracks().forEach((track) => track.stop());
        recordingStream.current = null;
        isRecordingRef.current = false;
        setIsRecording(false);
        const recordedBlob = new Blob(audioChunks.current, {
          type: mediaRecorder.current?.mimeType || "audio/webm",
        });
        void (async () => {
          await processConversation(recordedBlob);
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
      setAiStatus(ui.listening);
    } catch {
      clearRecordingTurnTimer();
      isRecordingRef.current = false;
      setAiStatus(ui.micDenied);
      isConversationModeRef.current = false;
      setIsConversationMode(false);
      setIsRecording(false);
    }
  }, [clearRecordingTurnTimer, processConversation, ui.listening, ui.micDenied, ui.micNotSupported]);

  const goToNextStage = useCallback(() => {
    if (!walkStages.length) return;
    setWalkStageIndex((current) => (current + 1) % walkStages.length);
  }, [walkStages.length]);

  const rotateView = useCallback((direction: "left" | "right" | "up" | "down") => {
    setAutoRotateEnabled(false);
    const controls = orbitControlsRef.current;
    if (controls) {
      controls.autoRotate = false;
    }
    if (rotationAnimFrameRef.current !== null) {
      window.cancelAnimationFrame(rotationAnimFrameRef.current);
      rotationAnimFrameRef.current = null;
    }
    const step = Math.PI / 14;
    const startAzimuth = typeof controls?.getAzimuthalAngle === "function" ? controls.getAzimuthalAngle() : 0;
    const startPolar = typeof controls?.getPolarAngle === "function" ? controls.getPolarAngle() : Math.PI / 2;
    const targetAzimuth =
      direction === "left" ? startAzimuth + step : direction === "right" ? startAzimuth - step : startAzimuth;
    const targetPolarUnclamped =
      direction === "up" ? startPolar - step : direction === "down" ? startPolar + step : startPolar;
    const targetPolar = THREE.MathUtils.clamp(targetPolarUnclamped, 0.05, Math.PI - 0.05);
    const fallbackStartX = cameraRef.current?.rotation.x ?? 0;
    const fallbackStartY = cameraRef.current?.rotation.y ?? 0;
    const fallbackTargetX =
      direction === "up" ? fallbackStartX + step : direction === "down" ? fallbackStartX - step : fallbackStartX;
    const fallbackTargetY =
      direction === "left"
        ? fallbackStartY + step
        : direction === "right"
          ? fallbackStartY - step
          : fallbackStartY;
    const durationMs = 220;
    const startAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      if (typeof controls?.setAzimuthalAngle === "function" && typeof controls?.setPolarAngle === "function") {
        const az = startAzimuth + (targetAzimuth - startAzimuth) * eased;
        const pol = startPolar + (targetPolar - startPolar) * eased;
        controls.setAzimuthalAngle(az);
        controls.setPolarAngle(pol);
      } else if (cameraRef.current) {
        const camera = cameraRef.current;
        camera.rotation.x = fallbackStartX + (fallbackTargetX - fallbackStartX) * eased;
        camera.rotation.y = fallbackStartY + (fallbackTargetY - fallbackStartY) * eased;
        camera.updateProjectionMatrix();
      }
      controls?.update?.();
      if (t < 1) {
        rotationAnimFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        rotationAnimFrameRef.current = null;
      }
    };
    rotationAnimFrameRef.current = window.requestAnimationFrame(tick);
  }, []);

  const zoomView = useCallback((direction: "in" | "out") => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.fov = THREE.MathUtils.clamp(camera.fov + (direction === "in" ? -6 : 6), 28, 100);
    camera.updateProjectionMatrix();
    orbitControlsRef.current?.update?.();
  }, []);

  const resetView = useCallback(() => {
    const controls = orbitControlsRef.current;
    if (controls?.reset) controls.reset();
    const camera = cameraRef.current;
    if (camera) {
      camera.position.set(0, 0, 0.1);
      camera.fov = 65;
      camera.updateProjectionMatrix();
    }
    controls?.update?.();
  }, []);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;
    controls.autoRotate = autoRotateEnabled;
    controls.autoRotateSpeed = -0.4;
    controls.update?.();
  }, [autoRotateEnabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyFovDelta = (delta: number) => {
      const camera = cameraRef.current;
      if (!camera) return;
      camera.fov = THREE.MathUtils.clamp(camera.fov + delta, 28, 100);
      camera.updateProjectionMatrix();
      orbitControlsRef.current?.update?.();
    };

    const onWheel = (event: WheelEvent) => {
      if (!selectedDestinationId || isGlobeZoomTransitioning) return;
      event.preventDefault();
      const direction = Math.sign(event.deltaY || 0);
      if (direction !== 0) applyFovDelta(direction * 2.5);
    };

    const onGestureStart = (event: Event) => {
      if (!selectedDestinationId || isGlobeZoomTransitioning) return;
      event.preventDefault();
      const gestureEvent = event as Event & { scale?: number };
      pinchScaleRef.current = gestureEvent.scale ?? 1;
    };

    const onGestureChange = (event: Event) => {
      if (!selectedDestinationId || isGlobeZoomTransitioning) return;
      event.preventDefault();
      const gestureEvent = event as Event & { scale?: number };
      const currentScale = gestureEvent.scale ?? 1;
      const deltaScale = currentScale - pinchScaleRef.current;
      pinchScaleRef.current = currentScale;
      if (Math.abs(deltaScale) > 0.0005) {
        // Pinch-in/out mapped to FOV zoom for panorama readability.
        applyFovDelta(-deltaScale * 30);
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("gesturestart", onGestureStart as EventListener, { passive: false });
    container.addEventListener("gesturechange", onGestureChange as EventListener, { passive: false });

    return () => {
      container.removeEventListener("wheel", onWheel as EventListener);
      container.removeEventListener("gesturestart", onGestureStart as EventListener);
      container.removeEventListener("gesturechange", onGestureChange as EventListener);
    };
  }, [isGlobeZoomTransitioning, selectedDestinationId]);

  useEffect(() => {
    if (!isFullscreen) return;
    setAutoRotateEnabled(true);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isSoundEnabled) return;
    if (isConversationMode || isTtsEnabled) {
      setIsSoundEnabled(false);
    }
  }, [isConversationMode, isTtsEnabled, isSoundEnabled]);

  useEffect(() => {
    if (!isConversationMode || !isTtsEnabled) return;
    setIsTtsEnabled(false);
    setIsNarrationPlaying(false);
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [isConversationMode, isTtsEnabled]);

  const handleConversationToggle = useCallback(async () => {
    if (!isConversationMode) {
      isConversationModeRef.current = true;
      setIsSoundEnabled(false);
      setIsTtsEnabled(false);
      setIsNarrationPlaying(false);
      queuedCloudNarrationRef.current = null;
      cloudTtsRequestInFlightRef.current = false;
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      await unlockAudio();
      setIsConversationMode(true);
      setAiStatus(ui.holdToSpeakHint ?? ui.systemReady);
      return;
    }
    isConversationModeRef.current = false;
    stopRecording();
    setIsConversationMode(false);
    setAiStatus(ui.systemReady);
  }, [isConversationMode, stopRecording, ui.holdToSpeakHint, ui.systemReady, unlockAudio]);

  const handlePushToTalkStart = useCallback(() => {
    if (!isConversationMode || isRecordingRef.current) return;
    void (async () => {
      await unlockAudio();
      await startRecording();
    })();
  }, [isConversationMode, startRecording, unlockAudio]);

  const handlePushToTalkEnd = useCallback(() => {
    if (!isConversationMode || !isRecordingRef.current) return;
    stopRecording();
  }, [isConversationMode, stopRecording]);

  const handlePointOfInterestClick = useCallback(
    async (poiLabel: string, poiPosition: [number, number, number]) => {
      setAutoRotateEnabled(false);
      const camera = cameraRef.current;
      const controls = orbitControlsRef.current;
      if (camera) {
        const target = new THREE.Vector3(...poiPosition);
        animateCameraFocus({
          camera,
          controls,
          lookAt: target,
          durationMs: 620,
          targetFov: THREE.MathUtils.clamp(48, 35, 95),
        });
      }
      if (controls) controls.autoRotate = false;
      setAiStatus(`${ui.guideThinking} ${poiLabel}`);
      const localRichNarration = [
        `${currentDestination.name} - ${currentStage.title}.`,
        `${ui.pointOfInterest}: ${poiLabel}.`,
        currentStage.caption,
        currentDestination.summary,
        currentDestination.locationHighlights?.length
          ? `${ui.nearbyHighlights}: ${currentDestination.locationHighlights.join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      try {
        const prompt = [
          "You are Onesa AI local tourism guide.",
          `Response language: ${selectedLanguageLabel}.`,
          `Destination: ${currentDestination.name}.`,
          `Stage: ${currentStage.title}.`,
          `Point of interest clicked: ${poiLabel}.`,
          `Stage context: ${currentStage.caption}`,
          `Destination summary: ${currentDestination.summary}`,
          currentDestination.locationHighlights?.length
            ? `${ui.relatedHighlights}: ${currentDestination.locationHighlights.join("; ")}.`
            : "",
          "Provide 4-6 short sentences describing why this exact point matters, what visitors should notice, and one practical tip.",
          `Use ${selectedLanguageLabel} only.`,
        ]
          .filter(Boolean)
          .join("\n");
        const { data } = await sendOnesaChatMessage({
          messages: [{ role: "user", content: prompt }],
          language: uiLanguage,
        });
        const enrichedNarration = String(data?.reply ?? "").trim() || localRichNarration;
        setVirtualNarrative(enrichedNarration);
        setAiStatus(`${ui.systemReady}: ${poiLabel}`);
        if (!isConversationMode) {
          await speakWithTts(enrichedNarration);
        }
      } catch {
        setVirtualNarrative(localRichNarration);
        setAiStatus(`${ui.systemReady}: ${poiLabel}`);
        if (!isConversationMode) {
          await speakWithTts(localRichNarration);
        }
      }
    },
    [
      currentDestination.locationHighlights,
      currentDestination.name,
      currentDestination.summary,
      currentStage.caption,
      currentStage.title,
      selectedLanguageLabel,
      isConversationMode,
      setAutoRotateEnabled,
      ui.guideThinking,
      ui.nearbyHighlights,
      ui.pointOfInterest,
      ui.relatedHighlights,
      ui.systemReady,
      uiLanguage,
    ]
  );

  const handleLandmarkClick = useCallback(
    async (landmarkPosition: [number, number, number]) => {
      const camera = cameraRef.current;
      const controls = orbitControlsRef.current;
      if (camera) {
        animateCameraFocus({
          camera,
          controls,
          lookAt: new THREE.Vector3(...landmarkPosition),
          durationMs: 760,
          targetFov: 42,
        });
      }
      if (controls) controls.autoRotate = false;
      setAutoRotateEnabled(false);
      setShowStageInfo(true);

      const narration = [
        `${currentDestination.name} - ${currentStage.title}.`,
        "Interactive landmark selected.",
        "Camera focus moved closer to give you contextual detail.",
        currentStage.caption,
      ].join(" ");
      setVirtualNarrative(narration);

      if (!isConversationMode) {
        await speakWithTts(narration);
      }
    },
    [currentDestination.name, currentStage.caption, currentStage.title, isConversationMode, speakWithTts]
  );

  const handlePointOfInterestInfoClick = useCallback(
    async (poiId: string, poiLabel: string) => {
      setHiddenPoiInfoIconIds((prev) => {
        if (prev.has(poiId)) return prev;
        const next = new Set(prev);
        next.add(poiId);
        return next;
      });
      setShowPoiInfo(true);
      setPoiInfoTitle(`${currentDestination.name} - ${poiLabel}`);
      setPoiInfoLoading(true);
      const fallbackInfo = [
        `${ui.pointOfInterest}: ${poiLabel}.`,
        currentStage.caption,
        currentDestination.summary,
        currentDestination.locationHighlights?.length
          ? `${ui.relatedHighlights}: ${currentDestination.locationHighlights.join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      try {
        const prompt = [
          "You are Onesa AI tourism guide.",
          `Response language: ${selectedLanguageLabel}.`,
          `Destination: ${currentDestination.name}.`,
          `Stage: ${currentStage.title}.`,
          `Point of interest: ${poiLabel}.`,
          `Stage context: ${currentStage.caption}`,
          `Destination summary: ${currentDestination.summary}`,
          "Provide detailed POI information in 4-6 concise sentences: what this spot is, why it matters, what to notice, and one visitor tip.",
          `Use ${selectedLanguageLabel} only.`,
        ].join("\n");
        const { data } = await sendOnesaChatMessage({
          messages: [{ role: "user", content: prompt }],
          language: uiLanguage,
        });
        const info = String(data?.reply ?? "").trim() || fallbackInfo;
        setPoiInfoText(info);
      } catch {
        setPoiInfoText(fallbackInfo);
      } finally {
        setPoiInfoLoading(false);
      }
    },
    [
      currentDestination.locationHighlights,
      currentDestination.name,
      currentDestination.summary,
      currentStage.caption,
      currentStage.title,
      selectedLanguageLabel,
      ui.pointOfInterest,
      ui.relatedHighlights,
      uiLanguage,
    ]
  );

  useEffect(() => {
    return () => {
      if (globeTransitionTimerRef.current !== null) {
        window.clearTimeout(globeTransitionTimerRef.current);
        globeTransitionTimerRef.current = null;
      }
      if (rotationAnimFrameRef.current !== null) {
        window.cancelAnimationFrame(rotationAnimFrameRef.current);
        rotationAnimFrameRef.current = null;
      }
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
      }
      if (ttsAudioUrlRef.current) {
        URL.revokeObjectURL(ttsAudioUrlRef.current);
        ttsAudioUrlRef.current = null;
      }
      if (ttsAudioContextRef.current) {
        void ttsAudioContextRef.current.close().catch(() => undefined);
        ttsAudioContextRef.current = null;
      }
      ttsAudioSourceNodeRef.current = null;
      ttsAudioHighShelfRef.current = null;
      ttsAudioLowPassRef.current = null;
      clearRecordingTurnTimer();
      isRecordingRef.current = false;
      queuedCloudNarrationRef.current = null;
      cloudTtsRequestInFlightRef.current = false;
      try {
        mediaRecorder.current?.stop();
      } catch {
        // no-op
      }
      recordingStream.current?.getTracks().forEach((track) => track.stop());
      recordingStream.current = null;
    };
  }, [clearRecordingTurnTimer]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const container = containerRef.current as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const fullscreenElement = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (fullscreenElement === containerRef.current) {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
      return;
    }
    if (container.requestFullscreen) {
      await container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      await container.webkitRequestFullscreen();
    }
  };

  return (
    <Layout>
      <audio ref={ttsAudioRef} preload="auto" style={{ display: "none" }} />
      {/* Page shell */}
      <section className="pt-28 pb-15 md:pt-32 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <Link href="/tourism" className="mb-4 inline-flex items-center text-xs uppercase tracking-widest font-bold  hover:text-zim-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {backToTourismLabel}
          </Link>
          {/* Main two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* NARRATION SIDEBAR */}
              <div className="lg:col-span-3 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-5 space-y-4 flex flex-col">
                {/* Destination selector */}
                <div>
                  <select
                    id="vr-destination"
                    className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-zim-gold/60"
                    value={selectedDestinationId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      if (nextId) {
                        isConversationModeRef.current = false;
                        stopViewportMusic();
                        stopRecording();
                        setIsConversationMode(false);
                        setConversationTranscript("");
                        setConversationResponse("");
                        setIsTtsEnabled(false);
                        setIsNarrationPlaying(false);
                        if (ttsAudioRef.current) {
                          ttsAudioRef.current.pause();
                          ttsAudioRef.current.currentTime = 0;
                        }
                        if (typeof window !== "undefined" && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                        }
                      }
                      if (!selectedDestinationId && nextId) {
                        setIsGlobeZoomTransitioning(true);
                        if (globeTransitionTimerRef.current !== null) {
                          window.clearTimeout(globeTransitionTimerRef.current);
                        }
                        globeTransitionTimerRef.current = window.setTimeout(() => {
                          setIsGlobeZoomTransitioning(false);
                          globeTransitionTimerRef.current = null;
                        }, 2200);
                      }
                      setSelectedDestinationId(nextId);
                      setWalkStageIndex(0);
                      // On city selection: music off, ambient on.
                      setIsSoundEnabled(Boolean(nextId));
                    }}
                  >
                    <option value="" disabled>
                      {ui.selectDestination}
                    </option>
                    {localizedDestinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>
                        {destination.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {!isTtsEnabled && !isConversationMode ? null : (
                  <div className="mt-2 border-t border-white/10 pt-3">
                    <p className="text-[10px] uppercase tracking-widest font-black text-zim-gold mb-1">
                      {isConversationMode ? ui.conversation : selectedDestinationId ? ui.narration : ui.selectLocation}
                    </p>
                    {!selectedDestinationId ? null : isConversationMode ? (
                      <div className="space-y-2">
                        <p className="text-sm text-white/75 leading-relaxed">
                          <span className="font-black">{ui.sttText ?? "STT"}:</span>{" "}
                          {conversationTranscript || "..."}
                        </p>
                        <p className="text-sm text-white/75 leading-relaxed">
                          <span className="font-black">{ui.response ?? "Response"}:</span>{" "}
                          {conversationResponse || "..."}
                        </p>
                      </div>
                    ) : sidebarNarrationLines.length > 0 ? (
                      <div className="space-y-1.5">
                        {sidebarNarrationLines.map((line, index) => (
                          <p key={`${line}-${index}`} className="text-sm text-white/75 leading-relaxed">
                            {line.includes(":") ? (
                              <>
                                <span className="font-black">{line.split(":")[0]}:</span>{" "}
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
                  </div>
                )}
                <p className="m-0 mt-auto text-[11px] text-white/70 leading-relaxed">
                  {ui.conversation} {isConversationMode ? ui.conversationEnabled : ui.conversationDisabled}. {ui.ambient} {isSoundEnabled ? ui.ambientOn : ui.ambientOff}.
                </p>
              </div>

              {/* MAIN VIEWPORT */}
              <div className="lg:col-span-9 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 !pb-2 space-y-5 flex flex-col">
                {/* 360 viewport */}
                <div
                  ref={containerRef}
                  className="rounded-2xl border border-white/15 overflow-hidden bg-black h-[500px] md:h-[600px] relative group"
                >
                  {!selectedDestinationId || isGlobeZoomTransitioning ? (
                    <div
                      className={`h-full w-full transition-transform duration-[2200ms] ease-in ${
                        isGlobeZoomTransitioning ? "scale-[3.2]" : "scale-100"
                      }`}
                    >
                      <Suspense fallback={<div className="h-full w-full bg-black/70 animate-pulse" />}>
                        <LazyZimbabweInteractiveGlobe
                          zoomToHarare={isGlobeZoomTransitioning}
                          musicEnabled={!selectedDestinationId}
                        />
                      </Suspense>
                    </div>
                  ) : (
                    <Canvas
                      camera={{ position: [0, 0, 0.1], fov: 65 }}
                      gl={{ antialias: true, alpha: false, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
                      style={{ background: "#000000" }}
                      onPointerMissed={() => {
                        handleVrPointerMissed();
                      }}
                      onCreated={({ camera, gl, scene }) => {
                        gl.xr.enabled = true;
                        gl.setClearColor(0x000000, 1);
                        scene.background = new THREE.Color(0x000000);
                        cameraRef.current = camera as THREE.PerspectiveCamera;
                      }}
                    >
                      <XR store={xrStore}>
                        <Suspense fallback={<SceneLoadingFallback />}>
                          <VRScene
                            stage={currentStage}
                            currentStageIndex={walkStageIndex}
                            stageOrder={walkStages.map((s) => s.id)}
                            onNavigate={(id: string) => {
                              const nextIndex = walkStages.findIndex((stage) => stage.id === id);
                              if (nextIndex >= 0) setWalkStageIndex(nextIndex);
                            }}
                            onNavigatePrevious={() => {
                              setWalkStageIndex((current) => Math.max(0, current - 1));
                            }}
                            onPointOfInterestClick={handlePointOfInterestClick}
                            onPointOfInterestInfoClick={handlePointOfInterestInfoClick}
                            hiddenPoiInfoIconIds={hiddenPoiInfoIconIds}
                            ambientAudioEnabled={!isConversationMode && isSoundEnabled && !isNarrationPlaying}
                            narrationButtonLabel={ui.vrStartNarration}
                            conversationButtonLabel={ui.vrStartConversation}
                            narrationActive={isTtsEnabled}
                            conversationActive={isConversationMode}
                            onToggleNarration={handleNarrationToggle}
                            onToggleConversation={() => {
                              void handleConversationToggle();
                            }}
                            onLandmarkClick={(position) => {
                              void handleLandmarkClick(position);
                            }}
                          />
                        </Suspense>
                        <OrbitControls
                          ref={orbitControlsRef}
                          enableZoom
                          enablePan
                          rotateSpeed={-0.3}
                          dampingFactor={0.05}
                          enableDamping
                          autoRotate={autoRotateEnabled}
                          autoRotateSpeed={-0.4}
                        />
                      </XR>
                    </Canvas>
                  )}

                  {/* Fullscreen Toggle */}
                  <div className="absolute top-6 right-6 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button 
                      onClick={() => void toggleFullscreen()}
                      variant="outline" 
                      className="h-10 px-3 rounded-full border-white/20 bg-black/40 text-white flex items-center gap-1.5"
                      aria-label={isFullscreen ? ui.exitFullscreen : ui.enterFullscreen}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {isFullscreen ? ui.minimize : ui.fullscreen}
                      </span>
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* HUD controls (available in normal + fullscreen) */}
                  {selectedDestinationId ? (
                    <>
                      <div
                        className="absolute z-30 top-6 left-6 pointer-events-auto flex flex-wrap items-center gap-2"
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <Button
                          type="button"
                          onClick={() => zoomView("in")}
                          variant="outline"
                          className="h-8 px-2 rounded-full border-white/20 bg-black/50 text-white"
                          aria-label={ui.zoomIn}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => zoomView("out")}
                          variant="outline"
                          className="h-8 px-2 rounded-full border-white/20 bg-black/50 text-white"
                          aria-label={ui.zoomOut}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={resetView}
                          variant="outline"
                          className="h-8 px-2 rounded-full border-white/20 bg-black/50 text-white"
                          aria-label={ui.resetView}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setAutoRotateEnabled((prev) => !prev)}
                          variant="outline"
                          className={`h-8 px-3 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                            autoRotateEnabled
                              ? "bg-zim-gold text-zim-black border-zim-gold"
                              : "border-white/20 bg-black/50 text-white"
                          }`}
                          aria-label={ui.toggleAutoRotate}
                        >
                          {autoRotateEnabled ? ui.autoOn : ui.autoOff}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowStageInfo(true)}
                          variant="outline"
                          className="h-8 px-2 rounded-full border-white/20 bg-black/50 text-white"
                          aria-label={ui.showPlaceInformation}
                        >
                          <CircleHelp className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="absolute z-30 inset-x-0 bottom-4 flex flex-col items-center gap-2 pointer-events-none">
                        <div
                          className="pointer-events-auto rounded-2xl border border-zim-gold/40 bg-black/55 px-3 py-3 shadow-[0_0_30px_rgba(212,175,55,0.25)]"
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <div className="grid grid-cols-3 gap-1 items-center">
                            <span />
                            <Button
                              type="button"
                              onClick={() => rotateView("up")}
                              className="h-7 w-7 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                              aria-label={ui.lookUp}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <span />
                            <Button
                              type="button"
                              onClick={() => rotateView("left")}
                              className="h-7 w-7 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                              aria-label={ui.lookLeft}
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <span className="h-7 w-7" />
                            <Button
                              type="button"
                              onClick={() => rotateView("right")}
                              className="h-7 w-7 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                              aria-label={ui.lookRight}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <span />
                            <Button
                              type="button"
                              onClick={() => rotateView("down")}
                              className="h-7 w-7 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                              aria-label={ui.lookDown}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <span />
                          </div>
                        </div>
                        <p className="text-[9px] uppercase tracking-widest font-black  pointer-events-none">
                          {ui.walkthrough} {walkStageIndex + 1}/{walkStages.length}
                        </p>
                      </div>
                    </>
                  ) : null}

                  {showStageInfo && selectedDestinationId ? (
                    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/65 p-4">
                      <div className="w-full max-w-lg rounded-2xl border border-white/30 bg-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-black uppercase tracking-widest text-zim-gold">
                            {currentDestination.name} - {currentStage.title}
                          </h3>
                          <Button
                            onClick={() => setShowStageInfo(false)}
                            variant="outline"
                            className="h-7 px-2 rounded-full border-white/20 text-white bg-black/40"
                          >
                            {ui.close}
                          </Button>
                        </div>
                        <p className="text-sm  mt-3 leading-relaxed">{currentStage.caption}</p>
                        <p className="text-sm  mt-2 leading-relaxed">{currentDestination.summary}</p>
                        {currentDestination.locationHighlights?.length ? (
                          <div className="mt-3">
                            <p className="text-[10px] uppercase tracking-widest font-black text-zim-gold mb-1">{ui.highlights}</p>
                            <div className="space-y-1">
                              {currentDestination.locationHighlights.map((item) => (
                                <p key={item} className="text-xs  leading-relaxed">
                                  - {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {showPoiInfo && selectedDestinationId ? (
                    <div className="absolute inset-0 z-[130] flex items-center justify-center bg-black/65 p-4">
                      <div className="w-full max-w-lg rounded-2xl border border-white/30 bg-white/[0.08] backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-5">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-black uppercase tracking-widest text-zim-gold">
                            {poiInfoTitle}
                          </h3>
                          <Button
                            type="button"
                            onClick={() => setShowPoiInfo(false)}
                            variant="outline"
                            className="h-7 px-2 rounded-full border-white/20 text-white bg-black/40"
                          >
                            {ui.close}
                          </Button>
                        </div>
                        {poiInfoLoading ? (
                          <p className="text-sm  mt-3 leading-relaxed">{ui.loadingPoi}</p>
                        ) : (
                          <p className="text-sm  mt-3 leading-relaxed">{poiInfoText}</p>
                        )}
                      </div>
                    </div>
                  ) : null}

                </div>

                {/* CONTROL PANEL (AR-style structure) */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-zim-gold/20 bg-zim-gold/5 p-3 mt-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="h-2.5 w-2.5 text-zim-gold" />
                        <p className="text-[9px] uppercase tracking-widest font-black text-zim-gold">{ui.currentContext}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={handleConversationToggle}
                          variant="outline"
                          aria-pressed={isConversationMode}
                          className={`h-6 px-2.5 font-black uppercase tracking-widest text-[8px] leading-none rounded-full whitespace-nowrap shrink-0 border ${
                            isConversationMode
                              ? "bg-zim-gold text-zim-black border-zim-gold hover:bg-white"
                              : "border-white/20 text-white hover:bg-white hover:text-zim-black"
                          }`}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {isConversationMode ? ui.conversationOn : ui.conversationOff}
                        </Button>
                        {isConversationMode ? (
                          <Button
                            type="button"
                            onPointerDown={handlePushToTalkStart}
                            onPointerUp={handlePushToTalkEnd}
                            onPointerCancel={handlePushToTalkEnd}
                            onPointerLeave={handlePushToTalkEnd}
                            onKeyDown={(event) => {
                              if (event.key !== " " && event.key !== "Enter") return;
                              event.preventDefault();
                              handlePushToTalkStart();
                            }}
                            onKeyUp={(event) => {
                              if (event.key !== " " && event.key !== "Enter") return;
                              event.preventDefault();
                              handlePushToTalkEnd();
                            }}
                            variant="outline"
                            aria-label={isRecording ? ui.releaseToSend : ui.pushToTalk}
                            className={`h-6 px-2.5 font-black uppercase tracking-widest text-[8px] leading-none rounded-full whitespace-nowrap border ${
                              isRecording
                                ? "bg-zim-gold text-zim-black border-zim-gold"
                                : "border-white/20 text-white hover:bg-white hover:text-zim-black"
                            }`}
                          >
                            {isRecording ? ui.releaseToSend : ui.pushToTalk}
                          </Button>
                        ) : null}
                        <Button
                          onClick={() => {
                            if (!selectedDestinationId) return;
                            if (isConversationMode || isTtsEnabled || isNarrationPlaying) {
                              setIsSoundEnabled(false);
                              return;
                            }
                            setIsSoundEnabled((prev) => !prev);
                          }}
                          variant="outline"
                          className="h-6 px-2.5 border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[8px] leading-none rounded-full whitespace-nowrap"
                          aria-label={isSoundEnabled ? ui.muteAmbientSound : ui.enableAmbientSound}
                          disabled={!selectedDestinationId}
                        >
                          {isSoundEnabled ? <Volume2 className="h-3 w-3 mr-1" /> : <VolumeX className="h-3 w-3 mr-1" />}
                          {isSoundEnabled ? ui.ambientOnBadge : ui.ambientOffBadge}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleNarrationToggle}
                          variant="outline"
                          disabled={isConversationMode}
                          className={`h-6 px-2.5 font-black uppercase tracking-widest text-[8px] leading-none rounded-full whitespace-nowrap border ${
                            isTtsEnabled
                              ? "bg-zim-gold text-zim-black border-zim-gold hover:bg-white"
                              : "border-white/20 text-white hover:bg-white hover:text-zim-black"
                          }`}
                          aria-label={isTtsEnabled ? ui.disableTts : ui.enableTts}
                        >
                          {isTtsEnabled ? ui.narrationOn : ui.narrationOff}
                        </Button>
                        {isTtsEnabled ? (
                          <div className="h-6 px-2.5 border border-white/20 text-white rounded-full flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white">{ui.voice}</span>
                            <select
                              id="vr-voice-gender-inline"
                              value={selectedVoiceGender}
                              onChange={(event) => {
                                const nextGender = event.target.value as "male" | "female";
                                setSelectedVoiceGender(nextGender);
                                if (!isTtsEnabled || isConversationMode) return;
                                const replayText = String(virtualNarrative || currentStage.caption || currentDestination.summary || "").trim();
                                if (!replayText) return;
                                void (async () => {
                                  await unlockAudio();
                                  await speakWithTts(replayText, true);
                                })();
                              }}
                              className="bg-transparent text-[8px] font-black uppercase tracking-widest text-zim-gold focus:outline-none"
                            >
                              <option className="text-zim-gold bg-slate-950" value="male">{ui.male}</option>
                              <option className="text-zim-gold bg-slate-950" value="female">{ui.female}</option>
                            </select>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 border-t border-white/15" />
                    {selectedDestinationId ? (
                      <>
                        <h2 className="!text-lg font-black text-white leading-tight mt-2">{currentDestination.name}</h2>
                        <p className="text-[11px]  mt-1 leading-snug">{currentStage.caption}</p>
                      </>
                    ) : null}
                  </div>

                  
                </div>
              </div>

          </div>
        </div>
      </section>
    </Layout>
  );
}
