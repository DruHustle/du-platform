import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const CONSENT_KEY = "du_cookie_consent_v1";
const CONSENT_SHOWN_KEY = "du_cookie_consent_seen_v1";

const EUROPE_COUNTRY_CODES = new Set([
  "AL", "AD", "AM", "AT", "AZ", "BY", "BE", "BA", "BG", "HR", "CY", "CZ",
  "DK", "EE", "FI", "FR", "GE", "DE", "GR", "HU", "IS", "IE", "IT", "KZ",
  "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO",
  "PL", "PT", "RO", "RU", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "TR",
  "UA", "GB", "VA",
]);

function getLocaleRegions(): string[] {
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs
    .map((lang) => lang.split("-")[1]?.toUpperCase())
    .filter((code): code is string => Boolean(code));
}

function isLikelyInEurope(): boolean {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (timezone.startsWith("Europe/")) {
    return true;
  }
  const regions = getLocaleRegions();
  return regions.some((region) => EUROPE_COUNTRY_CODES.has(region));
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [open, setOpen] = useState(false);
  const inEurope = useMemo(() => isLikelyInEurope(), []);

  useEffect(() => {
    if (!inEurope) return;
    const accepted = localStorage.getItem(CONSENT_KEY);
    const alreadyShown = localStorage.getItem(CONSENT_SHOWN_KEY);
    if (!accepted && !alreadyShown) {
      localStorage.setItem(CONSENT_SHOWN_KEY, "shown");
      setOpen(true);
    }
  }, [inEurope]);

  if (!open) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[210] px-4 pb-4 lg:bottom-0 lg:z-[100]">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/20 bg-slate-900/95 backdrop-blur-xl px-6 py-5 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-white/90 text-sm leading-relaxed sm:flex-1">
            {tr("cookies.consent.description", "Our website uses anonymised cookies to give you the best browser experience and to collect aggregated statistics. This does not include online advertising cookies.")}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="outline" className="h-9 border-white/20 text-white hover:bg-white hover:text-zim-black text-xs">
              <Link href="/cookie-settings">{tr("cookies.consent.settings", "Cookie settings")}</Link>
            </Button>
            <Button onClick={accept} className="h-9 bg-zim-gold text-zim-black hover:bg-white text-xs font-black">
              {tr("cookies.consent.accept", "Accept cookies")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
