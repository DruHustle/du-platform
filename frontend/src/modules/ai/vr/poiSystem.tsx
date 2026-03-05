import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const POI_ICON_URL = "/images/pages/tourism/vr-walk/poi-info-icon.png";

function makeCanvasTexture(draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    draw(ctx, canvas);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createPoiLabelTexture(label: string): THREE.CanvasTexture {
  return makeCanvasTexture((ctx, canvas) => {
    const padX = 30;
    const padY = 20;
    const font = "700 46px system-ui, -apple-system, Segoe UI, sans-serif";

    ctx.font = font;
    const textWidth = Math.ceil(ctx.measureText(label).width);
    const boxWidth = Math.min(canvas.width - padX * 2, textWidth + padX * 2);
    const boxHeight = 92;
    const x = (canvas.width - boxWidth) * 0.5;
    const y = (canvas.height - boxHeight) * 0.5;
    const radius = 24;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(8, 15, 30, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + boxWidth - radius, y);
    ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + radius);
    ctx.lineTo(x + boxWidth, y + boxHeight - radius);
    ctx.quadraticCurveTo(x + boxWidth, y + boxHeight, x + boxWidth - radius, y + boxHeight);
    ctx.lineTo(x + radius, y + boxHeight);
    ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font;
    ctx.fillText(label, canvas.width * 0.5, canvas.height * 0.5 + 2);
  });
}

function createFallbackInfoIconTexture(): THREE.CanvasTexture {
  return makeCanvasTexture((ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    const radius = 110;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "rgba(212, 175, 55, 1)");
    grad.addColorStop(1, "rgba(250, 215, 120, 1)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 150px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("i", cx, cy + 8);
  });
}

function usePoiIconTexture(url: string = POI_ICON_URL) {
  const [texture, setTexture] = useState<THREE.Texture>(() => createFallbackInfoIconTexture());

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();

    loader.load(
      url,
      (loaded) => {
        if (cancelled) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.needsUpdate = true;
        setTexture((prev) => {
          if (prev !== loaded && prev instanceof THREE.Texture) {
            prev.dispose();
          }
          return loaded;
        });
      },
      undefined,
      () => {
        if (cancelled) return;
        setTexture((prev) => prev ?? createFallbackInfoIconTexture());
      }
    );

    return () => {
      cancelled = true;
    };
  }, [url]);

  return texture;
}

export function PoiBillboard({
  label,
  onInfoClick,
  infoHidden,
  position = [0, 0.34, 0],
}: {
  label: string;
  onInfoClick: () => void;
  infoHidden?: boolean;
  position?: [number, number, number];
}) {
  const { camera } = useThree();
  const iconRef = useRef<THREE.Sprite>(null);
  const labelRef = useRef<THREE.Sprite>(null);
  const rootRef = useRef<THREE.Group>(null);
  const worldPositionRef = useRef(new THREE.Vector3());
  const [hovered, setHovered] = useState(false);

  const labelTexture = useMemo(() => createPoiLabelTexture(label), [label]);
  const iconTexture = usePoiIconTexture();

  useEffect(() => {
    return () => {
      labelTexture.dispose();
    };
  }, [labelTexture]);

  useFrame(() => {
    if (!rootRef.current || !labelRef.current || !iconRef.current) return;
    rootRef.current.getWorldPosition(worldPositionRef.current);
    const dist = camera.position.distanceTo(worldPositionRef.current);
    const base = THREE.MathUtils.clamp(dist * 0.09, 0.65, 1.35);

    labelRef.current.scale.set(base * 1.6, base * 0.58, 1);
    const iconScale = hovered ? base * 0.52 : base * 0.44;
    iconRef.current.scale.set(iconScale, iconScale, 1);
  });

  return (
    <group ref={rootRef} position={position}>
      <sprite ref={labelRef} renderOrder={90}>
        <spriteMaterial map={labelTexture} transparent depthWrite={false} depthTest={false} />
      </sprite>

      {infoHidden ? null : (
        <sprite
          ref={iconRef}
          position={[0, -0.24, 0]}
          renderOrder={95}
          onClick={onInfoClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <spriteMaterial map={iconTexture} transparent depthWrite={false} depthTest={false} />
        </sprite>
      )}
    </group>
  );
}
