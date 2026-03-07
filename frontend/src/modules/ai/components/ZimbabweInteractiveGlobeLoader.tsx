import ZimbabweInteractiveGlobe, { type ZimbabweInteractiveGlobeProps } from "./ZimbabweInteractiveGlobe";

export default function ZimbabweInteractiveGlobeLoader({
  zoomToHarare = false,
  musicEnabled = true,
}: ZimbabweInteractiveGlobeProps) {
  return <ZimbabweInteractiveGlobe zoomToHarare={zoomToHarare} musicEnabled={musicEnabled} />;
}
