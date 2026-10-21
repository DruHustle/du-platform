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
          <h2 className="text-xl font-semibold">Newsletter subscriptions</h2>
          <p className="text-white/70">
            When you subscribe, we store your email address, signup and
            confirmation dates, subscription status, and newsletter delivery
            records in our database. Resend processes outgoing email. New
            subscriptions require email confirmation. You can unsubscribe using
            the link in any newsletter, or contact the support team for
            deletion. We retain an opt-out record to prevent further
            newsletters.
          </p>
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
