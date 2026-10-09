import type { ArPlaceId, ArPlaceProfile, UiLanguage } from "./arExperienceTypes";

const AR_PLACES: ArPlaceProfile[] = [
  {
    id: "victoria_falls",
    name: "Victoria Falls",
    heritage: "A UNESCO World Heritage destination and one of the world's most iconic waterfall landscapes.",
    history: "Known as Mosi-oa-Tunya, this zone has long served as a cultural and trade corridor along the Zambezi.",
    historicalTimeline:
      "Local communities have revered the falls for centuries, David Livingstone documented it to global audiences in 1855, and UNESCO listed the site in 1989.",
    culture: "Local communities shape the destination through craft traditions, storytelling, and hospitality experiences.",
    culturalHighlights:
      "Tonga and Lozi storytelling, river-linked ceremonies, and market craft traditions remain central to the destination identity.",
    pointsOfInterest: [
      "Main Falls viewpoints and rainforest trail",
      "Devil's Cataract lookout",
      "Zambezi riverfront interpretation points",
    ],
    directionTips: [
      "Move forward along the marked viewpoint trail, then keep left for the main panorama deck",
      "Pause at each spray-zone viewpoint for narration points",
    ],
    nextStops: ["Victoria Falls Bridge precinct", "Zambezi sunset cruise launch area"],
    safetyNote: "Use marked paths, watch slippery sections, and follow local ranger guidance.",
  },
  {
    id: "great_zimbabwe",
    name: "Great Zimbabwe",
    heritage: "The largest pre-colonial stone complex in southern Africa and a symbol of national identity.",
    history: "Developed between the 11th and 15th centuries as a major political and economic center.",
    historicalTimeline:
      "Construction and expansion are traced to roughly the 11th-15th centuries, with global recognition reinforced by UNESCO listing in 1986.",
    culture: "The site reflects deep historical craftsmanship and living heritage links across Zimbabwe.",
    culturalHighlights:
      "Dry-stone architecture, oral histories of statecraft, and enduring identity narratives make it a core symbol of Zimbabwean heritage.",
    pointsOfInterest: [
      "Great Enclosure stone walls",
      "Hill Complex ritual and leadership zones",
      "Valley Ruins interpretation routes",
    ],
    directionTips: [
      "Start at the lower interpretive route and continue uphill to the Hill Complex",
      "Stop at the enclosure walls for architectural narration markers",
    ],
    nextStops: ["Great Zimbabwe Museum", "Masvingo heritage circuit"],
    safetyNote: "Respect protected structures and keep to designated heritage paths.",
  },
  {
    id: "harare",
    name: "Harare",
    heritage: "Zimbabwe's capital and a central gateway for business, urban culture, and creative industries.",
    history: "Harare has evolved into a key modern hub connecting national institutions and regional travelers.",
    historicalTimeline:
      "The modern city was established as Salisbury in 1890 and officially renamed Harare in 1982 after independence.",
    culture: "Explore local cuisine, contemporary art, music spaces, and cultural districts across the city.",
    culturalHighlights:
      "Urban culture blends mbira and contemporary music scenes, gallery circuits, and neighborhood food culture rooted in local markets.",
    pointsOfInterest: [
      "National Gallery precinct",
      "City center heritage avenues",
      "Local food and market corridors",
    ],
    directionTips: [
      "Proceed toward the central culture district and pause at major art landmarks",
      "Use main pedestrian routes and stop at signed heritage markers",
    ],
    nextStops: ["National Gallery of Zimbabwe", "Mbare cultural market routes"],
    safetyNote: "Use trusted transport options and remain aware in high-traffic zones.",
  },
  {
    id: "bulawayo",
    name: "Bulawayo",
    heritage: "A heritage-rich city anchored by museums, colonial-era architecture, and nearby Matobo landscapes.",
    history: "Historically central to rail and industrial growth, Bulawayo remains a major cultural anchor.",
    historicalTimeline:
      "The Ndebele royal center developed in the 19th century, and the modern city footprint expanded significantly after 1894.",
    culture: "Visitors can engage with strong performing arts, local cuisine, and regional craft communities.",
    culturalHighlights:
      "Ndebele heritage, museum culture, and strong performing arts traditions shape the city's living cultural identity.",
    pointsOfInterest: [
      "Railway and city museums zone",
      "Historic architecture corridors",
      "Gateway route to Matobo landscapes",
    ],
    directionTips: [
      "Begin in the central museum corridor, then continue along the heritage architecture route",
      "Pause at museum forecourts for narration points before moving onward",
    ],
    nextStops: ["Natural History Museum", "Matobo day-route staging point"],
    safetyNote: "Follow museum/site opening guidance and use official guide services for Matobo routes.",
  },
  {
    id: "hwange",
    name: "Hwange National Park",
    heritage: "Zimbabwe's flagship wildlife landscape with major elephant corridors and protected ecosystems.",
    history: "The park has become a cornerstone of conservation and safari tourism development in the region.",
    historicalTimeline:
      "Gazetted in 1928 as Wankie Game Reserve and later renamed Hwange, it has grown into one of southern Africa's key conservation landscapes.",
    culture: "Community-linked tourism and ranger-led interpretation add local context to wildlife experiences.",
    culturalHighlights:
      "Community conservation partnerships, tracker knowledge, and ranger interpretation connect wildlife viewing to local livelihoods.",
    pointsOfInterest: [
      "Waterhole observation sectors",
      "Primary safari game-view corridors",
      "Ranger interpretation and conservation points",
    ],
    directionTips: [
      "Move slowly along designated safari tracks and stop at marked observation points",
      "Pause at waterhole viewpoints for wildlife narration and tracking guidance",
    ],
    nextStops: ["Main game drive loop", "Ranger briefing and visitor center point"],
    safetyNote: "Remain in designated areas and follow all ranger safety instructions around wildlife.",
  },
];

const SHONA_OVERRIDES: Partial<Record<ArPlaceId, Partial<ArPlaceProfile>>> = {
  victoria_falls: {
    heritage: "Nzvimbo yeUNESCO World Heritage uye imwe yemapopoma ane mukurumbira pasi rose.",
    history: "Inozivikanwa seMosi-oa-Tunya, nzvimbo iyi yakagara iri nzira yakakosha yekutengeserana netsika paZambezi.",
    historicalTimeline:
      "Vanhu vemuno vakagara vachiremekedza mapopoma aya kwemazana emakore; David Livingstone akanyora nezvawo muna 1855, uye UNESCO yakazonyora nzvimbo iyi muna 1989.",
    culture: "Nharaunda dzemuno dzinoramba dzichisimbisa nzvimbo iyi kuburikidza neunyanzvi, ngano, uye kugamuchira vaenzi.",
    culturalHighlights:
      "Ngano dzeTonga neLozi, tsika dzine chekuita nerwizi, nemisika yezvigadzirwa zvemuno zvinoramba zvakakosha.",
    pointsOfInterest: ["Nzvimbo dzekuona Main Falls", "Devil's Cataract", "Nzvimbo dzekutsanangura paZambezi"],
    directionTips: [
      "Famba munzira yakatarwa wozoenda kuruboshwe padhikhi guru rekuona.",
      "Mira pane imwe neimwe spray-zone kuti unzwe rondedzero.",
    ],
    nextStops: ["Victoria Falls Bridge", "Nzvimbo yekutangira sunset cruise paZambezi"],
    safetyNote: "Shandisa nzira dzakatarwa, chenjerera panotsvedza, uye tevera mirayiridzo yeranger.",
  },
  great_zimbabwe: {
    heritage: "Nzvimbo huru yematombo ekare muSouthern Africa uye mucherechedzo wechizvarwa cheZimbabwe.",
    history: "Yakakura pakati pezana remakore rechi11 nerechi15 senzvimbo yezvematongerwo enyika nehupfumi.",
    historicalTimeline:
      "Kuvakwa nekuwedzera kwakanyanya kwakaitika muzana remakore rechi11 kusvika rechi15; UNESCO yakanyora nzvimbo iyi muna 1986.",
    culture: "Nzvimbo iyi inoratidza hunyanzvi hwekuvaka nematombo uye nhaka inorarama muZimbabwe.",
    culturalHighlights: "Dry-stone architecture, ngano dzechinyakare dzehutungamiri, uye kuzivikanwa kwenyika.",
  },
  harare: {
    heritage: "Guta guru reZimbabwe uye musuwo mukuru webhizimisi, tsika dzekumaguta, uye maindasitiri ekusika.",
    history: "Harare yakava nzvimbo huru inobatanidza masangano enyika nevafambi vemudunhu.",
    historicalTimeline:
      "Guta ranhasi rakatangwa seSalisbury muna 1890 uye rakatumidzwa zita rekuti Harare muna 1982 mushure merusununguko.",
    culture: "Ongorora chikafu chemuno, art yemazuva ano, mimhanzi, nenzvimbo dzetsika dzeguta.",
    culturalHighlights: "Mbira nemimhanzi yemazuva ano, ma gallery, uye tsika dzechikafu chemumarket.",
  },
  bulawayo: {
    heritage: "Guta rine nhaka yakadzama rine mamuseum, zvivakwa zvekare, uye pedyo neMatobo.",
    history: "Bulawayo yakava guta rakakosha muchitima nemaindasitiri uye richiri nzvimbo yakakosha yetsika.",
    historicalTimeline:
      "Pakati pezana remakore rechi19 ndiyo yaive nzvimbo yakakosha yeNdebele; guta razvino rakakura zvikuru mushure ma1894.",
    culture: "Vashanyi vanowana mitambo yetsika, chikafu chemuno, uye mabasa emaoko.",
    culturalHighlights:
      "Nhaka yeNdebele, tsika dzemamuseum, uye performing arts zvinoramba zvichiita kuti guta ripenye.",
  },
  hwange: {
    heritage: "Paki huru yewildlife yeZimbabwe ine nzira huru dzenzou nezvimwe zvipenyu zvakachengetedzwa.",
    history: "Paki iyi yakava musimboti mukuru wekuchengetedza zvipenyu nesafari mudunhu.",
    historicalTimeline: "Yakagadzwa muna 1928 seWankie Game Reserve, yozotumidzwa zita rekuti Hwange.",
    culture: "Tourism yakabatana nenharaunda uye dudziro yeranger inowedzera ruzivo rwemuno.",
    culturalHighlights:
      "Kubatana kwenharaunda mukuchengetedza, ruzivo rwevatsvakurudzi, uye kudzidzisa kwevaranger.",
  },
};

export const AR_PREVIEW_IMAGES_BY_PLACE: Record<ArPlaceId, string[]> = {
  victoria_falls: ["/images/pages/tourism/victoria_falls.jpg"],
  great_zimbabwe: ["/images/pages/tourism/great_zimbabwe.jpeg"],
  harare: ["/images/pages/tourism/balancing_rocks.jpg"],
  bulawayo: ["/images/pages/tourism/dest_matobo.jpg"],
  hwange: ["/images/pages/tourism/dest_hwange.png"],
};

export function getLocalizedArPlaces(uiLanguage: UiLanguage): ArPlaceProfile[] {
  if (uiLanguage !== "sn") return AR_PLACES;
  return AR_PLACES.map((place) => ({ ...place, ...(SHONA_OVERRIDES[place.id] ?? {}) }));
}

export function resolveArPreviewImages(
  overrides?: Partial<Record<ArPlaceId, string[]>>
): Record<ArPlaceId, string[]> {
  return Object.keys(AR_PREVIEW_IMAGES_BY_PLACE).reduce((acc, rawId) => {
    const id = rawId as ArPlaceId;
    const overrideImages = overrides?.[id];
    acc[id] = Array.isArray(overrideImages) && overrideImages.length > 0 ? overrideImages : AR_PREVIEW_IMAGES_BY_PLACE[id];
    return acc;
  }, {} as Record<ArPlaceId, string[]>);
}
