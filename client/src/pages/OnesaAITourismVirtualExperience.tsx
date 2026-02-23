import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useTexture, Points, PointMaterial, PositionalAudio } from "@react-three/drei";
import { XR, createXRStore } from "@react-three/xr";
import * as THREE from "three";
import { ACESFilmicToneMapping, Vector3 } from "three";
import { MapPin, Maximize, Minimize, MessageSquare, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { sendOnesaChatMessage } from "./OnesaAI";
import { useTranslation } from "react-i18next";
import ZimbabweInteractiveGlobe from "@/components/ZimbabweInteractiveGlobe";

const xrStore = createXRStore({ controller: { teleportPointer: {} } });

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

// --- 3D SUB-COMPONENTS ---

function VRScene({
  stage,
  onNavigate,
  ambientAudioEnabled,
}: {
  stage: VirtualWalkStage;
  onNavigate: (targetId: string) => void;
  ambientAudioEnabled: boolean;
}) {
  const { scene } = useThree();
  
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

  return (
    <group>
      {ambientAudioEnabled ? (
        <PositionalAudio
          url="/sounds/nature_ambient.mp3"
          loop
          autoplay
          distance={60}
        />
      ) : null}
      <AtmosphericParticles />
      {stage.hotspots?.map((hs) => (
        <GazeHotspot 
          key={hs.targetId} 
          position={hs.position} 
          label={hs.label} 
          onClick={() => onNavigate(hs.targetId)} 
        />
      ))}
      {stage.pointsOfInterest?.map((poi) => (
        <InterestRing key={poi.id} position={poi.position} label={poi.label} />
      ))}
    </group>
  );
}

function GazeHotspot({
  position,
  label,
  onClick,
}: {
  position: [number, number, number];
  label: string;
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
      <Html distanceFactor={8} position={[0, 0.4, 0]} center>
        <div className={`transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="rounded-full bg-black/90 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white border border-zim-gold/40 shadow-xl">
            {label}
          </div>
        </div>
      </Html>
    </group>
  );
}

function InterestRing({
  position,
  label,
}: {
  position: [number, number, number];
  label: string;
}) {
  const { camera } = useThree();
  const ringRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.lookAt(camera.position);
      const s = 1 + Math.sin(t * 2.2) * 0.06;
      ringRef.current.scale.set(s, s, s);
    }
    if (haloRef.current) {
      haloRef.current.lookAt(camera.position);
      const s = 1.06 + Math.sin(t * 1.7) * 0.08;
      haloRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <ringGeometry args={[0.22, 0.3, 40]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.22} />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.17, 0.2, 40]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.8} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.03, 20]} />
        <meshBasicMaterial color="#dbeafe" transparent opacity={0.95} />
      </mesh>
      <Html distanceFactor={9} position={[0, 0.33, 0]} center>
        <div className="rounded-full bg-slate-950/90 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-100 border border-blue-200/40 shadow-xl">
          {label}
        </div>
      </Html>
    </group>
  );
}

function AtmosphericParticles() {
  const points = useMemo(() => new Float32Array(300).map(() => (Math.random() - 0.5) * 12), []);
  return (
    <Points positions={points} stride={3}>
      <PointMaterial transparent color="#fff" size={0.012} sizeAttenuation depthWrite={false} opacity={0.2} />
    </Points>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function OnesaAITourismVirtualExperience() {
  const { i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [virtualNarrative, setVirtualNarrative] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [walkStageIndex, setWalkStageIndex] = useState(0);
  const [isConversationMode, setIsConversationMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [aiStatus, setAiStatus] = useState("System Ready");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const destinations: VirtualDestination[] = useMemo(
    () => [
      {
        id: "cape_town",
        name: "Cape Town",
        image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
        vibe: "Clifftop + Coastal View",
        summary:
          "This virtual scene uses Cape Town sample panoramas for orientation and interaction testing before final destination media is added.",
        experiences: [],
        coordinates: "-33.9249, 18.4241",
        locationHighlights: [
          "Clifftop ridge perspective",
          "Rock arch framing point",
          "Panoramic summit viewpoint",
        ],
        walkStages: [
          {
            id: "vf360_1",
            title: "Clifftop Vista",
            image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
            caption:
              "High ridge orientation point with full landscape context before the falls edge.",
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
            caption: "Cave-like opening framing a panoramic valley perspective.",
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
              "Wide sky-and-ridge panorama to close the Cape Town sample 360 walkthrough.",
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

  const currentDestination =
    destinations.find((destination) => destination.id === selectedDestinationId) ?? destinations[0];
  const walkStages = currentDestination.walkStages;
  const currentStage = walkStages[walkStageIndex];
  const sidebarNarration = useMemo(() => {
    if (!isConversationMode) {
      return [currentDestination.summary, `Stage: ${currentStage.title}`, currentStage.caption].join(" ");
    }
    return virtualNarrative;
  }, [currentDestination.summary, currentStage.caption, currentStage.title, isConversationMode, virtualNarrative]);
  const sidebarNarrationLines = useMemo(() => formatNarrationLines(sidebarNarration), [sidebarNarration]);

  useEffect(() => {
    if (walkStageIndex >= walkStages.length) {
      setWalkStageIndex(0);
    }
  }, [walkStageIndex, walkStages.length]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!selectedDestinationId || isConversationMode) return;
    const destination = destinations.find((item) => item.id === selectedDestinationId);
    if (!destination) return;
    const runNarration = async () => {
      setLoading(true);
      setAiStatus("Guide is thinking...");
      try {
        const prompt = [
          "Provide a concise, visitor-friendly narration for this destination in 3-4 sentences.",
          `Destination: ${destination.name}.`,
          `Summary: ${destination.summary}`,
          destination.locationHighlights?.length
            ? `Highlights: ${destination.locationHighlights.join("; ")}.`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
        const { data } = await sendOnesaChatMessage({
          messages: [{ role: "user", content: prompt }],
          language: i18n.resolvedLanguage ?? "en",
        });
        const reply = String(data?.reply ?? "").trim();
        setVirtualNarrative(reply || destination.summary);
      } catch {
        setVirtualNarrative(destination.summary);
      } finally {
        setAiStatus("System Ready");
        setLoading(false);
      }
    };
    void runNarration();
  }, [destinations, i18n.resolvedLanguage, isConversationMode, selectedDestinationId]);

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

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural")) || voices[0];
    window.speechSynthesis.speak(utterance);
  };

  const processConversation = async (blob: Blob) => {
    setLoading(true);
    setAiStatus("Transcribing...");
    try {
      // 1. Send to Whisper API
      const res = await fetch("/api/whisper", { method: "POST", body: blob });
      const { text } = await res.json();
      
      if (!text) throw new Error("No transcription");
      setAiStatus("Guide is thinking...");

      // 2. Send text to Onesa AI
      const { data } = await sendOnesaChatMessage({
        messages: [{ role: "user", content: text }],
        language: i18n.resolvedLanguage ?? "en",
      });

      const reply = data?.reply || "I am currently analyzing the scenery.";
      setVirtualNarrative(reply);
      speak(reply);
      setAiStatus("System Ready");
    } catch (err) {
      setAiStatus("Voice Error");
    } finally {
      setLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      mediaRecorder.current?.stop();
      setIsRecording(false);
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder.current = new MediaRecorder(stream);
        audioChunks.current = [];
        mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
        mediaRecorder.current.onstop = () => processConversation(new Blob(audioChunks.current));
        mediaRecorder.current.start();
        setIsRecording(true);
        setAiStatus("Listening...");
      });
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      await document.exitFullscreen?.();
      return;
    }
    await containerRef.current.requestFullscreen?.();
  };

  return (
    <Layout>
      {/* Page shell */}
      <section className="pt-28 pb-0 md:pt-32 bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          {/* Glass container for the full VR walkthrough layout */}
          <div className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:p-10">
            
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
                      setSelectedDestinationId(event.target.value);
                      setWalkStageIndex(0);
                    }}
                  >
                    <option value="" disabled>
                      Select destination
                    </option>
                    {destinations.map((destination) => (
                      <option key={destination.id} value={destination.id}>
                        {destination.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mt-2 border-t border-white/10 pt-3">
                  <p className="text-[10px] uppercase tracking-widest font-black text-zim-gold mb-1">
                    {selectedDestinationId ? "Narration" : "Select location"}
                  </p>
                  {!selectedDestinationId ? null : sidebarNarrationLines.length > 0 ? (
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
                      Narration will appear here once AI guidance is generated.
                    </p>
                  )}
                </div>
                <p className="m-0 text-[11px] text-white/60 leading-relaxed mt-auto">
                  Conversation {isConversationMode ? "enabled" : "disabled"}. Ambient sound is {isSoundEnabled ? "on" : "off"}.
                </p>
              </div>

              {/* MAIN VIEWPORT */}
              <div className="lg:col-span-9 flex flex-col gap-4">
                {/* 360 viewport */}
                <div
                  ref={containerRef}
                  className="rounded-2xl border border-white/15 overflow-hidden bg-black h-[500px] md:h-[600px] relative group"
                >
                  {!selectedDestinationId ? (
                    <ZimbabweInteractiveGlobe />
                  ) : (
                    <Canvas
                      camera={{ position: [0, 0, 0.1], fov: 65 }}
                      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
                    >
                      <XR store={xrStore}>
                        <VRScene
                          stage={currentStage}
                          onNavigate={(id: string) => {
                            const nextIndex = walkStages.findIndex((stage) => stage.id === id);
                            if (nextIndex >= 0) setWalkStageIndex(nextIndex);
                          }}
                          ambientAudioEnabled={!isConversationMode && isSoundEnabled}
                        />
                        <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.3} dampingFactor={0.05} enableDamping />
                      </XR>
                    </Canvas>
                  )}

                  {/* Fullscreen Toggle */}
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      onClick={() => void toggleFullscreen()}
                      variant="outline" 
                      className="h-10 w-10 p-0 rounded-full border-white/20 bg-black/40 text-white"
                      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* CONTROL PANEL (AR-style structure) */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-zim-gold/20 bg-zim-gold/5 p-3 mt-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="h-2.5 w-2.5 text-zim-gold" />
                        <p className="text-[9px] uppercase tracking-widest font-black text-zim-gold whitespace-nowrap">Current Context</p>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Button
                          onClick={() => setIsConversationMode((current) => !current)}
                          variant="outline"
                          aria-pressed={isConversationMode}
                          className={`h-6 px-2.5 font-black uppercase tracking-widest text-[8px] leading-none rounded-full whitespace-nowrap shrink-0 border ${
                            isConversationMode
                              ? "bg-zim-gold text-zim-black border-zim-gold hover:bg-white"
                              : "border-white/20 text-white hover:bg-white hover:text-zim-black"
                          }`}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {isConversationMode ? "Conversation: On" : "Conversation: Off"}
                        </Button>
                        <Button
                          onClick={() => setIsSoundEnabled((prev) => !prev)}
                          variant="outline"
                          className="h-6 px-2.5 border-white/20 text-white hover:bg-white hover:text-zim-black font-black uppercase tracking-widest text-[8px] leading-none rounded-full whitespace-nowrap"
                          aria-label={isSoundEnabled ? "Mute ambient sound" : "Enable ambient sound"}
                        >
                          {isSoundEnabled ? <Volume2 className="h-3 w-3 mr-1" /> : <VolumeX className="h-3 w-3 mr-1" />}
                          {isSoundEnabled ? "Ambient: On" : "Ambient: Off"}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 border-t border-white/15" />
                    {selectedDestinationId ? (
                      <>
                        <h2 className="!text-lg font-black text-white leading-tight mt-2">{currentDestination.name}</h2>
                        <p className="text-[11px] text-white/70 mt-1 leading-snug">{currentStage.caption}</p>
                      </>
                    ) : null}
                  </div>

                  
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
