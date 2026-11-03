import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";

export default function TermsOfService() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) =>
    t(key, { defaultValue: fallback });
  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950">
        <div className="container document-content mx-auto text-white space-y-6">
          <h1 className="page-title">
            {tr("legal.terms.title", "Terms of Service")}
          </h1>
          <a
            href="/delivery-and-returns"
            className="block text-zim-gold underline"
          >
            {t("pilot.procedures_title")}
          </a>
          <p className="text-white/70">
            {tr(
              "legal.terms.p1",
              "By using this platform, you agree to provide accurate information and comply with applicable financial and trade laws."
            )}
          </p>
          <p className="text-white/70">
            {tr(
              "legal.terms.p2",
              "All investment content is informational and does not constitute personal financial advice."
            )}
          </p>
          <p className="text-white/70">
            {tr(
              "legal.terms.p3",
              "Platform access may be suspended for abuse, fraud, or policy violations."
            )}
          </p>
        </div>
      </section>
    </Layout>
  );
}
