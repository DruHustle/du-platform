import * as THREE from "three";

type OrbitLikeControls = {
  target?: THREE.Vector3;
  update?: () => void;
};

type FocusAnimationOptions = {
  camera: THREE.PerspectiveCamera;
  lookAt: THREE.Vector3;
  controls?: OrbitLikeControls | null;
  durationMs?: number;
  targetFov?: number;
  onComplete?: () => void;
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Smoothly focuses the VR camera toward a point with optional FOV tween.
 * Returns a cancellation function.
 */
export function animateCameraFocus({
  camera,
  lookAt,
  controls,
  durationMs = 650,
  targetFov = 48,
  onComplete,
}: FocusAnimationOptions): () => void {
  const startTime = performance.now();
  const startQuat = camera.quaternion.clone();
  const startFov = camera.fov;

  const targetQuat = new THREE.Quaternion();
  const lookMatrix = new THREE.Matrix4();
  lookMatrix.lookAt(camera.position, lookAt, camera.up);
  targetQuat.setFromRotationMatrix(lookMatrix);

  let frame: number | null = null;
  let cancelled = false;

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = easeInOutCubic(t);

    camera.quaternion.slerpQuaternions(startQuat, targetQuat, eased);
    camera.fov = THREE.MathUtils.lerp(startFov, targetFov, eased);
    camera.updateProjectionMatrix();

    if (controls?.target) {
      controls.target.lerp(lookAt, eased * 0.2);
    }
    controls?.update?.();

    if (t < 1) {
      frame = window.requestAnimationFrame(tick);
    } else {
      frame = null;
      onComplete?.();
    }
  };

  frame = window.requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  };
}

/**
 * Lightweight interaction manager for pointer and controller raycasting.
 * Useful for desktop fallback interaction paths outside r3f pointer handlers.
 */
export class SceneInteractionManager {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerNdc = new THREE.Vector2();

  constructor(
    private readonly camera: THREE.Camera,
    private readonly domElement: HTMLElement
  ) {}

  setPointerFromEvent(event: PointerEvent) {
    const rect = this.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerNdc.set(x, y);
  }

  raycast(objects: THREE.Object3D[]) {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }
}

export function raycastFromController(
  controller: THREE.Object3D,
  objects: THREE.Object3D[],
  raycaster: THREE.Raycaster = new THREE.Raycaster()
) {
  const origin = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0, -1);
  const rotation = new THREE.Matrix4();

  rotation.identity().extractRotation(controller.matrixWorld);
  origin.setFromMatrixPosition(controller.matrixWorld);
  direction.applyMatrix4(rotation).normalize();

  raycaster.set(origin, direction);
  return raycaster.intersectObjects(objects, true);
}
