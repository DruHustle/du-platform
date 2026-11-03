import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import InstantImage from "@/components/InstantImage";
import type { WaterfallFlow } from "./waterfallFlow";

type DataConnection = EventTarget & { saveData?: boolean };

export default function WaterfallBackdrop() {
  const reducedMotion = useReducedMotion();
  const backdrop = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document !== "undefined" && !document.hidden
  );
  const [saveData, setSaveData] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const motionDisabled = reducedMotion !== false || saveData;
  const shouldCreate = !motionDisabled && !failed && inView && pageVisible;

  useEffect(() => {
    const connection = (
      navigator as Navigator & { connection?: DataConnection }
    ).connection;
    const updateData = () => setSaveData(Boolean(connection?.saveData));
    const updateVisibility = () => setPageVisible(!document.hidden);
    updateData();
    connection?.addEventListener("change", updateData);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting)
    );
    if (backdrop.current) observer.observe(backdrop.current);
    return () => {
      observer.disconnect();
      connection?.removeEventListener("change", updateData);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!image || !shouldCreate || !canvas.current) return;
    let cancelled = false;
    let renderer: WaterfallFlow | null = null;
    const target = canvas.current;
    const onContextLost = () => {
      if (cancelled) return;
      setFailed(true);
      setReady(false);
    };
    target.addEventListener("webglcontextlost", onContextLost);
    // The photograph is already visible; motion never blocks first paint and
    // reuses that decoded image without another media download or dependency.
    import("./waterfallFlow")
      .then(({ createWaterfallFlow }) => {
        if (cancelled) return;
        renderer = createWaterfallFlow(target, image);
        if (!renderer) {
          onContextLost();
          return;
        }
        renderer.setPlaying(true);
        setReady(true);
      })
      .catch(onContextLost);
    return () => {
      cancelled = true;
      target.removeEventListener("webglcontextlost", onContextLost);
      renderer?.dispose();
      setReady(false);
    };
  }, [image, shouldCreate]);

  return (
    <div
      ref={backdrop}
      className="absolute inset-0 z-0"
      data-waterfall-state={ready ? "playing" : "still"}
      aria-hidden="true"
    >
      <InstantImage
        src="/images/pages/tourism/victoria_falls.webp"
        alt=""
        aria-hidden="true"
        priority
        fetchPriority="high"
        wrapperClassName="absolute inset-0 h-full w-full bg-slate-900"
        className="absolute inset-0 h-full w-full object-cover"
        onLoad={event => setImage(event.currentTarget)}
      />
      <canvas
        ref={canvas}
        className={`pointer-events-none absolute inset-0 h-full w-full ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
