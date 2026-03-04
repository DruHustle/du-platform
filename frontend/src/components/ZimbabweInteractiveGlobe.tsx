import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";

type ArcDatum = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
  name: string;
};

type ZimbabweInteractiveGlobeProps = {
  zoomToHarare?: boolean;
};

class GlobeRenderBoundary extends Component<{ onError: () => void; children: ReactNode }, { hasError: boolean }> {
  constructor(props: { onError: () => void; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function ZimbabweInteractiveGlobe({ zoomToHarare = false }: ZimbabweInteractiveGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const zoomSequenceTimerRef = useRef<number | null>(null);
  const previousZoomToHarareRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [zimbabweBoundary, setZimbabweBoundary] = useState<any[]>([]);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [globeCrashed, setGlobeCrashed] = useState(false);
  const wasZimbabweVisibleRef = useRef(true);

  const locations = useMemo(
    () => [
      { id: "vic_falls", name: "Victoria Falls", lat: -17.9243, lng: 25.856, label: "VFA" },
      { id: "bulawayo", name: "Bulawayo", lat: -20.1325, lng: 28.6265, label: "BUQ" },
      { id: "mutare", name: "Mutare", lat: -18.9707, lng: 32.6709, label: "UTA" },
      { id: "johannesburg", name: "Johannesburg", lat: -26.2041, lng: 28.0473, label: "JNB" },
      { id: "cape_town", name: "Cape Town", lat: -33.9249, lng: 18.4241, label: "CPT" },
      { id: "london", name: "London", lat: 51.5074, lng: -0.1278, label: "LHR" },
      { id: "dubai", name: "Dubai", lat: 25.2048, lng: 55.2708, label: "DXB" },
      { id: "ny", name: "New York", lat: 40.7128, lng: -74.006, label: "JFK" },
      { id: "tokyo", name: "Tokyo", lat: 35.6895, lng: 139.6917, label: "HND" },
      { id: "sydney", name: "Sydney", lat: -33.8688, lng: 151.2093, label: "SYD" },
      { id: "sao_paulo", name: "Sao Paulo", lat: -23.5505, lng: -46.6333, label: "GRU" },
      { id: "nairobi", name: "Nairobi", lat: -1.2921, lng: 36.8219, label: "NBO" },
    ],
    []
  );

  // Harare (Zimbabwe) exact reference point for marker + arc origin
  const zimCoords = { lat: -17.8252, lng: 31.0335 };
  const zimVector = useMemo(() => {
    const lat = (zimCoords.lat * Math.PI) / 180;
    const lng = (zimCoords.lng * Math.PI) / 180;
    return {
      x: Math.cos(lat) * Math.sin(lng),
      y: Math.sin(lat),
      z: Math.cos(lat) * Math.cos(lng),
    };
  }, [zimCoords.lat, zimCoords.lng]);

  const arcsData = useMemo<ArcDatum[]>(
    () =>
      locations.map((loc) => ({
        startLat: zimCoords.lat,
        startLng: zimCoords.lng,
        endLat: loc.lat,
        endLng: loc.lng,
        color: ["#facc15", "#3b82f6"],
        name: `Fly to ${loc.name}`,
      })),
    [locations]
  );
  const showZimbabweMarker = !zoomToHarare;

  useEffect(() => {
    if (typeof window === "undefined") {
      setWebglSupported(false);
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const context =
        canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }) ||
        canvas.getContext("experimental-webgl");
      setWebglSupported(Boolean(context));
    } catch {
      setWebglSupported(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadBoundary = async () => {
      try {
        const response = await fetch("/globe/zimbabwe.geo.json");
        if (!response.ok) return;
        const geojson = await response.json();
        const features = Array.isArray(geojson?.features) ? geojson.features : [];
        if (!cancelled) {
          setZimbabweBoundary(features);
        }
      } catch {
        if (!cancelled) {
          setZimbabweBoundary([]);
        }
      }
    };
    void loadBoundary();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFlyTo = useCallback((coords: { lat: number; lng: number }, altitude = 1.8) => {
    globeRef.current?.pointOfView(
      {
        lat: coords.lat,
        lng: coords.lng,
        altitude,
      },
      2000
    );
  }, []);

  useEffect(() => {
    const justTriggered = zoomToHarare && !previousZoomToHarareRef.current;
    previousZoomToHarareRef.current = zoomToHarare;
    if (!justTriggered) return;
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = false;
    }
    // Ensure Harare is centered first, then perform a tighter zoom-in.
    globeRef.current?.pointOfView({ lat: zimCoords.lat, lng: zimCoords.lng, altitude: 2.4 }, 500);
    if (zoomSequenceTimerRef.current !== null) {
      window.clearTimeout(zoomSequenceTimerRef.current);
      zoomSequenceTimerRef.current = null;
    }
    zoomSequenceTimerRef.current = window.setTimeout(() => {
      globeRef.current?.pointOfView({ lat: zimCoords.lat, lng: zimCoords.lng, altitude: 0.85 }, 1500);
      zoomSequenceTimerRef.current = null;
    }, 520);
  }, [zoomToHarare, zimCoords.lat, zimCoords.lng]);

  useEffect(() => {
    handleFlyTo(zimCoords, 2.5);
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enableDamping = true;
    }
  }, [handleFlyTo, zimCoords.lat, zimCoords.lng]);

  const attemptAutoPlay = useCallback(async () => {
    if (!audioRef.current || !audioEnabled) return;
    try {
      audioRef.current.muted = false;
      await audioRef.current.play();
      setAudioBlocked(false);
      setAudioPlaying(true);
    } catch {
      // Autoplay blocked; user gesture will be required.
      setAudioBlocked(true);
      setAudioPlaying(false);
    }
  }, [audioEnabled]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = false;
    audioRef.current.volume = 0.5;
    void attemptAutoPlay();
    const retry1 = window.setTimeout(() => {
      if (!audioPlaying && audioEnabled) void attemptAutoPlay();
    }, 1000);
    const retry2 = window.setTimeout(() => {
      if (!audioPlaying && audioEnabled) void attemptAutoPlay();
    }, 3000);
    return () => {
      window.clearTimeout(retry1);
      window.clearTimeout(retry2);
    };
  }, [attemptAutoPlay, audioEnabled, audioPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    const handleCanPlay = () => {
      void attemptAutoPlay();
    };
    const handleCanPlayThrough = () => {
      void attemptAutoPlay();
    };
    const handlePlay = () => {
      if (audioRef.current) {
        audioRef.current.muted = false;
      }
      setAudioPlaying(true);
    };
    const handlePause = () => {
      setAudioPlaying(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void attemptAutoPlay();
      }
    };
    const handlePointer = () => {
      if (!audioRef.current || audioPlaying || !audioEnabled) return;
      audioRef.current.muted = false;
      void audioRef.current
        .play()
        .then(() => {
          setAudioBlocked(false);
          setAudioPlaying(true);
        })
        .catch(() => {
          setAudioBlocked(true);
          setAudioPlaying(false);
        });
    };
    audioRef.current.addEventListener("canplay", handleCanPlay);
    audioRef.current.addEventListener("canplaythrough", handleCanPlayThrough);
    audioRef.current.addEventListener("play", handlePlay);
    audioRef.current.addEventListener("pause", handlePause);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("pointerdown", handlePointer);
    return () => {
      audioRef.current?.removeEventListener("canplay", handleCanPlay);
      audioRef.current?.removeEventListener("canplaythrough", handleCanPlayThrough);
      audioRef.current?.removeEventListener("play", handlePlay);
      audioRef.current?.removeEventListener("pause", handlePause);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("pointerdown", handlePointer);
    };
  }, [attemptAutoPlay, audioEnabled, audioPlaying]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const controls = globeRef.current?.controls();
      const camera = controls?.object;
      if (controls && camera) {
        const len = Math.hypot(camera.position.x, camera.position.y, camera.position.z) || 1;
        const camX = camera.position.x / len;
        const camY = camera.position.y / len;
        const camZ = camera.position.z / len;
        const dot = camX * zimVector.x + camY * zimVector.y + camZ * zimVector.z;
        const isVisible = dot > 0;
        if (wasZimbabweVisibleRef.current && !isVisible) {
          handleFlyTo(zimCoords, 2.5);
        }
        wasZimbabweVisibleRef.current = isVisible;
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [handleFlyTo, zimCoords, zimVector.x, zimVector.y, zimVector.z]);

  useEffect(
    () => () => {
      if (zoomSequenceTimerRef.current !== null) {
        window.clearTimeout(zoomSequenceTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      const { clientWidth, clientHeight } = containerRef.current || { clientWidth: 0, clientHeight: 0 };
      setSize({ width: clientWidth, height: clientHeight });
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full bg-[#000205] overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(16,40,74,0.3)_0%,transparent_70%)]" />

      <audio
        ref={audioRef}
        src="/sounds/zimbabwe_a_world_of_wonders.mp3"
        autoPlay
        loop
        preload="auto"
        onLoadedMetadata={(e) => {
          e.currentTarget.muted = false;
          e.currentTarget.volume = 0.5;
          void attemptAutoPlay();
        }}
        onPlay={() => {
          if (audioRef.current) audioRef.current.muted = false;
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {webglSupported === false || globeCrashed ? (
          <div className="relative h-full w-full">
            <img src="/globe/earth-blue-marble.jpg" alt="Globe preview" className="h-full w-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
            <p className="absolute left-4 bottom-4 text-[10px] uppercase tracking-widest font-black text-white/85">
              Globe preview mode (WebGL unavailable)
            </p>
          </div>
        ) : (
          <GlobeRenderBoundary onError={() => setGlobeCrashed(true)}>
            <Globe
              ref={globeRef}
              width={size.width}
              height={size.height}
              backgroundColor="#000000"
              globeImageUrl="/globe/earth-blue-marble.jpg"
              bumpImageUrl="/globe/earth-topology.png"
              backgroundImageUrl="/globe/night-sky.png"
              showAtmosphere
              atmosphereColor="#3a86ff"
              atmosphereAltitude={0.18}
              arcsData={arcsData}
              arcColor="color"
              arcDashLength={0.5}
              arcDashGap={2}
              arcDashAnimateTime={2000}
              arcStroke={0.4}
              polygonsData={zimbabweBoundary}
              polygonAltitude={0.012}
              polygonCapColor={() => "rgba(250, 204, 21, 0.3)"}
              polygonSideColor={() => "rgba(250, 204, 21, 0.18)"}
              polygonStrokeColor={() => "#facc15"}
              polygonsTransitionDuration={0}
              onArcClick={(arc: any) => handleFlyTo({ lat: arc.endLat, lng: arc.endLng }, 1.2)}
              htmlElementsData={showZimbabweMarker ? [{ ...zimCoords, name: "ZIMBABWE" }] : []}
              htmlElement={(d: any) => {
                const el = document.createElement("div");
                const markerGroup = document.createElement("div");
                markerGroup.className = "group flex flex-col items-center cursor-pointer";

                const markerShell = document.createElement("div");
                markerShell.className = "h-6 w-6 flex items-center justify-center";

                const pingHalo = document.createElement("div");
                pingHalo.className = "absolute h-6 w-6 animate-ping rounded-full bg-yellow-500/30";

                const markerDot = document.createElement("div");
                markerDot.className = "h-3 w-3 rounded-full bg-yellow-500 border-2 border-white shadow-[0_0_15px_#facc15]";

                markerShell.appendChild(pingHalo);
                markerShell.appendChild(markerDot);
                markerGroup.appendChild(markerShell);
                el.appendChild(markerGroup);
                el.onclick = () => handleFlyTo(zimCoords, 1.8);
                return el;
              }}
            />
          </GlobeRenderBoundary>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (!audioRef.current) return;
          if (audioPlaying) {
            audioRef.current.pause();
            setAudioEnabled(false);
            return;
          }
          setAudioEnabled(true);
          void audioRef.current
            .play()
            .then(() => {
              setAudioBlocked(false);
              setAudioPlaying(true);
            })
            .catch(() => {
              setAudioBlocked(true);
              setAudioPlaying(false);
            });
        }}
        className="absolute bottom-6 right-6 rounded-full border border-white/20 bg-slate-950/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white hover:text-zim-black"
      >
        {audioPlaying ? "Music: On" : "Music: Off"}
      </button>
      {audioBlocked ? null : null}
    </div>
  );
}
