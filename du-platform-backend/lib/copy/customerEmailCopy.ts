import { customerLanguage } from "../../contracts/customerLanguage";

const copy = {
  order_subject: {
    en: "Order request received: {{ref}}",
    de: "Bestellanfrage erhalten: {{ref}}",
    sn: "Chikumbiro cheodha chagamuchirwa: {{ref}}",
    nd: "Isicelo se-oda samukelwe: {{ref}}",
  },
  order_ref: {
    en: "Order request: {{ref}}",
    de: "Bestellanfrage: {{ref}}",
    sn: "Chikumbiro cheodha: {{ref}}",
    nd: "Isicelo se-oda: {{ref}}",
  },
  delivery: {
    en: "Delivery allowance (estimate, not a quote): {{amount}}",
    de: "Lieferbudget (Schätzung, kein Angebot): {{amount}}",
    sn: "Mari yekufambisa (fungidziro, haisi mutengo wakasimbiswa): {{amount}}",
    nd: "Imali yokudiliva (isilinganiso, ayisiyo ntengo eqinisekisiweyo): {{amount}}",
  },
  total: {
    en: "Estimated total: {{amount}}",
    de: "Geschätzter Gesamtbetrag: {{amount}}",
    sn: "Mari yose inofungidzirwa: {{amount}}",
    nd: "Isamba esilinganiselweyo: {{amount}}",
  },
  order_next: {
    en: "Your order request is saved. No payment has been taken and delivery is not confirmed. Contact the shop with your reference to confirm stock, DHL service availability for your destination, final costs and payment instructions.",
    de: "Ihre Bestellanfrage wurde gespeichert. Es wurde nichts bezahlt; die Lieferung ist noch nicht bestätigt. Kontaktieren Sie den Shop mit Ihrer Referenz, um Bestand, DHL-Verfügbarkeit für Ihr Ziel, Endkosten und Zahlungsanweisungen zu bestätigen.",
    sn: "Chikumbiro cheodha chachengetwa. Hapana mari yatorwa uye kuendeswa hakusati kwasimbiswa. Batai chitoro nereferensi yenyu kuti musimbise zviripo, kuwanikwa kwebasa reDHL kwamuri, mari yekupedzisira nemirayiridzo yekubhadhara.",
    nd: "Isicelo se-oda sigciniwe. Akukathathwa mali njalo ukudiliva akukaqinisekiswa. Xhumanani lesitolo ngesikhombi senu ukuze liqinisekise impahla, ukutholakala kwenkonzo yeDHL endaweni yenu, izindleko zokucina lendlela yokubhadala.",
  },
  contact: {
    en: "Contact: info@diasporaunlocked.com",
    de: "Kontakt: info@diasporaunlocked.com",
    sn: "Tibatei: info@diasporaunlocked.com",
    nd: "Xhumanani lathi: info@diasporaunlocked.com",
  },
  confirm_subject: {
    en: "Confirm your Diaspora Unlocked subscription",
    de: "Ihre Anmeldung bei Diaspora Unlocked bestätigen",
    sn: "Simbisisai kunyoresa kwenyu kuDiaspora Unlocked",
    nd: "Qinisekisani ukubhalisela kwenu iDiaspora Unlocked",
  },
  confirm_title: {
    en: "Confirm your newsletter subscription",
    de: "Newsletter-Anmeldung bestätigen",
    sn: "Simbisisai kunyoresa kwetsamba yenhau",
    nd: "Qinisekisani ukubhalisela incwadi yezindaba",
  },
  confirm_intro: {
    en: "Please confirm that you want to receive news and opportunities from Diaspora Unlocked.",
    de: "Bitte bestätigen Sie, dass Sie Nachrichten und Möglichkeiten von Diaspora Unlocked erhalten möchten.",
    sn: "Simbisisai kuti munoda kugamuchira nhau nemikana kubva kuDiaspora Unlocked.",
    nd: "Qinisekisani ukuthi lifuna ukwamukela izindaba lamathuba avela kuDiaspora Unlocked.",
  },
  confirm_link: {
    en: "Confirm your email: {{url}}",
    de: "E-Mail bestätigen: {{url}}",
    sn: "Simbisisai imeri yenyu: {{url}}",
    nd: "Qinisekisani i-imeyili yenu: {{url}}",
  },
  confirm_expiry: {
    en: "This link expires in 48 hours. If you did not request this, ignore this email.",
    de: "Dieser Link ist 48 Stunden gültig. Wenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.",
    sn: "Link iyi inopera mumaawa 48. Kana musina kukumbira izvi, regai imeri iyi.",
    nd: "Ilinki le iphelelwa ngamahola angu-48. Nxa lingazange likucele lokhu, lingayinaki i-imeyili le.",
  },
  confirm_footer: {
    en: "You requested email updates from Diaspora Unlocked. No newsletters will be sent until you confirm.",
    de: "Sie haben E-Mail-Neuigkeiten von Diaspora Unlocked angefordert. Newsletter werden erst nach Ihrer Bestätigung versendet.",
    sn: "Makakumbira nhau neimeri kubva kuDiaspora Unlocked. Hapana tsamba yenhau ichatumirwa musati masimbisa.",
    nd: "Licele izindaba nge-imeyili kuDiaspora Unlocked. Akulancwadi yezindaba ezathunyelwa lingakaqinisekisi.",
  },
  confirm_button: {
    en: "Confirm subscription",
    de: "Anmeldung bestätigen",
    sn: "Simbisisai kunyoresa",
    nd: "Qinisekisani ukubhalisela",
  },
  newsletter_footer: {
    en: "You received this email because you subscribed to Diaspora Unlocked.",
    de: "Sie erhalten diese E-Mail, weil Sie Diaspora Unlocked abonniert haben.",
    sn: "Magamuchira imeri iyi nekuti makanyoresa kuDiaspora Unlocked.",
    nd: "Lamukele i-imeyili le ngoba labhalisela iDiaspora Unlocked.",
  },
  unsubscribe: {
    en: "Unsubscribe",
    de: "Abmelden",
    sn: "Regerai kunyoresa",
    nd: "Yekelani ukubhalisela",
  },
} as const;

export function emailText(
  language: unknown,
  key: keyof typeof copy,
  values: Record<string, string | number> = {}
): string {
  return copy[key][customerLanguage(language)].replace(
    /{{(\w+)}}/g,
    (_, name: string) => String(values[name] ?? "")
  );
}
