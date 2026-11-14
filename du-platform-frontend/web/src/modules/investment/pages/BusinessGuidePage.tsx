import { useTranslation } from "react-i18next";
import { Link, useRoute } from "wouter";
import Layout from "@/components/Layout";
import NotFoundPage from "@/modules/core/pages/NotFoundPage";
import { businessIdeas } from "../businessIdeas";

export default function BusinessGuidePage() {
  const { t } = useTranslation();
  const [, params] = useRoute("/business-guides/:guide");
  const guide = businessIdeas.find((item) => item.key === params?.guide);
  if (!guide) return <NotFoundPage />;
  const value = (field: string) =>
    t(`investment.opportunities.${guide.key}.${field}`);
  return (
    <Layout>
      <article className="document-section min-h-screen bg-slate-950 text-white">
        <div className="container mx-auto max-w-3xl space-y-6 px-5">
          <Link
            href="/business-guides"
            className="inline-block py-2 text-zim-gold underline"
          >
            {t("investment.back_to_investment")}
          </Link>
          <h1 className="page-title">{value("title")}</h1>
          <p>{value("summary")}</p>
          <dl className="space-y-4">
            {[
              "start",
              "budget",
              "customers",
              "income",
              "checks",
              "improvement",
              "monitor",
            ].map((field) => (
              <div key={field}>
                <dt className="font-bold">
                  {t(`investment.opportunities.labels.${field}`)}
                </dt>
                <dd>{value(field)}</dd>
              </div>
            ))}
          </dl>
          <a href={guide.source} className="block py-2 text-zim-gold underline">
            {value("source")}
          </a>
          <Link
            href="/regulations#due-diligence-checklist"
            className="block py-2 text-zim-gold underline"
          >
            {t("investment.plan.cta")}
          </Link>
        </div>
      </article>
    </Layout>
  );
}
