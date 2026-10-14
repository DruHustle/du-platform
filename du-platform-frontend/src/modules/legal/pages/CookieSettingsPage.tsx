import { useState } from "react";
import { getCookieConsent, setCookieConsent } from "@/lib/cookieConsent";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function CookieSettings() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  const [analytics, setAnalytics] = useState(
    () => getCookieConsent() === "accepted"
  );
  const [saved, setSaved] = useState(false);
  const save = () => {
    setCookieConsent(analytics ? "accepted" : "rejected");
    setSaved(true);
  };

  return (
    <Layout>
      <section className="py-16 bg-slate-950 min-h-[70vh]">
        <div className="container px-6 mx-auto max-w-3xl">
          <div className="outer-glass-panel rounded-[2rem] border border-white/20 bg-slate-900/95 backdrop-blur-xl p-8 md:p-10">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
              {tr("cookies.settings.title", "Cookie settings")}
            </h1>
            <p className=" leading-relaxed mb-6">
              {tr(
                "cookies.settings.optional_description",
                "Essential storage supports your account and preferences. Optional analytics stays off until you allow it. You can change your choice here at any time."
              )}
            </p>
            <div className="rounded-xl border border-white/20 bg-slate-900/90 p-4 mb-6">
              <label className="flex min-h-11 items-center gap-3 text-white font-semibold">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={event => {
                    setAnalytics(event.target.checked);
                    setSaved(false);
                  }}
                  className="size-5 accent-yellow-400"
                />
                {tr(
                  "cookies.settings.analytics_title",
                  "Anonymised analytics cookies"
                )}
              </label>
              <p className=" text-sm mt-1">
                {tr(
                  "cookies.settings.analytics_optional",
                  "Optional. Helps us understand site performance and usage."
                )}
              </p>
            </div>
            {saved && (
              <p role="status" className="mb-4 text-zim-gold">
                {tr(
                  "cookies.settings.saved",
                  "Your cookie preferences have been saved."
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={save}
                className="bg-zim-gold text-zim-black hover:bg-white"
              >
                {tr("cookies.settings.save", "Save and continue")}
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 text-white hover:bg-white hover:text-zim-black"
              >
                <Link href="/privacy-policy">
                  {tr("cookies.settings.privacy_policy", "Privacy policy")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
