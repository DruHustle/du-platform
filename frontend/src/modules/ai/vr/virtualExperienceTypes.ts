export type Point3D = [number, number, number];

export type Hotspot = {
  targetId: string;
  label: string;
  position: Point3D;
};

export type PointOfInterest = {
  id: string;
  label: string;
  position: Point3D;
};

export type VirtualWalkStage = {
  id: string;
  title: string;
  image: string;
  caption: string;
  hotspots?: Hotspot[];
  pointsOfInterest?: PointOfInterest[];
};

export type VirtualDestination = {
  id: string;
  name: string;
  image: string;
  vibe?: string;
  summary: string;
  experiences?: string[];
  coordinates: string;
  locationHighlights?: string[];
  walkStages: VirtualWalkStage[];
};
