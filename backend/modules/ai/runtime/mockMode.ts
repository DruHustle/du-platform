const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

function normalizeFlag(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isOnesaMockModeEnabled(): boolean {
  return TRUTHY_VALUES.has(normalizeFlag(process.env.ONESA_MOCK_MODE));
}

export function getMockSpeechTranscription(): string {
  const value = String(process.env.ONESA_MOCK_STT_TEXT ?? "").trim();
  return value || "hello from mock speech";
}

export function createMockTtsAudio(sampleRate = 24_000, durationMs = 450): Uint8Array {
  const frameCount = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
  const dataSize = frameCount * 2;
  const wav = new Uint8Array(44 + dataSize);
  const view = new DataView(wav.buffer);

  const writeAscii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  return wav;
}

function getLanguageTemplate(
  language: "en" | "sn" | "nd" | "de",
  english: string,
  shona: string,
  ndebele: string,
  german: string
): string {
  if (language === "sn") return shona;
  if (language === "nd") return ndebele;
  if (language === "de") return german;
  return english;
}

export function createMockOnesaReply(
  latestUserMessage: string,
  language: "en" | "sn" | "nd" | "de"
): string {
  const normalized = latestUserMessage.trim().toLowerCase();

  if (normalized.includes("return only valid json") && normalized.includes('"primitive"')) {
    return JSON.stringify({
      modelUrl: null,
      primitive: { kind: "sphere", color: "#60a5fa", scale: [1.5, 1.5, 1.5] },
      title: "Mock World",
      hint: "Generated locally in mock mode.",
    });
  }

  if (normalized.includes("export") || normalized.includes("herbal tea")) {
    return getLanguageTemplate(
      language,
      "1. Confirm Germany's food-import and labeling rules. 2. Prepare shelf-life, ingredient, and traceability documents. 3. Test pricing with one distributor before a pilot shipment.",
      "1. Simbisai mitemo yeGermany yekuunza chikafu uye malabel. 2. Gadzirirai magwaro eshelf-life, ingredients, uye traceability. 3. Tanga nedistributor mumwe chete uye pilot shipment.",
      "1. Qinisekisa imithetho yeGermany yokungenisa ukudla kanye lamalebula. 2. Lungisa amadokhumenti e-shelf-life, ingredients, le-traceability. 3. Qala ngomthengisi oyedwa kanye le-pilot shipment.",
      "1. Klaeren Sie zuerst die deutschen Import- und Kennzeichnungsvorgaben. 2. Bereiten Sie Haltbarkeits-, Zutaten- und Rueckverfolgbarkeitsunterlagen vor. 3. Testen Sie Preise mit einem Vertriebspartner ueber eine kleine Pilotsendung."
    );
  }

  if (normalized.includes("victoria falls") || normalized.includes("tourism")) {
    return getLanguageTemplate(
      language,
      "Victoria Falls is a strong first stop. Pair it with Hwange for wildlife, confirm transfer times early, and keep one buffer day for weather or border delays.",
      "Victoria Falls inzvimbo yakanaka yekutanga. Ibatanidzei neHwange, simbisa nguva dzekufamba nekukurumidza, uye siya zuva rimwe rekuchengetedza kana paine kunonoka.",
      "IVictoria Falls yindawo enhle yokuqala. Hlanganisa leHwange, qinisekisa isikhathi sokuhamba kusenesikhathi, njalo gcina usuku olulodwa lokubambelela uma kube lokulibaziseka.",
      "Victoria Falls ist ein starker erster Halt. Kombinieren Sie es mit Hwange, bestaetigen Sie Transfers frueh und lassen Sie einen Puffertag fuer Wetter oder Grenzverzoegerungen."
    );
  }

  return getLanguageTemplate(
    language,
    "Start with demand validation, local compliance, and a small pilot. I can help you break that down for tourism, investment, technology, or everyday needs.",
    "Tanga nekuongorora kudiwa, mitemo inodiwa, uye pilot diki. Ndinogona kukubatsira pakupatsanura izvi mu tourism, investment, technology, kana zvinodiwa zuva nezuva.",
    "Qala ngokuhlola isidingo, imithetho efunekayo, kanye le-pilot encane. Ngingakuncedisa ukukuhlukanisa ku-tourism, investment, technology, loba izidingo zansuku zonke.",
    "Beginnen Sie mit Nachfragepruefung, Compliance und einem kleinen Pilot. Ich kann das fuer Tourismus, Investitionen, Technologie oder alltaegliche Beduerfnisse aufschluesseln."
  );
}

export function createMockSpeechReply(prompt: string, language: "en" | "sn" | "nd" | "de" = "en"): string {
  return createMockOnesaReply(prompt, language);
}
