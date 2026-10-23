import Layout from "@/components/Layout";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
export default function PilotPoliciesPage() {
  const { t } = useTranslation();
  const [location] = useLocation();
  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950 text-white">
        <div className="container document-content space-y-6">
          <h1 className="page-title">
            {t(
              location === "/delivery-and-returns"
                ? "pilot.procedures_title"
                : "pilot.operator_title"
            )}
          </h1>
          <p
            role="note"
            className="rounded-xl border border-amber-300/40 bg-amber-400/10 p-4"
          >
            {t("pilot.draft_notice")}
          </p>
          <section id="operator" className="space-y-3">
            <h2 className="text-xl font-semibold">
              {t("pilot.operator_title")}
            </h2>
            <p>{t("pilot.operator_summary")}</p>
            <p>{t("pilot.operator_missing")}</p>
            <a
              href="mailto:info@diasporaunlocked.com"
              className="text-zim-gold underline"
            >
              info@diasporaunlocked.com
            </a>
          </section>
          <section id="delivery" className="space-y-3">
            <h2 className="text-xl font-semibold">
              {t("pilot.procedures_title")}
            </h2>
            <p>{t("pilot.delivery_draft")}</p>
            <p>{t("pilot.payment_draft")}</p>
          </section>
          <section id="returns" className="space-y-3">
            <h2 className="text-xl font-semibold">
              {t("pilot.procedures_title")}
            </h2>
            <p>{t("pilot.returns_draft")}</p>
            <p>{t("pilot.complaints")}</p>
          </section>
          <nav className="flex flex-wrap gap-5 text-zim-gold underline">
            <Link href="/privacy-policy">{t("legal.privacy.title")}</Link>
            <Link href="/cookie-settings">{t("cookies.consent.settings")}</Link>
          </nav>
        </div>
      </section>
    </Layout>
  );
}
