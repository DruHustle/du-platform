import * as Dialog from "@radix-ui/react-dialog";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  PointMaterial,
  Points,
  PositionalAudio,
  useTexture,
} from "@react-three/drei";
import { XR, createXRStore, useXR } from "@react-three/xr";
import * as THREE from "three";
import { PoiBillboard } from "@/modules/ai/vr/poiSystem";
import { VRFloatingControls } from "@/modules/ai/vr/VRFloatingControls";
import {
  getVrHintCopy,
  VR_UI_TEXT,
  type UiLanguage,
} from "./virtualExperienceText";
import type { Point3D, VirtualWalkStage } from "./virtualExperienceTypes";

type VrSupportState = "checking" | "supported" | "unsupported";
type VrSupportReason = "unavailable" | "insecure_context" | "check_failed";
type NavigatorWithXR = Navigator & {
  xr?: {
    isSessionSupported?: (mode: string) => Promise<boolean>;
  };
};

type VirtualExperienceCanvasProps = {
  uiLanguage: UiLanguage;
  stage: VirtualWalkStage;
  currentStageIndex: number;
  stageOrder: string[];
  hiddenPoiInfoIconIds: ReadonlySet<string>;
  ambientAudioEnabled: boolean;
  narrationButtonLabel: string;
  conversationButtonLabel: string;
  narrationActive: boolean;
  conversationActive: boolean;
  autoRotateEnabled: boolean;
  cameraRef: MutableRefObject<THREE.PerspectiveCamera | null>;
  orbitControlsRef: MutableRefObject<any>;
  onNavigate: (targetId: string) => void;
  onNavigatePrevious: () => void;
  onPointOfInterestClick: (poiLabel: string, poiPosition: Point3D) => void;
  onPointOfInterestInfoClick: (poiId: string, poiLabel: string) => void;
  onToggleNarration: () => void;
  onToggleConversation: () => void;
  onLandmarkClick: (position: Point3D) => void;
  onPointerMissed: () => void;
};

function createVrHintTexture(
  language: UiLanguage,
  stageTitle: string,
  interactionCount: number
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  const copy = getVrHintCopy(language, stageTitle, interactionCount);

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
  ctx.quadraticCurveTo(
    canvas.width,
    canvas.height,
    canvas.width - radius,
    canvas.height
  );
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
  ctx.fillText(copy.title, canvas.width * 0.5, 72);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "700 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(copy.stageLine, canvas.width * 0.5, 142);

  ctx.font = "600 30px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(copy.instructionLine, canvas.width * 0.5, 198);

  ctx.fillStyle = "rgba(148,163,184,0.95)";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(copy.interactionLine, canvas.width * 0.5, 252);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function VRSessionHintPanel({
  visible,
  language,
  stageTitle,
  interactionCount,
}: {
  visible: boolean;
  language: UiLanguage;
  stageTitle: string;
  interactionCount: number;
}) {
  const { camera } = useThree();
  const panelRef = useRef<THREE.Mesh>(null);
  const forwardRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3());
  const texture = useMemo(
    () => createVrHintTexture(language, stageTitle, interactionCount),
    [language, stageTitle, interactionCount]
  );

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((_, delta) => {
    if (!panelRef.current || !visible) return;
    forwardRef.current.set(0, 0.48, -1.75).applyQuaternion(camera.quaternion);
    targetPositionRef.current.copy(camera.position).add(forwardRef.current);
    panelRef.current.position.lerp(
      targetPositionRef.current,
      Math.min(1, delta * 8)
    );
    panelRef.current.quaternion.slerp(
      camera.quaternion,
      Math.min(1, delta * 10)
    );
  });

  if (!visible) return null;

  return (
    <mesh ref={panelRef} renderOrder={130}>
      <planeGeometry args={[1.18, 0.37]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
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
    forwardRef.current
      .set(0.72, -0.34, -1.42)
      .applyQuaternion(camera.quaternion);
    targetPositionRef.current.copy(camera.position).add(forwardRef.current);
    targetPositionRef.current.y += Math.sin(t * 2.1) * 0.025;
    groupRef.current.position.lerp(
      targetPositionRef.current,
      Math.min(1, delta * 10)
    );
    groupRef.current.quaternion.slerp(
      camera.quaternion,
      Math.min(1, delta * 10)
    );

    if (orbRef.current) {
      const targetScale = pressed ? 0.92 : hovered ? 1.12 : 1;
      const scale = THREE.MathUtils.lerp(
        orbRef.current.scale.x,
        targetScale,
        Math.min(1, delta * 12)
      );
      orbRef.current.scale.setScalar(scale);
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
        <meshBasicMaterial
          color={hovered ? "#facc15" : "#93c5fd"}
          transparent
          opacity={0.9}
        />
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
  position: Point3D;
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
      const scale = 1 + Math.sin(t * 2.4) * 0.08 + hoverBoost + clickBoost;
      ringRef.current.scale.set(scale, scale, scale);
    }
    if (haloRef.current) {
      haloRef.current.lookAt(camera.position);
      const scale =
        1.08 + Math.sin(t * 1.6) * 0.1 + hoverBoost * 0.6 + clickBoost * 0.8;
      haloRef.current.scale.set(scale, scale, scale);
    }
    if (hitRef.current) {
      hitRef.current.lookAt(camera.position);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <ringGeometry args={[0.28, 0.4, 48]} />
        <meshBasicMaterial
          color={hovered ? "#facc15" : "#d4af37"}
          transparent
          opacity={hovered ? 0.45 : 0.3}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.2, 0.26, 48]} />
        <meshBasicMaterial
          color={hovered ? "#fde047" : "#facc15"}
          transparent
          opacity={hovered ? 1 : 0.92}
        />
      </mesh>
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
  position: Point3D;
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
      const scale = 1 + Math.sin(t * 2.2) * 0.08 + hoverBoost + clickBoost;
      ringRef.current.scale.set(scale, scale, scale);
    }
    if (haloRef.current) {
      haloRef.current.lookAt(camera.position);
      const scale =
        1.08 + Math.sin(t * 1.5) * 0.1 + hoverBoost * 0.6 + clickBoost * 0.8;
      haloRef.current.scale.set(scale, scale, scale);
    }
    if (hitRef.current) {
      hitRef.current.lookAt(camera.position);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <ringGeometry args={[0.28, 0.4, 48]} />
        <meshBasicMaterial
          color={hovered ? "#93c5fd" : "#60a5fa"}
          transparent
          opacity={hovered ? 0.45 : 0.28}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.2, 0.26, 48]} />
        <meshBasicMaterial
          color={hovered ? "#dbeafe" : "#93c5fd"}
          transparent
          opacity={hovered ? 1 : 0.9}
        />
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
  position: Point3D;
  onClick: (position: Point3D) => void;
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

    groupRef.current.position.set(
      position[0],
      position[1] + floatOffset,
      position[2]
    );
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

function InterestRing({
  position,
  label,
  onClick,
  onInfoClick,
  infoHidden,
}: {
  position: Point3D;
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
      const scale = 1 + Math.sin(t * 2.2) * 0.06 + hoverBoost + clickBoost;
      ringRef.current.scale.set(scale, scale, scale);
    }
    if (haloRef.current) {
      haloRef.current.lookAt(camera.position);
      const scale =
        1.06 + Math.sin(t * 1.7) * 0.08 + hoverBoost * 0.55 + clickBoost * 0.75;
      haloRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={haloRef}>
        <ringGeometry args={[0.22, 0.3, 40]} />
        <meshBasicMaterial
          color={hovered ? "#60a5fa" : "#3b82f6"}
          transparent
          opacity={hovered ? 0.34 : 0.22}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.17, 0.2, 40]} />
        <meshBasicMaterial
          color={hovered ? "#dbeafe" : "#93c5fd"}
          transparent
          opacity={hovered ? 0.95 : 0.8}
        />
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
        <meshBasicMaterial
          color={hovered ? "#ffffff" : "#dbeafe"}
          transparent
          opacity={hovered ? 1 : 0.95}
        />
      </mesh>
      <PoiBillboard
        label={label}
        onInfoClick={onInfoClick}
        infoHidden={infoHidden}
      />
    </group>
  );
}

function AtmosphericParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const points = useMemo(() => {
    const nextPoints = new Float32Array(300);
    for (let index = 0; index < nextPoints.length; index += 1) {
      nextPoints[index] = (Math.random() - 0.5) * 12;
    }
    return nextPoints;
  }, []);

  useFrame(state => {
    if (!pointsRef.current) return;
    const t = state.clock.elapsedTime;
    pointsRef.current.rotation.y = t * 0.015;
    pointsRef.current.rotation.x = Math.sin(t * 0.25) * 0.05;
  });

  return (
    <Points ref={pointsRef as any} positions={points} stride={3}>
      <PointMaterial
        transparent
        color="#fff"
        size={0.012}
        sizeAttenuation
        depthWrite={false}
        opacity={0.2}
      />
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

function VrSessionStateSync({
  onChange,
}: {
  onChange: (isInVrSession: boolean) => void;
}) {
  const isInVrSession = useXR(state => state.mode === "immersive-vr");

  useEffect(() => {
    onChange(isInVrSession);
  }, [isInVrSession, onChange]);

  return null;
}

function VrQuickAction({
  visible,
  ui,
  isVrSessionActive,
  isEnteringVr,
  canEnterVr,
  onEnterVr,
}: {
  visible: boolean;
  ui: Record<string, string>;
  isVrSessionActive: boolean;
  isEnteringVr: boolean;
  canEnterVr: boolean;
  onEnterVr: () => void;
}) {
  if (!visible) return null;

  return (
    <Html fullscreen>
      <div className="pointer-events-none absolute inset-0 z-40">
        <div className="absolute left-4 right-4 top-20 flex justify-end sm:left-auto sm:right-6 sm:top-20">
          <div
            className="pointer-events-auto w-full max-w-[16rem] rounded-2xl border border-white/15 bg-slate-950/80 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.38)] backdrop-blur-md"
            onPointerDown={event => event.stopPropagation()}
          >
            <p
              className="text-[10px] font-black uppercase tracking-[0.22em] text-zim-gold"
              aria-live="polite"
            >
              {isVrSessionActive ? ui.vrActive : ui.vrReady}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/78">
              {isVrSessionActive ? ui.vrActiveDetails : ui.vrReadyDetails}
            </p>
            {canEnterVr ? (
              <button
                type="button"
                onClick={onEnterVr}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-zim-gold px-4 text-[10px] font-black uppercase tracking-widest text-zim-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/65"
                disabled={isEnteringVr}
              >
                {isEnteringVr ? ui.enteringVr : ui.enterVr}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Html>
  );
}

function VrSupportPopup({
  open,
  ui,
  supportReason,
  launchError,
  onClose,
}: {
  open: boolean;
  ui: Record<string, string>;
  supportReason: VrSupportReason | null;
  launchError: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const title = ui.vrUnavailable;
  const body = launchError
    ? launchError
    : supportReason === "insecure_context"
      ? ui.vrSecureContextRequired
      : supportReason === "check_failed"
        ? ui.vrLaunchFailed
        : ui.vrUnavailableDetails;

  return (
    <Html fullscreen>
      <Dialog.Root
        open={open}
        onOpenChange={next => {
          if (!next) onClose();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[300] bg-black/55 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[301] w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[1.75rem] border border-white/15 bg-slate-950 p-6 text-white shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
              <Dialog.Title className="text-[10px] font-black uppercase tracking-[0.24em] text-zim-gold">
                {title}
              </Dialog.Title>
              <Dialog.Close
                aria-label={ui.close}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white hover:text-zim-black"
              >
                ×
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-3 text-sm leading-relaxed text-white/80">
              {body}
            </Dialog.Description>
            <div className="mt-5 flex justify-end">
              <Dialog.Close className="inline-flex h-11 items-center justify-center rounded-full bg-zim-gold px-4 text-[10px] font-black uppercase tracking-widest text-zim-black hover:bg-white">
                {ui.close}
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Html>
  );
}

function VRScene({
  uiLanguage,
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
  uiLanguage: UiLanguage;
  stage: VirtualWalkStage;
  currentStageIndex: number;
  stageOrder: string[];
  onNavigate: (targetId: string) => void;
  onNavigatePrevious: () => void;
  onPointOfInterestClick: (poiLabel: string, poiPosition: Point3D) => void;
  onPointOfInterestInfoClick: (poiId: string, poiLabel: string) => void;
  hiddenPoiInfoIconIds: ReadonlySet<string>;
  ambientAudioEnabled: boolean;
  narrationButtonLabel: string;
  conversationButtonLabel: string;
  narrationActive: boolean;
  conversationActive: boolean;
  onToggleNarration: () => void;
  onToggleConversation: () => void;
  onLandmarkClick: (position: Point3D) => void;
}) {
  const { scene } = useThree();
  const ambientAudioRef = useRef<THREE.PositionalAudio>(null);
  const isInVrSession = useXR(state => state.mode === "immersive-vr");
  const [showVrHint, setShowVrHint] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const guideOrbCooldownRef = useRef(0);

  const registerVrInteraction = useCallback(() => {
    setInteractionCount(count => count + 1);
    setShowVrHint(false);
  }, []);

  const hotspotBuckets = useMemo(() => {
    const byId = new Map(stageOrder.map((id, index) => [id, index]));
    const all = stage.hotspots ?? [];
    const forward = all.filter(hotspot => {
      const targetIdx = byId.get(hotspot.targetId);
      return typeof targetIdx === "number"
        ? targetIdx > currentStageIndex
        : !/back/i.test(hotspot.label);
    });
    const backward = all.filter(hotspot => {
      const targetIdx = byId.get(hotspot.targetId);
      return typeof targetIdx === "number"
        ? targetIdx < currentStageIndex
        : /back/i.test(hotspot.label);
    });
    return { forward, backward };
  }, [stage.hotspots, stageOrder, currentStageIndex]);

  const texture = useTexture(stage.image) as THREE.Texture;

  useEffect(() => {
    if (!(texture instanceof THREE.Texture)) return;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;

    scene.background = texture;
    scene.environment = texture;

    return () => {
      if (scene.background === texture) scene.background = null;
      if (scene.environment === texture) scene.environment = null;
    };
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

  useEffect(() => {
    return () => {
      const audioNode = ambientAudioRef.current;
      if (audioNode?.isPlaying) {
        audioNode.pause();
      }
    };
  }, []);

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
      {hotspotBuckets.forward.map(hotspot => (
        <ForwardWalkRing
          key={`forward-${hotspot.targetId}`}
          position={hotspot.position}
          onClick={() => {
            registerVrInteraction();
            onNavigate(hotspot.targetId);
          }}
        />
      ))}
      {hotspotBuckets.backward.map(hotspot => (
        <BackwardWalkRing
          key={`back-${hotspot.targetId}`}
          position={hotspot.position}
          onClick={() => {
            registerVrInteraction();
            onNavigatePrevious();
          }}
        />
      ))}
      {stage.pointsOfInterest?.map(poi => (
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
        onClick={position => {
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
        language={uiLanguage}
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

export default function VirtualExperienceCanvas({
  uiLanguage,
  stage,
  currentStageIndex,
  stageOrder,
  hiddenPoiInfoIconIds,
  ambientAudioEnabled,
  narrationButtonLabel,
  conversationButtonLabel,
  narrationActive,
  conversationActive,
  autoRotateEnabled,
  cameraRef,
  orbitControlsRef,
  onNavigate,
  onNavigatePrevious,
  onPointOfInterestClick,
  onPointOfInterestInfoClick,
  onToggleNarration,
  onToggleConversation,
  onLandmarkClick,
  onPointerMissed,
}: VirtualExperienceCanvasProps) {
  const ui = useMemo(
    () =>
      ({ ...VR_UI_TEXT.en, ...(VR_UI_TEXT[uiLanguage] ?? {}) }) as Record<
        string,
        string
      >,
    [uiLanguage]
  );
  const [xrStore] = useState(() =>
    createXRStore({
      emulate: false,
      baseAssetPath: new URL("/xr/profiles/", window.location.origin).href,
      defaultControllerProfileId: "generic-trigger-squeeze-thumbstick",
    })
  );

  const mounted = useRef(true);
  const [vrSupportState, setVrSupportState] =
    useState<VrSupportState>("checking");
  const [vrSupportReason, setVrSupportReason] =
    useState<VrSupportReason | null>(null);
  const [isVrSessionActive, setIsVrSessionActive] = useState(false);
  const [isEnteringVr, setIsEnteringVr] = useState(false);
  const [vrLaunchError, setVrLaunchError] = useState<string | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [isVrPopupOpen, setIsVrPopupOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (typeof window === "undefined") {
      setVrSupportState("unsupported");
      setVrSupportReason("unavailable");
      return;
    }

    if (!window.isSecureContext) {
      setVrSupportState("unsupported");
      setVrSupportReason("insecure_context");
      return;
    }

    const xr = (navigator as NavigatorWithXR).xr;
    if (xr == null || typeof xr.isSessionSupported !== "function") {
      setVrSupportState("unsupported");
      setVrSupportReason("unavailable");
      return;
    }

    setVrSupportState("checking");
    setVrSupportReason(null);

    xr.isSessionSupported("immersive-vr")
      .then(supported => {
        if (cancelled) return;
        setVrSupportState(supported ? "supported" : "unsupported");
        setVrSupportReason(supported ? null : "unavailable");
      })
      .catch(() => {
        if (cancelled) return;
        setVrSupportState("unsupported");
        setVrSupportReason("check_failed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isVrSessionActive) return;
    setVrLaunchError(null);
    setIsEnteringVr(false);
    setIsVrPopupOpen(false);
  }, [isVrSessionActive]);

  useEffect(() => {
    if (vrSupportState === "unsupported") {
      setIsVrPopupOpen(true);
      return;
    }
    if (!vrLaunchError) {
      setIsVrPopupOpen(false);
    }
  }, [vrLaunchError, vrSupportReason, vrSupportState]);

  useEffect(() => {
    if (vrLaunchError) {
      setIsVrPopupOpen(true);
    }
  }, [vrLaunchError]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (!mounted.current) xrStore.destroy();
      });
      void xrStore
        .getState()
        .session?.end()
        .catch(() => undefined);
      cameraRef.current = null;
      orbitControlsRef.current = null;
    };
  }, [cameraRef, orbitControlsRef, xrStore]);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;
    controls.autoRotate = autoRotateEnabled;
    controls.autoRotateSpeed = -0.4;
    controls.update?.();
  }, [autoRotateEnabled, orbitControlsRef]);

  const handleEnterVr = useCallback(() => {
    if (
      vrSupportState !== "supported" ||
      isVrSessionActive ||
      isEnteringVr ||
      !isCanvasReady
    )
      return;

    setIsEnteringVr(true);
    setVrLaunchError(null);

    void xrStore
      .enterVR()
      .then(session => {
        // Permission may resolve after this canvas was removed.
        if (!mounted.current) return session?.end().catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (!mounted.current) return;
        const name = error instanceof Error ? error.name : "";
        if (name === "SecurityError") {
          setVrLaunchError(ui.vrSecureContextRequired);
          return;
        }
        if (name === "NotSupportedError") {
          setVrLaunchError(ui.vrUnavailableDetails);
          return;
        }
        setVrLaunchError(ui.vrLaunchFailed);
      })
      .finally(() => {
        if (!mounted.current) return;
        setIsEnteringVr(false);
      });
  }, [isCanvasReady, isEnteringVr, isVrSessionActive, ui, vrSupportState]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 0.1], fov: 65 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ background: "#000000" }}
      onPointerMissed={onPointerMissed}
      onCreated={({ camera, gl }) => {
        gl.xr.enabled = true;
        gl.setClearColor(0x000000, 1);
        cameraRef.current = camera as THREE.PerspectiveCamera;
        setIsCanvasReady(true);
      }}
    >
      <XR store={xrStore}>
        <VrSessionStateSync onChange={setIsVrSessionActive} />
        <Suspense fallback={<SceneLoadingFallback />}>
          <VRScene
            uiLanguage={uiLanguage}
            stage={stage}
            currentStageIndex={currentStageIndex}
            stageOrder={stageOrder}
            onNavigate={onNavigate}
            onNavigatePrevious={onNavigatePrevious}
            onPointOfInterestClick={onPointOfInterestClick}
            onPointOfInterestInfoClick={onPointOfInterestInfoClick}
            hiddenPoiInfoIconIds={hiddenPoiInfoIconIds}
            ambientAudioEnabled={ambientAudioEnabled}
            narrationButtonLabel={narrationButtonLabel}
            conversationButtonLabel={conversationButtonLabel}
            narrationActive={narrationActive}
            conversationActive={conversationActive}
            onToggleNarration={onToggleNarration}
            onToggleConversation={onToggleConversation}
            onLandmarkClick={onLandmarkClick}
          />
        </Suspense>
        <VrQuickAction
          visible={
            (vrSupportState === "supported" && isCanvasReady) ||
            isVrSessionActive
          }
          ui={ui}
          isVrSessionActive={isVrSessionActive}
          isEnteringVr={isEnteringVr}
          canEnterVr={
            vrSupportState === "supported" &&
            !isVrSessionActive &&
            isCanvasReady
          }
          onEnterVr={handleEnterVr}
        />
        <VrSupportPopup
          open={isVrPopupOpen}
          ui={ui}
          supportReason={vrSupportReason}
          launchError={vrLaunchError}
          onClose={() => setIsVrPopupOpen(false)}
        />
        <OrbitControls
          ref={orbitControlsRef}
          enabled={!isVrSessionActive}
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
  );
}
