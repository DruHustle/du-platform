import type {
  ArPlaceId,
  ArPlaceProfile,
  UiLanguage,
} from "./arExperienceTypes";

const GUIDANCE_LABELS: Record<UiLanguage, Record<string, string>> = {
  en: {
    historicalTimeline: "Historical timeline",
    heritage: "Heritage",
    directionCue: "Direction cue",
    stopPoint: "Stop point",
    whatToNotice: "What to notice",
    culture: "Culture",
    culturalContext: "Cultural context",
    nextStop: "Next stop",
    localTip: "Local tip",
    safety: "Safety",
    history: "History",
    topPois: "Top points of interest",
    suggestedNext: "Suggested next stop",
    defaultMoveCue: "Move slowly and keep your camera aligned with your path.",
    defaultPauseCue:
      "Watch for nearby interpretation markers and cultural details.",
    defaultNextStop: "Nearby heritage point",
    defaultNarrationPace:
      "Take your time at each stop to hear full narration before moving.",
    defaultSummaryCue: "Main destination highlights",
    defaultSummaryRoute:
      "Follow marked visitor routes and pause at key viewpoints.",
    defaultSummaryTip:
      "Use official guides and interpretation signage for deeper context.",
    defaultVisitorCenter: "Local visitor center",
  },
  sn: {
    historicalTimeline: "Nguva yenhoroondo",
    heritage: "Nhaka",
    directionCue: "Zano rekufamba",
    stopPoint: "Nzvimbo yekumira",
    whatToNotice: "Zvaunofanira kuona",
    culture: "Tsika",
    culturalContext: "Mamiro etsika",
    nextStop: "Nzvimbo inotevera",
    localTip: "Zano remuno",
    safety: "Chengetedzo",
    history: "Nhoroondo",
    topPois: "Nzvimbo huru dzekushanya",
    suggestedNext: "Nzvimbo inotevera inokurudzirwa",
    defaultMoveCue:
      "Famba zvishoma nezvishoma uye chengeta kamera yako yakatarisa munzira.",
    defaultPauseCue: "Tarisa zviratidzo zviri pedyo uye tsananguro dzetsika.",
    defaultNextStop: "Nzvimbo iri pedyo yenhaka",
    defaultNarrationPace:
      "Mira pane imwe neimwe nzvimbo kuti unzwe rondedzero yose usati wafamba.",
    defaultSummaryCue: "Zvinhu zvikuru zvinokwezva panzvimbo iyi",
    defaultSummaryRoute:
      "Tevedza nzira dzakatarwa uye mira panzvimbo dzakakosha dzekuona.",
    defaultSummaryTip:
      "Shandisa vatungamiri vepamutemo nezviratidzo kuti uwane ruzivo rwakadzama.",
    defaultVisitorCenter: "Visitor center yemuno",
  },
  nd: {
    historicalTimeline: "Uhlelo lwembali",
    heritage: "Ilifa",
    directionCue: "Isiqondiso sokuhamba",
    stopPoint: "Indawo yokuma",
    whatToNotice: "Okumele ukunanzelele",
    culture: "Amasiko",
    culturalContext: "Umongo wamasiko",
    nextStop: "Indawo elandelayo",
    localTip: "Icebiso lendawo",
    safety: "Ukuvikeleka",
    history: "Imbali",
    topPois: "Izindawo eziqakathekileyo",
    suggestedNext: "Indawo elandelayo ephakanyisiweyo",
    defaultMoveCue:
      "Hamba kancane njalo ugcine ikhamera yakho iqondiswe endleleni.",
    defaultPauseCue:
      "Nanzelela izimpawu eziseduze kanye lemininingwane yamasiko.",
    defaultNextStop: "Indawo yelifa eseduze",
    defaultNarrationPace:
      "Yima endaweni ngayinye ukuze uzwe ulwazi olupheleleyo ungakanyakazi.",
    defaultSummaryCue: "Okugqamileyo endaweni le",
    defaultSummaryRoute:
      "Landela imigwaqo etshengisiweyo njalo ume ezindaweni eziqakathekileyo zokubuka.",
    defaultSummaryTip:
      "Sebenzisa abaqondisi abasemthethweni lezimpawu zolwazi ukuze uthole okunengi.",
    defaultVisitorCenter: "Isikhungo sezivakatshi sendawo",
  },
  de: {
    historicalTimeline: "Historischer Zeitrahmen",
    heritage: "Erbe",
    directionCue: "Richtungsangabe",
    stopPoint: "Haltepunkt",
    whatToNotice: "Worauf Sie achten sollten",
    culture: "Kultur",
    culturalContext: "Kultureller Kontext",
    nextStop: "Naechster Halt",
    localTip: "Lokaler Hinweis",
    safety: "Sicherheit",
    history: "Geschichte",
    topPois: "Wichtige Stationen",
    suggestedNext: "Empfohlener naechster Halt",
    defaultMoveCue:
      "Gehen Sie langsam weiter und halten Sie die Kamera auf Ihren Weg ausgerichtet.",
    defaultPauseCue:
      "Achten Sie auf nahe Hinweiszeichen und kulturelle Details.",
    defaultNextStop: "Nahegelegener Kulturpunkt",
    defaultNarrationPace:
      "Nehmen Sie sich an jedem Halt Zeit fuer die volle Erklaerung.",
    defaultSummaryCue: "Wichtige Merkmale dieses Ortes",
    defaultSummaryRoute:
      "Folgen Sie markierten Wegen und halten Sie an wichtigen Aussichtspunkten an.",
    defaultSummaryTip:
      "Nutzen Sie offizielle Guides und Infotafeln fuer mehr Kontext.",
    defaultVisitorCenter: "Lokales Besucherzentrum",
  },
};

// Representative locations for context selection, never turn-by-turn navigation.
// Great Zimbabwe: https://whc.unesco.org/en/list/364/maps/
const PLACE_COORDINATES: Record<ArPlaceId, readonly [number, number]> = {
  victoria_falls: [-17.9243, 25.856],
  harare: [-17.8252, 31.0335],
  bulawayo: [-20.1325, 28.6265],
  great_zimbabwe: [-20.27117, 30.93327],
  hwange: [-19.1667, 26.5],
};

export function inferNearestPlace(
  latitude: number,
  longitude: number
): ArPlaceId | null {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  let nearest: ArPlaceId | null = null;
  let nearestKm = 150;
  for (const [id, [lat, lon]] of Object.entries(PLACE_COORDINATES)) {
    const a =
      Math.sin(radians(lat - latitude) / 2) ** 2 +
      Math.cos(radians(latitude)) *
        Math.cos(radians(lat)) *
        Math.sin(radians(lon - longitude) / 2) ** 2;
    const km =
      6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    if (km < nearestKm) {
      nearest = id as ArPlaceId;
      nearestKm = km;
    }
  }
  return nearest;
}

export function buildLocalGuidance(
  place: ArPlaceProfile,
  cameraEnabled: boolean,
  language: UiLanguage = "en"
): string {
  const labels = GUIDANCE_LABELS[language] ?? GUIDANCE_LABELS.en;

  if (cameraEnabled) {
    return [
      `${place.name}: ${place.history}`,
      `${labels.historicalTimeline}: ${place.historicalTimeline}`,
      `${labels.heritage}: ${place.heritage}`,
      `${labels.directionCue}: ${place.directionTips[0] ?? labels.defaultMoveCue}`,
      `${labels.stopPoint}: ${place.pointsOfInterest[0] ?? "Main viewpoint area"} - pause and observe before continuing.`,
      `${labels.whatToNotice}: ${place.pointsOfInterest[1] ?? labels.defaultPauseCue}`,
      `${labels.culture}: ${place.culture}`,
      `${labels.culturalContext}: ${place.culturalHighlights}`,
      `${labels.nextStop}: ${place.nextStops[0] ?? labels.defaultNextStop}.`,
      `${labels.localTip}: ${place.directionTips[1] ?? labels.defaultNarrationPace}`,
      `${labels.safety}: ${place.safetyNote}`,
    ].join(" ");
  }

  return [
    `${place.name}: ${place.heritage}`,
    `${labels.history}: ${place.history}`,
    `${labels.historicalTimeline}: ${place.historicalTimeline}`,
    `${labels.culture}: ${place.culture}`,
    `${labels.culturalContext}: ${place.culturalHighlights}`,
    `${labels.whatToNotice}: ${place.pointsOfInterest[0] ?? labels.defaultSummaryCue}.`,
    `${labels.topPois}: ${place.pointsOfInterest.slice(0, 2).join("; ")}.`,
    `${labels.directionCue}: ${place.directionTips[0] ?? labels.defaultSummaryRoute}`,
    `${labels.suggestedNext}: ${place.nextStops[0] ?? labels.defaultVisitorCenter}.`,
    `${labels.localTip}: ${place.directionTips[1] ?? labels.defaultSummaryTip}`,
    `${labels.safety}: ${place.safetyNote}`,
  ].join(" ");
}
