import type { VirtualWalkStage } from "./virtualExperienceTypes";

export type UiLanguage = "en" | "sn" | "nd" | "de";

export function formatNarrationLines(text: string): string[] {
  const normalized = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return [];
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function normalizeUiLanguage(value: unknown): UiLanguage {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "en";
  const base = raw.split("-")[0];
  if (base === "en" || base === "sn" || base === "nd" || base === "de")
    return base;
  if (raw === "shona") return "sn";
  if (raw === "ndebele") return "nd";
  if (raw === "german" || raw === "deutsch") return "de";
  return "en";
}

export function getLanguageLabel(language: UiLanguage): string {
  if (language === "sn") return "Shona";
  if (language === "nd") return "Ndebele";
  if (language === "de") return "German";
  return "English";
}

export function buildPostIntroStartGuidance(
  language: UiLanguage,
  stage: VirtualWalkStage
): string {
  const hotspotLabel = stage.hotspots?.[0]?.label;
  const poiLabel = stage.pointsOfInterest?.[0]?.label;
  if (language === "sn") {
    return [
      "Nhanganyaya yapera. Tangai demo zvino.",
      hotspotLabel
        ? `Dzvanya mhete yegoridhe ine zita rekuti ${hotspotLabel} kuti mufambe kuenda kune inotevera stage.`
        : "Dzvanya mhete dzegoridhe kuti mufambe kuenda kune inotevera stage.",
      poiLabel
        ? `Wobva wadzvanya point rekuti ${poiLabel} uye chiratidzo chefaira kuti muwane ruzivo rwenzvimbo.`
        : "Wobva wadzvanya point yebhuruu nechiratidzo chefaira kuti muwane ruzivo rwenzvimbo.",
    ].join(" ");
  }
  if (language === "de") {
    return [
      "Die Einfuehrung ist beendet. Starten Sie jetzt die Demo.",
      hotspotLabel
        ? `Klicken Sie auf den goldenen Ring ${hotspotLabel}, um zur naechsten Szene zu wechseln.`
        : "Klicken Sie auf die goldenen Ringe, um zur naechsten Szene zu wechseln.",
      poiLabel
        ? `Klicken Sie danach auf den Punkt ${poiLabel} und auf das Dokument-Symbol fuer Ortsinformationen.`
        : "Klicken Sie danach auf einen blauen Punkt und auf das Dokument-Symbol fuer Ortsinformationen.",
    ].join(" ");
  }
  if (language === "nd") {
    return [
      "Isingeniso sesiphelile. Qalisa idemo khathesi.",
      hotspotLabel
        ? `Chofoza iringi yegolide ethi ${hotspotLabel} ukuze uye esigabeni esilandelayo.`
        : "Chofoza amaringi egolide ukuze uye esigabeni esilandelayo.",
      poiLabel
        ? `Bese uchofoza iphoyinti ethi ${poiLabel} kanye lesithonjana sedokhumenti ukuze uthole ulwazi lwendawo.`
        : "Bese uchofoza iphoyinti eliluhlaza kanye lesithonjana sedokhumenti ukuze uthole ulwazi lwendawo.",
    ].join(" ");
  }
  return [
    "The intro is complete. Start the demo now.",
    hotspotLabel
      ? `Click the gold movement ring labeled ${hotspotLabel} to go to the next scene.`
      : "Click the gold movement rings to go to the next scene.",
    poiLabel
      ? `Then click the point named ${poiLabel} and use the document icon for place information.`
      : "Then click a blue point and use the document icon for place information.",
  ].join(" ");
}

export function buildNarrationButtonIntro(
  language: UiLanguage,
  destinationName: string,
  destinationSummary: string
): string {
  const summaryLines = formatNarrationLines(destinationSummary);
  const summarySnippet = summaryLines.slice(0, 2).join(" ").trim();
  const fallbackSummary =
    summarySnippet ||
    `${destinationName} is ready for an immersive virtual walkthrough experience.`;

  if (language === "sn") {
    return [
      "Mhoro, ndiri Onesa, gwara renyu reVR.",
      `Mauya ku ${destinationName}.`,
      fallbackSummary,
      "Kana magadzirira, dzvanyai mubatise bhatani re Push To Talk kuti mutange hurukuro neni.",
    ].join(" ");
  }

  if (language === "de") {
    return [
      "Hallo, ich bin Onesa, Ihr virtueller Reisefuehrer.",
      `Willkommen in ${destinationName}.`,
      fallbackSummary,
      "Wenn Sie bereit sind, halten Sie die Push-To-Talk-Taste gedrueckt, um ein Gespraech mit mir zu starten.",
    ].join(" ");
  }

  if (language === "nd") {
    return [
      "Sawubona, ngingu Onesa, umhlahlandlela wakho we VR.",
      `Wamukelekile e ${destinationName}.`,
      fallbackSummary,
      "Nxa usulungile, bamba ibhathini le Push To Talk ukuze uqale ingxoxo lami.",
    ].join(" ");
  }

  return [
    "Hello, I am Onesa, your virtual guide.",
    `Welcome to ${destinationName}.`,
    fallbackSummary,
    "When you are ready, press and hold the Push To Talk button to start a conversation with me.",
  ].join(" ");
}

export const VR_UI_TEXT: Record<UiLanguage, Partial<Record<string, string>>> = {
  en: {
    systemReady: "System Ready",
    guideThinking: "Guide is thinking...",
    requestingCloudNarration: "Requesting cloud narration...",
    transcribing: "Transcribing...",
    whisperFallback:
      "Speech transcription unavailable. Falling back to Onesa AI...",
    onesaFallback: "Using Onesa AI fallback.",
    localGuidance: "Using local guidance mode.",
    listening: "Listening...",
    micNotSupported: "Microphone not supported",
    micDenied: "Microphone access denied",
    noAudio: "Audio unavailable. Using browser voice.",
    cloudQuotaExceeded:
      "Online narration is unavailable. Try the browser voice instead.",
    cloudFailed: "Online narration is unavailable. Using the browser voice.",
    browserBlocked: "Browser voice blocked. Tap Narration again.",
    selectDestination: "Select destination",
    narration: "Narration",
    selectLocation: "Select location",
    narrationPending:
      "Narration will appear here once AI guidance is generated.",
    conversationEnabled: "enabled",
    conversationDisabled: "disabled",
    ambientOn: "on",
    ambientOff: "off",
    conversation: "Conversation",
    sttText: "You",
    response: "Response",
    sttUnavailable: "Could not transcribe audio.",
    pushToTalk: "Push To Talk",
    releaseToSend: "Release To Send",
    holdToSpeakHint: "Hold the talk button to speak.",
    ambient: "Ambient sound",
    currentContext: "Current Context",
    conversationOn: "Conversation: On",
    conversationOff: "Conversation: Off",
    ambientOnBadge: "Ambient: On",
    ambientOffBadge: "Ambient: Off",
    narrationOn: "NARRATION: On",
    narrationOff: "NARRATION: Off",
    vrStartNarration: "Start Narration",
    vrStartConversation: "Start Conversation",
    voice: "Voice",
    male: "Male",
    female: "Female",
    minimize: "Minimize",
    fullscreen: "Fullscreen",
    previewUnavailable:
      "The 3D preview is unavailable in this browser. You can still view scenes, read place information and use the voice controls.",
    fullscreenUnavailable:
      "Fullscreen is unavailable in this browser. You can continue in the page.",
    autoOn: "Auto: On",
    autoOff: "Auto: Off",
    walkthrough: "Walkthrough",
    close: "Close",
    highlights: "Highlights",
    loadingPoi: "Loading POI information...",
    stageLabel: "Stage",
    previousStage: "Previous scene",
    nextStage: "Next scene",
    pointOfInterest: "Point of interest",
    nearbyHighlights: "Nearby highlights",
    relatedHighlights: "Related highlights",
    enterFullscreen: "Enter fullscreen",
    exitFullscreen: "Exit fullscreen",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    resetView: "Reset view",
    toggleAutoRotate: "Toggle auto rotate",
    showPlaceInformation: "Show place information",
    lookUp: "Look up",
    lookLeft: "Look left",
    lookRight: "Look right",
    lookDown: "Look down",
    muteAmbientSound: "Mute ambient sound",
    enableAmbientSound: "Enable ambient sound",
    disableTts: "Disable text-to-speech",
    enableTts: "Enable text-to-speech",
    vrChecking: "Checking VR support...",
    vrReady: "VR headset ready",
    vrUnavailable: "VR unavailable",
    vrActive: "VR active",
    vrReadyDetails:
      "A compatible WebXR headset and browser can enter immersive mode here.",
    vrUnavailableDetails:
      "This browser or device does not support immersive WebXR VR.",
    vrSecureContextRequired: "VR requires a secure HTTPS connection.",
    vrActiveDetails: "The immersive session is running on your headset.",
    enterVr: "Enter VR",
    enteringVr: "Entering VR...",
    vrLaunchFailed:
      "Could not start VR. Check headset permissions and try again.",
  },
  sn: {
    systemReady: "System yagadzirira",
    guideThinking: "Gwara riri kufunga...",
    requestingCloudNarration: "Kukumbira rondedzero yegore...",
    transcribing: "Tiri kushandura izwi kuita chinyorwa...",
    whisperFallback:
      "Kushandura izwi hakusi kuwanikwa. Tiri kushandisa Onesa AI...",
    onesaFallback: "Kushandisa Onesa AI fallback.",
    localGuidance: "Kushandisa gwara remuno.",
    listening: "Tiri kuteerera...",
    micNotSupported: "Maikorofoni haisi kutsigirwa",
    micDenied: "Kupinda kumaikorofoni kwarambwa",
    noAudio: "Audio haisi kuwanikwa. Kushandisa izwi rebrowser.",
    cloudQuotaExceeded:
      "Rondedzero yepainternet haisi kuwanikwa. Edza izwi rebrowser.",
    cloudFailed:
      "Rondedzero yepainternet haisi kuwanikwa. Tiri kushandisa izwi rebrowser.",
    browserBlocked: "Izwi rebrowser rarambidzwa. Bata Narration zvakare.",
    selectDestination: "Sarudza nzvimbo",
    narration: "Rondedzero",
    selectLocation: "Sarudza nzvimbo",
    narrationPending:
      "Rondedzero ichaonekwa pano kana AI yapedza kugadzira gwara.",
    conversationEnabled: "yabatidzwa",
    conversationDisabled: "yadzimwa",
    ambientOn: "yabatidzwa",
    ambientOff: "yadzimwa",
    conversation: "Hurukuro",
    sttText: "Iwe",
    response: "Mhinduro",
    sttUnavailable: "Hatina kukwanisa kushandura izwi kuita chinyorwa.",
    pushToTalk: "Bata Utaure",
    releaseToSend: "Sunungura Kutumira",
    holdToSpeakHint: "Bata bhatani kuti utaure.",
    ambient: "Ruzha rwenzvimbo",
    currentContext: "Mamiro Azvino",
    conversationOn: "Hurukuro: Yabatidzwa",
    conversationOff: "Hurukuro: Yadzimwa",
    ambientOnBadge: "Ambient: Yabatidzwa",
    ambientOffBadge: "Ambient: Yadzimwa",
    narrationOn: "RONDEDZERO: Yabatidzwa",
    narrationOff: "RONDEDZERO: Yadzimwa",
    vrStartNarration: "Tanga Rondedzero",
    vrStartConversation: "Tanga Hurukuro",
    voice: "Izwi",
    male: "Murume",
    female: "Mukadzi",
    minimize: "Deredza",
    fullscreen: "Sikirini Yakazara",
    previewUnavailable:
      "Mufananidzo we3D hausi kuwanikwa mubrowser iri. Unogona kuona mifananidzo, kuverenga ruzivo rwenzvimbo uye kushandisa izwi.",
    fullscreenUnavailable:
      "Sikirini yakazara haisi kuwanikwa. Unogona kuenderera papeji.",
    autoOn: "Auto: Yabatidzwa",
    autoOff: "Auto: Yadzimwa",
    walkthrough: "Rwendo",
    close: "Vhara",
    highlights: "Zvinoshamisa",
    loadingPoi: "Tiri kurodha ruzivo rwePOI...",
    stageLabel: "Chikamu",
    previousStage: "Chikamu chapfuura",
    nextStage: "Chikamu chinotevera",
    pointOfInterest: "Nzvimbo inokosha",
    nearbyHighlights: "Zvimwe zviri pedyo",
    relatedHighlights: "Zvimwe zvinoenderana",
    enterFullscreen: "Pinda fullscreen",
    exitFullscreen: "Buda fullscreen",
    zoomIn: "Swedera pedyo",
    zoomOut: "Svedera kure",
    resetView: "Dzoreredza muono",
    toggleAutoRotate: "Batidza/dzima auto rotate",
    showPlaceInformation: "Ratidza ruzivo rwenzvimbo",
    lookUp: "Tarisa kumusoro",
    lookLeft: "Tarisa kuruboshwe",
    lookRight: "Tarisa kurudyi",
    lookDown: "Tarisa pasi",
    muteAmbientSound: "Dzima ambient sound",
    enableAmbientSound: "Batidza ambient sound",
    disableTts: "Dzima text-to-speech",
    enableTts: "Batidza text-to-speech",
    vrChecking: "Tiri kuona kana VR iripo...",
    vrReady: "Headset yeVR yagadzirira",
    vrUnavailable: "VR haisi kuwanikwa",
    vrActive: "VR yabatidzwa",
    vrReadyDetails:
      "Headset nebrowser inotsigira WebXR zvinogona kupinda muimmersive mode pano.",
    vrUnavailableDetails:
      "Browser kana mudziyo uyu hausi kutsigira immersive WebXR VR.",
    vrSecureContextRequired: "VR inoda HTTPS yakachengeteka.",
    vrActiveDetails: "Immersive session yave kushanda muheadset yenyu.",
    enterVr: "Pinda muVR",
    enteringVr: "Kupinda muVR...",
    vrLaunchFailed:
      "Hatina kukwanisa kutanga VR. Tarisa mvumo yeheadset mobva maedza zvakare.",
  },
  nd: {
    systemReady: "Isistimu isilungile",
    guideThinking: "Umhlahlandlela uyacabanga...",
    requestingCloudNarration: "Kucelwa indatshana ye-cloud...",
    transcribing: "Kuguqulelwa amazwi abe ngumbhalo...",
    whisperFallback:
      "Ukuguqulwa kwelizwi akutholakali. Kusetshenziswa i-Onesa AI...",
    onesaFallback: "Kusetshenziswa i-Onesa AI fallback.",
    localGuidance: "Kusetshenziswa umhlahlandlela wendawo.",
    listening: "Silalele...",
    micNotSupported: "Imaikorofoni ayisekelwa",
    micDenied: "Imvumo yemakrofoni yenqatshiwe",
    noAudio: "I-audio ayitholakali. Kusetshenziswa ilizwi lebrawuza.",
    cloudQuotaExceeded:
      "Ukulandisa kwe-inthanethi akutholakali. Zama ilizwi lebrawuza.",
    cloudFailed:
      "Ukulandisa kwe-inthanethi akutholakali. Kusetshenziswa ilizwi lebrawuza.",
    browserBlocked: "Ilizwi lebrawuza livinjiwe. Cindezela i-Narration njalo.",
    selectDestination: "Khetha indawo",
    narration: "Indatshana",
    selectLocation: "Khetha indawo",
    narrationPending:
      "Indatshana izavela lapha lapho i-AI isiqedile umhlahlandlela.",
    conversationEnabled: "kuvuliwe",
    conversationDisabled: "kuvaliwe",
    ambientOn: "kuvuliwe",
    ambientOff: "kuvaliwe",
    conversation: "Ingxoxo",
    sttText: "Wena",
    response: "Impendulo",
    sttUnavailable: "Sehlulekile ukuguqula ilizwi libe ngumbhalo.",
    pushToTalk: "Bamba Ukhulume",
    releaseToSend: "Khulula Ukuthumela",
    holdToSpeakHint: "Bamba ibhathini ukuze ukhulume.",
    ambient: "Umsindo wendawo",
    currentContext: "Indawo Yamanje",
    conversationOn: "Ingxoxo: Ivuliwe",
    conversationOff: "Ingxoxo: Ivaliwe",
    ambientOnBadge: "Ambient: Ivuliwe",
    ambientOffBadge: "Ambient: Ivaliwe",
    narrationOn: "INDATSHANA: Ivuliwe",
    narrationOff: "INDATSHANA: Ivaliwe",
    vrStartNarration: "Qalisa Indatshana",
    vrStartConversation: "Qalisa Ingxoxo",
    voice: "Ilizwi",
    male: "Indoda",
    female: "Owesifazana",
    minimize: "Nciphisa",
    fullscreen: "Isikrini Esigcwele",
    previewUnavailable:
      "Umfanekiso we3D awutholakali kubrawuza le. Ungabona imifanekiso, ufunde ulwazi lwendawo njalo usebenzise ilizwi.",
    fullscreenUnavailable:
      "Isikrini esigcwele asitholakali. Ungaqhubeka ekhasini.",
    autoOn: "Auto: Ivuliwe",
    autoOff: "Auto: Ivaliwe",
    walkthrough: "Ukuhambahamba",
    close: "Vala",
    highlights: "Okuqakathekileyo",
    loadingPoi: "Kulayishwa ulwazi lwe-POI...",
    stageLabel: "Isigaba",
    previousStage: "Isigaba esidlulileyo",
    nextStage: "Isigaba esilandelayo",
    pointOfInterest: "Indawo eqakathekileyo",
    nearbyHighlights: "Okuqakathekileyo okuseduze",
    relatedHighlights: "Okuqakathekileyo okuhambelanayo",
    enterFullscreen: "Ngena ku-fullscreen",
    exitFullscreen: "Phuma ku-fullscreen",
    zoomIn: "Sondeza",
    zoomOut: "Yelula",
    resetView: "Buyisela ukubona",
    toggleAutoRotate: "Vula/vala auto rotate",
    showPlaceInformation: "Bonisa ulwazi lwendawo",
    lookUp: "Khangela phezulu",
    lookLeft: "Khangela kwesokhohlo",
    lookRight: "Khangela kwesokudla",
    lookDown: "Khangela phansi",
    muteAmbientSound: "Thulisa umsindo wendawo",
    enableAmbientSound: "Vula umsindo wendawo",
    disableTts: "Vala text-to-speech",
    enableTts: "Vula text-to-speech",
    vrChecking: "Kuhlolwa ukusekelwa kwe-VR...",
    vrReady: "I-headset ye-VR isilungile",
    vrUnavailable: "I-VR ayitholakali",
    vrActive: "I-VR ivuliwe",
    vrReadyDetails:
      "I-headset lebrawuza elisekela i-WebXR lingangena ku-immersive mode lapha.",
    vrUnavailableDetails:
      "Ibrawuza kumbe idivayisi le ayisekeli immersive WebXR VR.",
    vrSecureContextRequired: "I-VR idinga uxhumano lwe-HTTPS oluvikelekileyo.",
    vrActiveDetails: "I-immersive session isiqhuba ku-headset yakho.",
    enterVr: "Ngena ku-VR",
    enteringVr: "Kungena ku-VR...",
    vrLaunchFailed:
      "Sehlulekile ukuqalisa i-VR. Hlola imvumo ye-headset bese uzama njalo.",
  },
  de: {
    systemReady: "System bereit",
    guideThinking: "Reisefuehrer denkt nach...",
    requestingCloudNarration: "Cloud-Erzaehlung wird angefragt...",
    transcribing: "Transkription laeuft...",
    whisperFallback:
      "Sprachtranskription nicht verfuegbar. Onesa AI wird als Fallback genutzt...",
    onesaFallback: "Onesa-AI-Fallback wird verwendet.",
    localGuidance: "Lokaler Fuehrungsmodus wird verwendet.",
    listening: "Hoert zu...",
    micNotSupported: "Mikrofon wird nicht unterstuetzt",
    micDenied: "Mikrofonzugriff verweigert",
    noAudio: "Audio nicht verfuegbar. Browser-Stimme wird verwendet.",
    cloudQuotaExceeded:
      "Online-Erzählung nicht verfügbar. Versuchen Sie die Browserstimme.",
    cloudFailed:
      "Online-Erzählung nicht verfügbar. Die Browserstimme wird verwendet.",
    browserBlocked:
      "Browser-Stimme blockiert. Tippen Sie erneut auf Narration.",
    selectDestination: "Ziel waehlen",
    narration: "Erzaehlung",
    selectLocation: "Ort waehlen",
    narrationPending:
      "Die Erzaehlung erscheint hier, sobald die KI die Fuehrung erstellt hat.",
    conversationEnabled: "aktiv",
    conversationDisabled: "inaktiv",
    ambientOn: "an",
    ambientOff: "aus",
    conversation: "Gespaech",
    sttText: "Sie",
    response: "Antwort",
    sttUnavailable: "Audio konnte nicht transkribiert werden.",
    pushToTalk: "Zum Sprechen halten",
    releaseToSend: "Zum Senden loslassen",
    holdToSpeakHint: "Halten Sie die Gespraechstaste zum Sprechen gedrueckt.",
    ambient: "Umgebungsgeraeusch",
    currentContext: "Aktueller Kontext",
    conversationOn: "Gespaech: An",
    conversationOff: "Gespaech: Aus",
    ambientOnBadge: "Ambient: An",
    ambientOffBadge: "Ambient: Aus",
    narrationOn: "ERZAEHLUNG: An",
    narrationOff: "ERZAEHLUNG: Aus",
    vrStartNarration: "Erzaehlung starten",
    vrStartConversation: "Gespaech starten",
    voice: "Stimme",
    male: "Maennlich",
    female: "Weiblich",
    minimize: "Minimieren",
    fullscreen: "Vollbild",
    previewUnavailable:
      "Die 3D-Vorschau ist in diesem Browser nicht verfügbar. Sie können weiterhin Bilder ansehen, Ortsinformationen lesen und die Sprachfunktionen nutzen.",
    fullscreenUnavailable:
      "Vollbild ist hier nicht verfügbar. Sie können auf der Seite fortfahren.",
    autoOn: "Auto: An",
    autoOff: "Auto: Aus",
    walkthrough: "Rundgang",
    close: "Schliessen",
    highlights: "Highlights",
    loadingPoi: "POI-Informationen werden geladen...",
    stageLabel: "Szene",
    previousStage: "Zurück",
    nextStage: "Weiter",
    pointOfInterest: "Sehenswuerdigkeit",
    nearbyHighlights: "Highlights in der Naehe",
    relatedHighlights: "Verwandte Highlights",
    enterFullscreen: "Vollbild einschalten",
    exitFullscreen: "Vollbild verlassen",
    zoomIn: "Vergroessern",
    zoomOut: "Verkleinern",
    resetView: "Ansicht zuruecksetzen",
    toggleAutoRotate: "Auto-Drehung umschalten",
    showPlaceInformation: "Ortsinformationen anzeigen",
    lookUp: "Nach oben schauen",
    lookLeft: "Nach links schauen",
    lookRight: "Nach rechts schauen",
    lookDown: "Nach unten schauen",
    muteAmbientSound: "Umgebungsgeraeusch stummschalten",
    enableAmbientSound: "Umgebungsgeraeusch aktivieren",
    disableTts: "Text-to-Speech deaktivieren",
    enableTts: "Text-to-Speech aktivieren",
    vrChecking: "VR-Unterstuetzung wird geprueft...",
    vrReady: "VR-Headset bereit",
    vrUnavailable: "VR nicht verfuegbar",
    vrActive: "VR aktiv",
    vrReadyDetails:
      "Ein kompatibles WebXR-Headset und ein passender Browser koennen hier in den immersiven Modus wechseln.",
    vrUnavailableDetails:
      "Dieser Browser oder dieses Geraet unterstuetzt kein immersives WebXR-VR.",
    vrSecureContextRequired: "VR erfordert eine sichere HTTPS-Verbindung.",
    vrActiveDetails: "Die immersive Sitzung laeuft auf Ihrem Headset.",
    enterVr: "VR starten",
    enteringVr: "VR wird gestartet...",
    vrLaunchFailed:
      "VR konnte nicht gestartet werden. Bitte Headset-Berechtigungen pruefen und erneut versuchen.",
  },
};

type VrHintCopy = {
  title: string;
  stageLine: string;
  instructionLine: string;
  interactionLine: string;
};

export function getVrHintCopy(
  language: UiLanguage,
  stageTitle: string,
  interactionCount: number
): VrHintCopy {
  if (language === "sn") {
    return {
      title: "VR GWARA",
      stageLine: `Chikamu: ${stageTitle}`,
      instructionLine:
        "Bata hotspots, rings dzePOI, kana guide orb kuti mufambe.",
      interactionLine: `Zvakaitwa muchikamu ichi: ${interactionCount}`,
    };
  }

  if (language === "nd") {
    return {
      title: "VR UMHLAHLANDLELA",
      stageLine: `Isigaba: ${stageTitle}`,
      instructionLine:
        "Chofoza ama-hotspot, ama-ring e-POI, kumbe i-guide orb ukuze uhlolisise.",
      interactionLine: `Ukuxhumana kulesi sigaba: ${interactionCount}`,
    };
  }

  if (language === "de") {
    return {
      title: "VR GUIDE",
      stageLine: `Szene: ${stageTitle}`,
      instructionLine:
        "Tippen Sie auf Hotspots, POI-Ringe oder die Fuehrungs-Kugel, um zu erkunden.",
      interactionLine: `Interaktionen in dieser Szene: ${interactionCount}`,
    };
  }

  return {
    title: "VR GUIDE",
    stageLine: `Stage: ${stageTitle}`,
    instructionLine: "Tap hotspots, POI rings, or the guide orb to explore.",
    interactionLine: `Interactions this stage: ${interactionCount}`,
  };
}
