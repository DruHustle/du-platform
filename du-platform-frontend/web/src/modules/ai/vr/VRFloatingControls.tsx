import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function createButtonTexture({
  label,
  active,
  hovered,
  pressed,
}: {
  label: string;
  active: boolean;
  hovered: boolean;
  pressed: boolean;
}): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    empty.colorSpace = THREE.SRGBColorSpace;
    return empty;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const radius = 90;

  const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (active) {
    bg.addColorStop(0, "rgba(212,175,55,1)");
    bg.addColorStop(1, "rgba(250,204,21,1)");
  } else {
    bg.addColorStop(0, hovered ? "rgba(22,28,40,0.95)" : "rgba(15,23,42,0.92)");
    bg.addColorStop(1, hovered ? "rgba(38,49,67,0.95)" : "rgba(30,41,59,0.92)");
  }

  ctx.fillStyle = bg;
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

  ctx.strokeStyle = active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = hovered ? 12 : 8;
  ctx.stroke();

  if (pressed) {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 88px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillStyle = active ? "rgba(2,6,23,0.95)" : "rgba(255,255,255,0.97)";
  ctx.fillText(label, canvas.width * 0.5, canvas.height * 0.5 + 6);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function VRControlButton({
  label,
  active,
  onClick,
  position,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const texture = useMemo(
    () =>
      createButtonTexture({
        label,
        active,
        hovered,
        pressed,
      }),
    [label, active, hovered, pressed]
  );

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetScale = pressed ? 0.96 : hovered ? 1.05 : 1;
    const s = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, Math.min(1, delta * 14));
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      renderOrder={120}
    >
      <planeGeometry args={[0.78, 0.24]} />
      <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
}

export function VRFloatingControls({
  visible,
  narrationLabel,
  conversationLabel,
  narrationActive,
  conversationActive,
  onToggleNarration,
  onToggleConversation,
}: {
  visible: boolean;
  narrationLabel: string;
  conversationLabel: string;
  narrationActive: boolean;
  conversationActive: boolean;
  onToggleNarration: () => void;
  onToggleConversation: () => void;
}) {
  const { camera } = useThree();
  const panelRef = useRef<THREE.Group>(null);
  const forwardRef = useRef(new THREE.Vector3());
  const targetPositionRef = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!panelRef.current || !visible) return;

    forwardRef.current.set(0, -0.12, -1.75).applyQuaternion(camera.quaternion);
    targetPositionRef.current.copy(camera.position).add(forwardRef.current);

    panelRef.current.position.lerp(targetPositionRef.current, Math.min(1, delta * 10));
    panelRef.current.quaternion.slerp(camera.quaternion, Math.min(1, delta * 12));
  });

  if (!visible) return null;

  return (
    <group ref={panelRef}>
      <VRControlButton
        label={narrationLabel}
        active={narrationActive}
        onClick={onToggleNarration}
        position={[-0.44, 0, 0]}
      />
      <VRControlButton
        label={conversationLabel}
        active={conversationActive}
        onClick={onToggleConversation}
        position={[0.44, 0, 0]}
      />
    </group>
  );
}
