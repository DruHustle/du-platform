import { readPublishedProductDetails } from "../../shop/productDetailsStore";
import answerCopy from "../../../../shared/catalogueAnswerCopy.json";
import type { ProductDetails } from "../../../../shared/productDetails";
import { listShopProducts } from "../../../shared/persistence/shopStore";
import {
  convertShopCents,
  isShopCurrency,
} from "../../../../shared/shopCurrency";
const copy = {
  en: {
    intro: "From the published DU catalogue (availability can change):",
    out: "currently unavailable",
    stock: "available now",
    note: "Displayed prices are indicative. Add products to your basket and send an order request; the shop confirms the final quote, DHL delivery and assisted payment. I cannot book, take payment or confirm delivery.",
    failed:
      "I cannot retrieve the current catalogue. Please check [the shop](/shop/products); I cannot confirm stock or prices right now.",
    none: "No published product matches that request. Browse [the catalogue](/shop/products).",
  },
  de: {
    intro:
      "Aus dem veröffentlichten DU-Katalog (Verfügbarkeit kann sich ändern):",
    out: "derzeit nicht verfügbar",
    stock: "jetzt verfügbar",
    note: "Angezeigte Preise sind Richtwerte. Produkte in den Warenkorb legen und Anfrage senden; der Shop bestätigt Endpreis, DHL-Lieferung und Zahlung. Ich kann weder buchen noch Zahlungen oder Lieferungen bestätigen.",
    failed:
      "Der aktuelle Katalog ist nicht abrufbar. Bitte [den Shop](/shop/products) prüfen; Bestand und Preise sind derzeit nicht bestätigbar.",
    none: "Kein veröffentlichtes Produkt passt. [Katalog ansehen](/shop/products).",
  },
  sn: {
    intro: "Kubva mukatalogi yeDU yakaburitswa (huwandu hunogona kuchinja):",
    out: "hachipo pari zvino",
    stock: "chiripo iye zvino",
    note: "Mitengo ndeyekuronga. Isa mubhasikiti wotumira chikumbiro; chitoro chinosimbisa mutengo wekupedzisira, DHL nekubhadhara. Handikwanisi kubhuka, kutora mari kana kusimbisa kutumira.",
    failed:
      "Handikwanisi kuwana katalogi yazvino. Ona [chitoro](/shop/products); handisimbisi huwandu kana mitengo pari zvino.",
    none: "Hapana chigadzirwa chakaburitswa chaenderana nazvo. Ona [katalogi](/shop/products).",
  },
  nd: {
    intro: "Kuvela kukhathalogi yeDU ebekiweyo (impahla ingatshintsha):",
    out: "akukho khathesi",
    stock: "kukhona khathesi",
    note: "Intengo ngeyokuhlela. Faka ebhasikithini uthumele isicelo; isitolo siqinisekisa intengo yokucina, iDHL lokubhadala. Angikwazi ukubhukha, ukuthatha imali kumbe ukuqinisekisa ukuthumela.",
    failed:
      "Angikwazi ukuthola ikhathalogi yamanje. Bona [isitolo](/shop/products); angiqinisekisi impahla kumbe intengo khathesi.",
    none: "Akulamkhiqizo obekiweyo ofana lesicelo. Bona [ikhathalogi](/shop/products).",
  },
};
type History = Array<{ role: string; content: string }>;
const fieldPatterns: Partial<Record<keyof ProductDetails, RegExp>> = {
  ingredients:
    /ingredient|contain|zutaten|inhaltsstoff|zvinoumba|zvirimo|izithako/i,
  allergens:
    /allergen|allerg|gluten|peanut|lactose|nut.free|ukungezwani|\b(nuts?|milk|eggs?|soy)\b/i,
  sizes:
    /\bsize|\b(small|medium|large|xl|xxl)\b|\bgro(?:ss|ß)e|größ|saizi|ubukhulu/i,
  variants: /variant|option|sarudzo|okukheth/i,
  origin:
    /origin|provenance|herkunft|made in|where.*(?:made|from)|wo.*hergestellt|kwakabva|imvelaphi/i,
  supplier:
    /supplier|sourcing|manufacturer|producer|lieferant|hersteller|mutengesi|umthengisi/i,
  deliveryEligibility: /deliver|dhl|versand|liefer|kutumir|ukuthumel/i,
  materials: /material|made of|zvakagadzir|okwenziw/i,
  netQuantity:
    /volume|quantity|net weight|capacity|netto|pack size|huwandu|ubunengi/i,
  storage: /storage|store it|lager|kuchenget|ukugcin/i,
  handling: /handling|handle|handhab|kubata|ukuphath/i,
};
const followUp =
  /\b(it|its|that|those|this one|them|sie|das|diese|zvacho|icho|yakhona|lokho)\b|^\s*(?:what about|and|und|ko|futhi)\b/i;
const explicitProduct =
  /\b(shop|stock|products?|catalogue|catalog|mazoe|kapenta|cerevita|chevrons|sables|maheu|cascade|dovi|colcom|basket|groceries|katalog|produkte|bestand|zvigadzirwa|chitoro|imikhiqizo|isitolo)\b/i;
export function asksAboutCatalogue(prompt: string, history: History = []) {
  if (
    /stock market|stock exchange|stocks and shares/i.test(prompt) &&
    !/shop|products|catalogue/i.test(prompt)
  )
    return false;
  if (explicitProduct.test(prompt)) return true;
  if (
    /flight|hotel|rooms?|tickets?|visiting hours|lake|national park|itinerary|weather/i.test(
      prompt
    )
  )
    return false;
  if (
    requestedFields(prompt).length ||
    /\b(available|verfügbar|zviripo|kukhona|price|preis)\b/i.test(prompt)
  )
    return true;
  return (
    followUp.test(prompt) &&
    history
      .slice(-6)
      .some(m => m.role === "user" && explicitProduct.test(m.content))
  );
}
const normalize = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
// Recognize the same public field names customers see in each supported locale,
// including multiword Shona/Ndebele labels rather than only English keywords.
function requestedFields(prompt: string) {
  const query = ` ${normalize(prompt)} `;
  return Object.entries(fieldPatterns)
    .filter(
      ([field, pattern]) =>
        pattern!.test(prompt) ||
        Object.values(answerCopy).some(locale =>
          query.includes(
            ` ${normalize(locale.fields[field as keyof typeof locale.fields])} `
          )
        )
    )
    .map(([field]) => field as keyof ProductDetails);
}
const commonNameWords = new Set(
  "the a an of and with zimbabwe zimbabwean home world cup kit set pack case bottle single traditional product products".split(
    " "
  )
);
const genericWords = new Set(
  "which what show me list browse available availability current all your do you have tell about please in stock products product shop catalogue catalog now are there is any can i buy sell the and it its their ingredients allergens price prices for of a an food crafts sports welche was zeigen sie mir produkte sind verfugbar bestand zutaten allergene preis im katalog gibt es bitte ndezvipi zvigadzirwa zviripo chitoro katalogi imikhiqizo isitolo yiphi ekhona kukhona".split(
    " "
  )
);
const followUpWords = new Set([
  ...Array.from(genericWords),
  ...Object.values(answerCopy).flatMap(locale =>
    Object.values(locale.fields).flatMap(label => normalize(label).split(" "))
  ),
  ..."does contain contains that those this one them has sizes size small medium large xl xxl variants variant options origin provenance supplier sourcing manufacturer producer delivery eligibility materials material storage handling volume quantity net weight capacity pack from where made in hat haben und das diese deren welche herkunft grossen lagerung zvacho icho chii uye mune yakhona lokho izithako ko futhi".split(
    " "
  ),
]);
const isUnambiguousFollowUp = (prompt: string) =>
  followUp.test(prompt) &&
  normalize(prompt)
    .split(" ")
    .every(
      w =>
        followUpWords.has(w) ||
        Object.values(fieldPatterns).some(pattern => pattern!.test(w))
    );
function matchingProducts(prompt: string, products: any[]) {
  const quantities = Array.from(
    prompt.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(ml|l|kg|g)\b/gi)
  ).map(m => normalize(m[1] + m[2]));
  if (quantities.length)
    products = products.filter(p =>
      quantities.some(
        q =>
          (" " + normalize(p.name) + " ").includes(" " + q + " ") ||
          (" " + normalize(p.slug) + " ").includes(" " + q + " ")
      )
    );
  const query = " " + normalize(prompt) + " ";
  const exact = products.filter(p =>
    [p.name, p.slug].some(name =>
      query.includes(" " + normalize(String(name)) + " ")
    )
  );
  if (exact.length)
    return exact.filter(
      p =>
        !exact.some(
          other =>
            other !== p && normalize(other.name).includes(normalize(p.name))
        )
    );
  const words = new Set(normalize(prompt).split(" "));
  const scores = products.map(p => ({
    p,
    score: Array.from(new Set(normalize(p.name).split(" "))).filter(
      w => w.length >= 4 && !commonNameWords.has(w) && words.has(w)
    ).length,
  }));
  const best = Math.max(0, ...scores.map(s => s.score));
  return best ? scores.filter(s => s.score === best).map(s => s.p) : [];
}
const plain = (value: unknown) =>
  String(value ?? "")
    .replace(/[\[\]\\\r\n]/g, " ")
    .trim();

export async function catalogueReply(
  prompt: string,
  language: string,
  currency: unknown = "EUR",
  retrieve = listShopProducts,
  retrieveDetails = readPublishedProductDetails,
  history: History = []
) {
  const l = copy[language as keyof typeof copy] || copy.en;
  const facts =
    answerCopy[language as keyof typeof answerCopy] || answerCopy.en;
  try {
    const result = await retrieve();
    if (result.source !== "db") return l.failed;
    const products = result.products.filter(p => Number(p.is_active) === 1);
    let named = matchingProducts(prompt, products);
    // Only prior user questions can resolve a follow-up. Assistant text is never
    // trusted as evidence of a product, and a new named target overrides history.
    if (!named.length && isUnambiguousFollowUp(prompt)) {
      for (const message of history
        .filter(m => m.role === "user")
        .slice(-6)
        .reverse()) {
        named = matchingProducts(message.content, products);
        if (named.length) break;
      }
    }
    const generic = normalize(prompt)
      .split(" ")
      .every(w => genericWords.has(w));
    if (!named.length && !generic) return `${l.none}\n\n${l.note}`;
    const requested = requestedFields(prompt);
    if (!named.length && requested.length)
      return `${facts.choose}\n\n[${facts.information}](/shop/products)`;
    const availableOnly =
      /\b(available|stock|verfügbar|zviripo|kukhona)\b/i.test(prompt);
    let candidates = named.length ? named : products;
    if (!named.length && availableOnly && candidates.some(p => p.stock_qty > 0))
      candidates = candidates.filter(p => p.stock_qty > 0);
    const selected = candidates
      .slice()
      .sort((a, b) => Number(b.stock_qty > 0) - Number(a.stock_qty > 0))
      .slice(0, 8);
    if (!selected.length) return `${l.none}\n\n${l.note}`;
    const target = isShopCurrency(currency) ? currency : "EUR";
    const blocks = await Promise.all(
      selected.map(async p => {
        const lines = [
          `- [${plain(p.name)}](/shop/products?product=${encodeURIComponent(p.slug)}) · ${(convertShopCents(p.price_cents, p.currency, target) / 100).toFixed(2)} ${target} · ${p.stock_qty > 0 ? l.stock : l.out}`,
        ];
        if (requested.length) {
          let details: ProductDetails | undefined,
            failed = false;
          try {
            const published = await retrieveDetails(p.id);
            if (!published) return ""; // A product hidden since retrieval exposes no details.
            details = published.details;
          } catch {
            failed = true;
          }
          for (const field of requested) {
            const label = (facts.fields as Record<string, string>)[field];
            const value = details?.[field];
            lines.push(
              `${label}: ${failed ? facts.failed : typeof value === "string" && value.trim() ? plain(value) : field === "allergens" ? facts.missingAllergens : facts.missing}`
            );
          }
          if (requested.includes("allergens") && details?.allergens)
            lines.push(facts.allergenCaution);
          lines.push(
            `[${facts.information}](/shop/product/${encodeURIComponent(p.slug)}) · ${facts.next}`
          );
        }
        return lines.join("\n");
      })
    );
    const visible = blocks.filter(Boolean);
    if (!visible.length) return l.none;
    return `${l.intro}${named.length > 1 ? ` ${facts.choose}` : ""}\n\n${visible.join("\n\n")}\n\n${l.note}`;
  } catch {
    return l.failed;
  }
}
