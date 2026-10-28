import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import InstantImage from "@/components/InstantImage";
import type { WaterfallFlow } from "./waterfallFlow";

type DataConnection = EventTarget & { saveData?: boolean };

export default function WaterfallBackdrop() {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const backdrop = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const flow = useRef<WaterfallFlow | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () => typeof document !== "undefined" && !document.hidden
  );
  const [saveData, setSaveData] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [failed, setFailed] = useState(false);
  const motionDisabled = reducedMotion !== false || saveData;
  const shouldCreate = !motionDisabled && !failed && inView && pageVisible;
  const playing = useRef(false);
  playing.current = shouldCreate && !paused;

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
      setAvailable(false);
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
        flow.current = renderer;
        renderer.setPlaying(playing.current);
        setAvailable(true);
        setReady(true);
      })
      .catch(onContextLost);
    return () => {
      cancelled = true;
      target.removeEventListener("webglcontextlost", onContextLost);
      renderer?.dispose();
      flow.current = null;
      setReady(false);
    };
  }, [image, shouldCreate]);

  useEffect(() => {
    flow.current?.setPlaying(shouldCreate && !paused);
  }, [paused, shouldCreate]);

  return (
    <>
      <div
        ref={backdrop}
        className="absolute inset-0 z-0"
        data-waterfall-state={ready ? (paused ? "paused" : "playing") : "still"}
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
      {available && !motionDisabled && (
        <button
          type="button"
          onClick={() => setPaused(value => !value)}
          className="absolute bottom-5 left-6 z-30 inline-flex min-h-11 max-w-[calc(100%-3rem)] items-center gap-2 rounded-full border border-white/25 bg-slate-950/65 px-4 py-2 text-xs text-white backdrop-blur-sm hover:bg-slate-950/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zim-gold"
        >
          {paused ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
          {t(paused ? "home.hero_resume" : "home.hero_pause")}
        </button>
      )}
    </>
  );
}
