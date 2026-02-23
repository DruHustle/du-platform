import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";

type GlobeRef = {
  pointOfView: (coords: { lat: number; lng: number; altitude: number }, ms: number) => void;
  controls: () => {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableDamping: boolean;
  };
};

type ArcDatum = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
  name: string;
};

export default function ZimbabweInteractiveGlobe() {
  const globeRef = useRef<GlobeRef | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const wasZimbabweVisibleRef = useRef(true);

  const locations = useMemo(
    () => [
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

  const zimCoords = { lat: -20.0, lng: 31.0522 };
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
    void attemptAutoPlay();
  }, [attemptAutoPlay]);

  useEffect(() => {
    if (!audioRef.current) return;
    const handleCanPlay = () => {
      void attemptAutoPlay();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void attemptAutoPlay();
      }
    };
    audioRef.current.addEventListener("canplay", handleCanPlay);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      audioRef.current?.removeEventListener("canplay", handleCanPlay);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [attemptAutoPlay]);

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
        onLoadedMetadata={(e) => {
          e.currentTarget.volume = 0.15;
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
        globeImageUrl="/globe/earth-blue-marble.jpg"
        bumpImageUrl="/globe/earth-topology.png"
        nightImageUrl="/globe/earth-night.jpg"
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
        onArcClick={(arc) =>
          handleFlyTo({ lat: arc.endLat, lng: arc.endLng }, 1.2)
        }
        htmlElementsData={[{ ...zimCoords, name: "ZIMBABWE" }]}
        htmlElement={(d) => {
          const el = document.createElement("div");
          el.innerHTML = `
            <div class="group flex flex-col items-center cursor-pointer">
              <div class="h-6 w-6 flex items-center justify-center">
                <div class="absolute h-6 w-6 animate-ping rounded-full bg-yellow-500/30"></div>
                <div class="h-3 w-3 rounded-full bg-yellow-500 border-2 border-white shadow-[0_0_15px_#facc15]"></div>
              </div>
              <div class="bg-black/80 backdrop-blur-md px-3 py-1 mt-2 border border-yellow-500/50 rounded-sm">
                <span class="text-[11px] font-bold text-white tracking-[0.2em] uppercase whitespace-nowrap">
                   ${d.name}
                </span>
              </div>
            </div>
          `;
          el.onclick = () => handleFlyTo(zimCoords, 1.8);
          return el;
        }}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (!audioRef.current) return;
          if (audioEnabled || audioPlaying) {
            audioRef.current.pause();
            setAudioEnabled(false);
            setAudioPlaying(false);
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
      {audioBlocked ? (
        <p className="absolute bottom-6 left-6 text-[9px] text-white/60 uppercase tracking-widest">
          Click anywhere to start audio
        </p>
      ) : null}
    </div>
  );
}
