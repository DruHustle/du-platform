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
export function asksAboutCatalogue(prompt: string) {
  if (
    /stock market|stock exchange|stocks and shares/i.test(prompt) &&
    !/shop|products|catalogue/i.test(prompt)
  )
    return false;
  return /\b(shop|stock|products?|catalogue|catalog|mazoe|kapenta|cerevita|chevrons|sables|maheu|cascade|dovi|colcom|basket|groceries|katalog|produkte|verfügbar|bestand|zvigadzirwa|chitoro|imikhiqizo|isitolo)\b/i.test(
    prompt
  );
}
// Explicit read-only interface: published fields only. It never retrieves users,
// supplier records, hidden products, or arbitrary model-supplied SQL.
export async function catalogueReply(
  prompt: string,
  language: string,
  currency: unknown = "EUR",
  retrieve = listShopProducts
) {
  const l = copy[language as keyof typeof copy] || copy.en;
  try {
    const result = await retrieve();
    if (result.source !== "db") return l.failed;
    const products = result.products.filter(p => Number(p.is_active) === 1);
    const named = products.filter(
      p =>
        prompt.toLowerCase().includes(String(p.name).toLowerCase()) ||
        String(p.name)
          .toLowerCase()
          .split(/\s+/)
          .some(word => word.length >= 4 && prompt.toLowerCase().includes(word))
    );
    const availableOnly =
      /\b(available|stock|verfügbar|zviripo|kukhona)\b/i.test(prompt);
    const candidates = named.length ? named : products;
    const available = candidates.filter(p => p.stock_qty > 0);
    const selected = (
      availableOnly && available.length ? available : candidates
    )
      .slice()
      .sort((a, b) => Number(b.stock_qty > 0) - Number(a.stock_qty > 0))
      .slice(0, 12);
    if (!selected.length) return `${l.none}\n\n${l.note}`;
    const target = isShopCurrency(currency) ? currency : "EUR";
    // Names are data, rendered as escaped plain Markdown labels; no retrieved
    // descriptions/instructions enter the model's instruction channel.
    return `${l.intro}\n\n${selected.map(p => `- [${String(p.name).replace(/[\[\]\\\n\r]/g, " ")}](/shop/products?product=${encodeURIComponent(p.slug)}) · ${(convertShopCents(p.price_cents, p.currency, target) / 100).toFixed(2)} ${target} · ${p.stock_qty > 0 ? l.stock : l.out}`).join("\n")}\n\n${l.note}`;
  } catch {
    return l.failed;
  }
}
