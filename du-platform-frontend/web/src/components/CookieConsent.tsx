import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { setCookieConsent, useCookieConsent } from "@/lib/cookieConsent";

export default function CookieConsent() {
  const { t } = useTranslation();
  const consent = useCookieConsent();
  const [location] = useLocation();
  if (consent || location === "/cookie-settings") return null;

  return (
    <section
      aria-label={t("cookies.consent.title", {
        defaultValue: "Cookie preferences",
      })}
      className="fixed inset-x-0 bottom-0 z-[240] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <p className="text-white/90 text-sm leading-relaxed sm:flex-1">
            {t("cookies.consent.optional_description", {
              defaultValue:
                "Essential storage keeps your account and preferences working. You can also allow optional analytics to help us improve the site.",
            })}{" "}
            <Link
              href="/cookie-settings"
              className="underline underline-offset-4"
            >
              {t("cookies.consent.settings", {
                defaultValue: "Cookie settings",
              })}
            </Link>
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              onClick={() => setCookieConsent("rejected")}
              variant="outline"
              className="min-h-11 border-white/20 bg-transparent text-white hover:bg-white hover:text-zim-black text-xs"
            >
              {t("cookies.consent.reject", { defaultValue: "Essential only" })}
            </Button>
            <Button
              onClick={() => setCookieConsent("accepted")}
              className="min-h-11 bg-zim-gold text-zim-black hover:bg-white text-xs font-bold"
            >
              {t("cookies.consent.accept", { defaultValue: "Accept cookies" })}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
