import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import DiscoveryHero from "@/components/discovery/DiscoveryHero";
import DiscoverySection from "@/components/discovery/DiscoverySection";
import { careProviders, providerPages, type CareGoal } from "./providers";
import countryCodes from "./countries.json";

export default function CareHomePage() {
  const { t, i18n } = useTranslation();
  const [goal, setGoal] = useState<CareGoal | null>(null);
  const [applicant, setApplicant] = useState("");
  const [covered, setCovered] = useState("");
  const countries = useMemo(() => {
    const names = new Intl.DisplayNames([i18n.language, "en"], {
      type: "region",
    });
    return countryCodes
      .map((code) => ({ code, name: names.of(code) || code }))
      .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  }, [i18n.language]);
  const results = goal ? careProviders(goal, applicant, covered) : [];
  const ready = goal && applicant && covered;

  return (
    <Layout>
      <DiscoveryHero
        eyebrow={t("nav.care")}
        title={t("care.title")}
        highlight=""
        description={t("care.intro")}
        image="/images/pages/care/family-gathering.webp"
        imageAlt={t("care.image")}
        caption=""
      >
        {(["funeral", "repatriation"] as const).map((choice) => (
          <Button
            key={choice}
            asChild
            variant="outline"
            className="h-auto min-h-11 whitespace-normal border-slate-500 bg-slate-900 text-white"
          >
            <a href="#care-start" onClick={() => setGoal(choice)}>
              {t(`care.${choice}`)}
            </a>
          </Button>
        ))}
      </DiscoveryHero>
      <div id="care-content">
        <DiscoverySection
          id="care-start"
          title={t("care.lookup")}
          description={t("care.lookup_help")}
        >
          <div className="max-w-3xl space-y-6">
            <label className="grid gap-2 font-semibold">
              {t("care.goal")}
              <select
                aria-label={t("care.goal")}
                className="rounded-md border border-slate-500 bg-white p-3 text-slate-950"
                value={goal || ""}
                onChange={(event) =>
                  setGoal((event.target.value as CareGoal) || null)
                }
              >
                <option value="">{t("care.choose_goal")}</option>
                <option value="funeral">{t("care.funeral")}</option>
                <option value="repatriation">{t("care.repatriation")}</option>
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["applicant", "covered"] as const).map((field) => (
                <label key={field} className="grid gap-2 font-semibold">
                  {t(`care.${field}`)}
                  <select
                    aria-label={t(`care.${field}`)}
                    className="min-w-0 rounded-md border border-slate-500 bg-white p-3 text-slate-950"
                    value={field === "applicant" ? applicant : covered}
                    onChange={(event) =>
                      (field === "applicant" ? setApplicant : setCovered)(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">{t("care.choose_country")}</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div aria-live="polite" className="space-y-4">
              {ready && !results.length && <p>{t("care.no_match")}</p>}
              {results.map((key) => (
                <article
                  key={key}
                  className="rounded-xl border border-slate-300 bg-white p-5 text-slate-900"
                >
                  <h3 className="text-xl font-bold">
                    {t(`care.providers.${key}.title`)}
                  </h3>
                  <p className="mt-2">{t(`care.providers.${key}.body`)}</p>
                  <p className="mt-2 text-sm">{t("care.handoff")}</p>
                  <a
                    className="mt-3 inline-block py-2 font-bold text-slate-900 underline"
                    rel="noreferrer"
                    href={providerPages[key]}
                  >
                    {t(`care.providers.${key}.action`)}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </DiscoverySection>
      </div>
    </Layout>
  );
}
