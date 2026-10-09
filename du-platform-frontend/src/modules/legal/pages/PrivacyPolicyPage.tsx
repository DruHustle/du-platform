import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  return (
    <Layout>
      <section className="min-h-screen bg-slate-950 px-6 py-28">
        <div className="container mx-auto max-w-3xl text-white space-y-6">
          <h1 className="text-4xl font-black tracking-tighter">{tr("legal.privacy.title", "Privacy Policy")}</h1>
          <p className="text-white/70">{tr("legal.privacy.p1", "We collect account and usage data only for operating the platform, fraud prevention, and user support.")}</p>
          <p className="text-white/70">{tr("legal.privacy.p2", "Your data is processed under applicable data-protection rules and is not sold to third parties.")}</p>
          <p className="text-white/70">{tr("legal.privacy.p3", "For deletion or correction requests, contact the support team listed in the footer.")}</p>
        </div>
      </section>
    </Layout>
  );
}

