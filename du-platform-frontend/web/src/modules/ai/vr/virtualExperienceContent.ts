import type { UiLanguage } from "./virtualExperienceText";
import type { VirtualDestination } from "./virtualExperienceTypes";

const BASE_DESTINATIONS: VirtualDestination[] = [
  {
    id: "cape_town",
    name: "Sample City",
    image: "/images/pages/tourism/vr-walk/vf_360_01.jpg",
    vibe: "Clifftop + Coastal View",
    summary:
      "Sample City is a demonstration, not a Zimbabwe destination tour. Look around, move between the three scenes and try narration or a conversation with Onesa.",
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
          "Look around, use the zoom controls and open a blue point for more information.",
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
        caption: "Use a gold ring to move to another scene, or try the narration controls.",
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
          "Explore the panorama, open a point for information or return to the first scene.",
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
      "Guta Rekuyedza muenzaniso, kwete rwendo rwenzvimbo yekushanyira muZimbabwe. Tarisa-tarisa, famba pakati pemifananidzo mitatu uye edza kurondedzerwa kana kutaura naOnesa.",
    locationHighlights: [
      "Hotspot navigation pakati pema360 stages",
      "Point-of-interest kubaya nekuona ruzivo",
      "Narration neConversation guidance modes",
    ],
    stageTitles: ["Muono wePamusoro", "Muono weRock Arch", "Muono Wakafara"],
    stageCaptions: [
      "Tarisa-tarisa, shandisa zvekuswededza mufananidzo uye vhura poindi yebhuruu kuti uwane ruzivo.",
      "Shandisa mhete yegoridhe kuenda kune mumwe mufananidzo, kana kuedza zvekurondedzera.",
      "Ongorora mufananidzo wakafara, vhura poindi yeruzivo kana kudzokera kumufananidzo wekutanga.",
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
      "Idolobho Lokubonisa yisibonelo, hatshi uhambo lwendawo yokuvakatshela eZimbabwe. Khangela indawo yonke, hamba phakathi kwezigcawu ezintathu uzame ukulandiselwa kumbe ukuxoxa loOnesa.",
    locationHighlights: [
      "Ukuhamba ngama-hotspot phakathi kwama-360 stage",
      "Ukuchofoza point-of-interest kanye lokubona ulwazi",
      "Ama-mode e-Narration kanye le-Conversation guidance",
    ],
    stageTitles: ["Ukubona Phezulu", "Ukubona i-Rock Arch", "Ukubona Okubanzi"],
    stageCaptions: [
      "Khangela indawo yonke, sebenzisa amathuluzi okusondeza uvule iphoyinti eliluhlaza ukuze uthole ulwazi.",
      "Sebenzisa iringi yegolide ukuya kwesinye isigcawu, kumbe uzame amathuluzi okulandisa.",
      "Hlola umfanekiso obanzi, vula iphoyinti ukuze uthole ulwazi kumbe ubuyele esigcawini sokuqala.",
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
      "Sample City ist eine Demonstration, keine Tour durch ein simbabwisches Reiseziel. Sieh dich um, wechsle zwischen den drei Szenen und probiere das Vorlesen oder ein Gespräch mit Onesa aus.",
    locationHighlights: [
      "Hotspot-Navigation zwischen 360-Grad-Szenen",
      "Point-of-Interest-Klick mit Info-Overlay",
      "Narration und Live-Gespraech als Fuehrungsmodi",
    ],
    stageTitles: ["Klippenblick", "Felsbogen-Blick", "Gipfelpanorama"],
    stageCaptions: [
      "Sieh dich um, nutze den Zoom und öffne einen blauen Punkt für weitere Informationen.",
      "Wechsle über einen goldenen Ring zur nächsten Szene oder probiere die Vorlesefunktion aus.",
      "Erkunde das Panorama, öffne einen Punkt für Informationen oder kehre zur ersten Szene zurück.",
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
