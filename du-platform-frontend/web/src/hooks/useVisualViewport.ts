import { useLayoutEffect, useState } from "react";

type ViewportBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** The visible area can shrink or move without resizing the layout viewport
 * when a phone/tablet opens its keyboard or the visitor zooms the page. */
export function useVisualViewport(enabled: boolean) {
  const [bounds, setBounds] = useState<ViewportBounds | null>(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const next = {
        top: viewport?.offsetTop ?? 0,
        left: viewport?.offsetLeft ?? 0,
        width: viewport?.width ?? window.innerWidth,
        height: viewport?.height ?? window.innerHeight,
      };
      setBounds(previous =>
        previous?.top === next.top &&
        previous.left === next.left &&
        previous.width === next.width &&
        previous.height === next.height
          ? previous
          : next
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, [enabled]);

  return bounds;
}
