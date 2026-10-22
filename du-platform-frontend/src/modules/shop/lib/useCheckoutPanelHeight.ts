import { useLayoutEffect, useRef } from "react";

/** Keep checkout inside the space below its actual position, including keyboards. */
export function useCheckoutPanelHeight(view: string) {
  const ref = useRef<HTMLFormElement>(null);
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const viewport = window.visualViewport;
    let frame = 0;
    let active = true;
    const measure = () => {
      frame = 0;
      if (!active || !panel.getClientRects().length) return;
      const bottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      const available = Math.max(
        120,
        Math.floor(bottom - Math.max(0, panel.getBoundingClientRect().top) - 16)
      );
      const height = `calc(${available}px - env(safe-area-inset-bottom))`;
      if (panel.style.maxHeight !== height) panel.style.maxHeight = height;
    };
    const schedule = () => {
      if (active && !frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const observer = new ResizeObserver(schedule);
    const section = panel.closest(".shop-products-section");
    if (section) observer.observe(section);
    void document.fonts.ready.then(schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    return () => {
      active = false;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, [view]);
  return ref;
}
