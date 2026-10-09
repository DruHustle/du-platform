import type { UiLanguage } from "./virtualExperienceText";
import type { VirtualDestination } from "./virtualExperienceTypes";

const BASE_DESTINATIONS: VirtualDestination[] = [
  {
    id: "cape_town",
    name: "Sample City",
    image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
    vibe: "Clifftop + Coastal View",
    summary:
      "Sample City is a VR demo scene showing how the experience works: pick a destination, move between 360 stages using hotspots, and listen through Narration or Conversation mode. Once Zimbabwe destination image data is uploaded, the same flow will run on those real locations.",
    experiences: [],
    coordinates: "-33.9249, 18.4241",
    locationHighlights: [
      "360 stage-to-stage hotspot navigation",
      "Point-of-interest click and info overlay flow",
      "Narration and live conversation guidance modes",
    ],
    walkStages: [
      {
        id: "vf360_1",
        title: "Clifftop Vista",
        image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
        caption:
          "Orientation stage for testing the core controls: look around, zoom, and inspect points of interest.",
        hotspots: [{ targetId: "vf360_2", label: "To Rock Arch View", position: [5, -1, -4] }],
        pointsOfInterest: [
          { id: "vf360_1_poi_1", label: "Ridge Edge", position: [2.1, -0.8, -5.4] },
          { id: "vf360_1_poi_2", label: "Skyline Frame", position: [-2.4, -0.6, -5.1] },
        ],
      },
      {
        id: "vf360_2",
        title: "Rock Arch View",
        image: "/images/pages/tourism/vr-walk/vf_360_02.jpg",
        caption: "Interaction stage for moving between scenes with hotspots while testing guided narration behavior.",
        hotspots: [
          { targetId: "vf360_3", label: "To Summit Panorama", position: [4.8, -1, -3.7] },
          { targetId: "vf360_1", label: "Back to Clifftop Vista", position: [-5, -1, 4] },
        ],
        pointsOfInterest: [
          { id: "vf360_2_poi_1", label: "Rock Arch", position: [0.8, -0.7, -5.7] },
          { id: "vf360_2_poi_2", label: "Valley Opening", position: [-1.8, -0.9, -5.4] },
        ],
      },
      {
        id: "vf360_3",
        title: "Summit Panorama",
        image: "/images/pages/tourism/vr-walk/vf_360_03.jpg",
        caption:
          "Final stage showing the complete VR tour loop before production Zimbabwe destination media is connected.",
        hotspots: [{ targetId: "vf360_1", label: "Back to Clifftop Vista", position: [-4.8, -1, 3.8] }],
        pointsOfInterest: [
          { id: "vf360_3_poi_1", label: "Panorama Crest", position: [1.3, -0.8, -5.8] },
          { id: "vf360_3_poi_2", label: "Horizon Point", position: [-2.2, -0.7, -5.3] },
        ],
      },
    ],
  },
];

type DestinationLocaleOverride = {
  name: string;
  vibe: string;
  summary: string;
  locationHighlights: string[];
  stageTitles: string[];
  stageCaptions: string[];
  hotspotLabels: string[][];
  poiLabels: string[][];
};

const DESTINATION_LOCALE_OVERRIDES: Partial<Record<UiLanguage, DestinationLocaleOverride>> = {
  sn: {
    name: "Guta Rekuyedza",
    vibe: "Pamusoro pegomo + Muono wemahombekombe",
    summary:
      "Guta Rekuyedza inzvimbo yekuratidza mashandiro eVR: sarudza nzvimbo, famba pakati pema360 stages uchishandisa hotspots, uye shandisa Narration kana Conversation mode. Kana mifananidzo yenzvimbo dzekushanya dzeZimbabwe yaiswa, mashandiro aya achashanda panzvimbo chaidzo.",
    locationHighlights: [
      "Hotspot navigation pakati pema360 stages",
      "Point-of-interest kubaya nekuona ruzivo",
      "Narration neConversation guidance modes",
    ],
    stageTitles: ["Muono wePamusoro", "Muono weRock Arch", "Muono Wakafara"],
    stageCaptions: [
      "Stage yekutanga yekuyedza ma-control: tarisa-tarisa, zoom, uye bvunza point of interest.",
      "Stage yekudyidzana yekufamba pakati pezviitiko uchishandisa hotspots uye kuyedza narration.",
      "Stage yekupedzisira inoratidza kutenderera kwakazara kweVR tisati tabatanidza media yeZimbabwe.",
    ],
    hotspotLabels: [
      ["Kuenda kuMuono weRock Arch"],
      ["Kuenda kuMuono Wakafara", "Dzokera kuMuono wePamusoro"],
      ["Dzokera kuMuono wePamusoro"],
    ],
    poiLabels: [
      ["Mupendero Wegomo", "Muono weDenga"],
      ["Rock Arch", "Kuvhurika kweMupata"],
      ["Nzvimbo Yepamusoro", "Nzvimbo yeHorizon"],
    ],
  },
  nd: {
    name: "Idolobho Lokubonisa",
    vibe: "Phezu kwedwala + Ukubona ugu",
    summary:
      "Idolobho Lokubonisa yindawo ye-VR demo etshengisa indlela i-experience esebenza ngayo: khetha indawo, hamba phakathi kwama-360 stage usebenzisa ama-hotspot, njalo ulalele nge-Narration kumbe i-Conversation mode. Nxa imifanekiso yezindawo zaseZimbabwe isifakiwe, indlela efanayo izasebenza kulezo zindawo zangempela.",
    locationHighlights: [
      "Ukuhamba ngama-hotspot phakathi kwama-360 stage",
      "Ukuchofoza point-of-interest kanye lokubona ulwazi",
      "Ama-mode e-Narration kanye le-Conversation guidance",
    ],
    stageTitles: ["Ukubona Phezulu", "Ukubona i-Rock Arch", "Ukubona Okubanzi"],
    stageCaptions: [
      "Isigaba sokuqala sokuhlola ama-control: khangela indawo yonke, sondeza, njalo uvule ama-point of interest.",
      "Isigaba sokuhamba phakathi kwezigameko usebenzisa ama-hotspot lokuhlola indlela indatshana eqondisa ngayo.",
      "Isigaba sokucina esitshengisa umjikelezo opheleleyo we-VR singakafaki media yangempela yaseZimbabwe.",
    ],
    hotspotLabels: [
      ["Yiya ku-Rock Arch View"],
      ["Yiya ku-Summit Panorama", "Buyela ku-Clifftop Vista"],
      ["Buyela ku-Clifftop Vista"],
    ],
    poiLabels: [
      ["Umphetho Wedwala", "Ifulemu Yesibhakabhaka"],
      ["I-Rock Arch", "Ukuvuleka Kwegodi"],
      ["Isiqongo se-Panorama", "Indawo ye-Horizon"],
    ],
  },
  de: {
    name: "Demo-Stadt",
    vibe: "Klippenblick + Kuestenpanorama",
    summary:
      "Demo-Stadt ist eine VR-Demoszene, die zeigt, wie das Erlebnis funktioniert: Ziel auswaehlen, sich mit Hotspots zwischen 360-Grad-Szenen bewegen und per Narration oder Conversation Mode fuehren lassen. Sobald echtes Bildmaterial aus Zimbabwe verfuegbar ist, laeuft derselbe Ablauf mit diesen realen Orten.",
    locationHighlights: [
      "Hotspot-Navigation zwischen 360-Grad-Szenen",
      "Point-of-Interest-Klick mit Info-Overlay",
      "Narration und Live-Gespraech als Fuehrungsmodi",
    ],
    stageTitles: ["Klippenblick", "Felsbogen-Blick", "Gipfelpanorama"],
    stageCaptions: [
      "Orientierungsszene zum Testen der Grundsteuerung: umsehen, zoomen und Sehenswuerdigkeiten ansehen.",
      "Interaktive Szene zum Wechseln zwischen Blickpunkten per Hotspot und zum Testen der gefuehrten Erzaehlung.",
      "Abschlussszene, die den kompletten VR-Rundgang zeigt, bevor echtes Medienmaterial aus Zimbabwe angebunden wird.",
    ],
    hotspotLabels: [
      ["Zum Felsbogen-Blick"],
      ["Zum Gipfelpanorama", "Zurueck zum Klippenblick"],
      ["Zurueck zum Klippenblick"],
    ],
    poiLabels: [
      ["Klippenkante", "Himmelsrahmen"],
      ["Felsbogen", "Taloeffnung"],
      ["Panorama-Kamm", "Horizontpunkt"],
    ],
  },
};

export function getLocalizedVirtualDestinations(uiLanguage: UiLanguage): VirtualDestination[] {
  const override = DESTINATION_LOCALE_OVERRIDES[uiLanguage];
  if (!override) return BASE_DESTINATIONS;

  return BASE_DESTINATIONS.map((destination) => ({
    ...destination,
    name: override.name,
    vibe: override.vibe,
    summary: override.summary,
    locationHighlights: override.locationHighlights,
    walkStages: destination.walkStages.map((stage, stageIndex) => ({
      ...stage,
      title: override.stageTitles[stageIndex] ?? stage.title,
      caption: override.stageCaptions[stageIndex] ?? stage.caption,
      hotspots: stage.hotspots?.map((hotspot, hotspotIndex) => ({
        ...hotspot,
        label: override.hotspotLabels[stageIndex]?.[hotspotIndex] ?? hotspot.label,
      })),
      pointsOfInterest: stage.pointsOfInterest?.map((poi, poiIndex) => ({
        ...poi,
        label: override.poiLabels[stageIndex]?.[poiIndex] ?? poi.label,
      })),
    })),
  }));
}
