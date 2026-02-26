import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "du_cookie_consent_v1";

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
  const [open, setOpen] = useState(false);
  const inEurope = useMemo(() => isLikelyInEurope(), []);

  useEffect(() => {
    if (!inEurope) return;
    const accepted = localStorage.getItem(CONSENT_KEY);
    if (!accepted) setOpen(true);
  }, [inEurope]);

  if (!open) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/20 bg-slate-900/95 backdrop-blur-xl p-5 shadow-2xl">
        <p className="text-white/90 text-sm leading-relaxed">
          Our website uses anonymised cookies to give you the best browser experience and to collect aggregated statistics. This does not include online advertising cookies.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/cookie-settings">
            <Button variant="outline" className="border-white/20 text-white hover:bg-white hover:text-zim-black">
              Cookie settings
            </Button>
          </Link>
          <Button onClick={accept} className="bg-zim-gold text-zim-black hover:bg-white">
            Accept cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
