import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

export type InitWebXROptions = {
  renderer: THREE.WebGLRenderer;
  mountTarget?: HTMLElement | null;
};

export type InitWebXRResult = {
  button: HTMLElement | null;
  dispose: () => void;
};

/**
 * Initializes renderer-side WebXR and mounts a native VR entry button.
 * Safe to call in React effects; returns cleanup for unmount.
 */
export function initWebXR({ renderer, mountTarget }: InitWebXROptions): InitWebXRResult {
  renderer.xr.enabled = true;

  const button = VRButton.createButton(renderer, {
    optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking", "layers"],
  });

  button.classList.add("onesa-vr-entry-button");
  button.setAttribute("aria-label", "Enter VR mode");

  const buttonStyle: Partial<CSSStyleDeclaration> = {
    position: "absolute",
    right: "1rem",
    bottom: "1rem",
    zIndex: "40",
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontWeight: "800",
    letterSpacing: "0.12em",
    fontSize: "10px",
    textTransform: "uppercase",
    padding: "0.6rem 0.9rem",
  };
  Object.assign(button.style, buttonStyle);

  const host = mountTarget ?? document.body;
  host.appendChild(button);

  return {
    button,
    dispose: () => {
      if (button.parentElement) {
        button.parentElement.removeChild(button);
      }
    },
  };
}
