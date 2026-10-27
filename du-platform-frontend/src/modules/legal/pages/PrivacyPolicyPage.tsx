import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950">
        <div className="container document-content mx-auto text-white space-y-6">
          <h1 className="page-title">
            {tr("legal.privacy.title", "Privacy Policy")}
          </h1>
          <p className="text-white/70">
            {tr(
              "legal.privacy.p1",
              "We collect account and usage data only for operating the platform, fraud prevention, and user support."
            )}
          </p>
          <p className="text-white/70">
            {tr(
              "legal.privacy.p2",
              "Your data is processed under applicable data-protection rules and is not sold to third parties."
            )}
          </p>
          <p className="rounded-xl border border-amber-300/40 p-4">
            {t("pilot.draft_notice")}
          </p>
          {[
            "privacy_flows",
            "privacy_whatsapp",
            "privacy_ai",
            "privacy_controls",
            "privacy_retention",
          ].map(key => (
            <p key={key} className="text-white/80">
              {t(`pilot.${key}`)}
            </p>
          ))}
          <p className="text-white/80">{t("product_interest.privacy_notes")}</p>
          <p className="text-white/80">{t("contact_enquiry.privacy")}</p>
          <p className="text-white/80">
            {t("travel.privacy")}
            <br />
            {t("weather.privacy")}
          </p>
          <a href="/legal-notice" className="text-zim-gold underline">
            {t("pilot.operator_title")}
          </a>
          <p className="text-white/70">
            {tr(
              "legal.privacy.p3",
              "For deletion or correction requests, contact the support team listed in the footer."
            )}
          </p>
        </div>
      </section>
    </Layout>
  );
}
