import Layout from "@/components/Layout";
import { FileCheck, Shield, Landmark, Globe, DollarSign, ClipboardCheck, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function Regulations() {
  const { t } = useTranslation();
  const getPoints = (key: string, fallback: string[]) => {
    const value = t(key, { returnObjects: true });
    return Array.isArray(value) ? (value as string[]) : fallback;
  };

  const regulationSections = [
      {
        id: "investment-compliance",
        icon: Landmark,
        title:
          t("regulations.sections.investment_compliance.title") ||
          "Investment Compliance",
        points: getPoints("regulations.sections.investment_compliance.points", [
          "Confirm project legal structure, ownership, and board controls before funding.",
          "Verify licensing and approvals through the official investment portal and relevant sector regulators.",
          "Use written shareholder and governance agreements for diaspora co-investment.",
          "Document source of funds and perform KYC/AML checks on counterparties.",
        ]),
      },
      {
        id: "currency-settlement",
        icon: DollarSign,
        title:
          t("regulations.sections.currency_settlement.title") ||
          "Currency, Repatriation, and Settlement",
        points: getPoints("regulations.sections.currency_settlement.points", [
          "Agree settlement currency (USD/ZiG/other) and payout schedule in contracts.",
          "Define dividend and exit mechanics clearly for diaspora participants.",
          "Use bank-compliant channels with full transaction traceability.",
          "Include FX and transfer-risk provisions in investment term sheets.",
        ]),
      },
      {
        id: "export-controls",
        icon: Globe,
        title:
          t("regulations.sections.export_controls.title") ||
          "Export Trade Controls",
        points: getPoints("regulations.sections.export_controls.points", [
          "Validate HS classification, destination-market restrictions, and permits.",
          "Maintain certificate packs: origin, phytosanitary, and quality documents.",
          "Align labeling, packaging, and traceability to destination-market rules.",
          "Use approved freight and customs brokers for controlled product categories.",
        ]),
      },
      {
        id: "export-certification-and-labeling",
        icon: FileCheck,
        title:
          t("regulations.sections.export_certification_and_labeling.title") ||
          "Certification and Labeling",
        points: getPoints(
          "regulations.sections.export_certification_and_labeling.points",
          [
            "Map each product to required standards before buyer onboarding.",
            "Pre-audit facilities and records before external certification runs.",
            "Maintain lot-level traceability for food, wellness, and craft exports.",
            "Run periodic compliance checks to avoid border holds and penalties.",
          ],
        ),
      },
      {
        id: "tourism-entry-and-safety",
        icon: Shield,
        title:
          t("regulations.sections.tourism_entry_and_safety.title") ||
          "Tourism Entry and Safety",
        points: getPoints("regulations.sections.tourism_entry_and_safety.points", [
          "Check visa category, permitted stay, and document validity before travel.",
          "Carry travel insurance aligned to planned activities and medical needs.",
          "Confirm payment channels and transaction limits in advance.",
          "Follow local park, road, and accommodation compliance requirements.",
        ]),
      },
      {
        id: "due-diligence-checklist",
        icon: ClipboardCheck,
        title:
          t("regulations.sections.due_diligence_checklist.title") ||
          "Diaspora Due-Diligence Checklist",
        points: getPoints("regulations.sections.due_diligence_checklist.points", [
          "Entity verification, UBO checks, and litigation or sanctions screening.",
          "Contract review across commercial, tax, and dispute-resolution clauses.",
          "Operational proof: site inspections, audited financials, and supplier validation.",
          "Ongoing controls: reporting cadence, KPI tracking, and escalation matrix.",
        ]),
      },
    ];

  return (
    <Layout>
      <section className="document-section min-h-screen bg-slate-950">
        <div className="container mx-auto max-w-6xl space-y-10">
          <div className="text-white space-y-4">
            <Link href="/" className="inline-flex items-center text-xs uppercase tracking-widest font-bold  hover:text-zim-gold">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              {t("regulations.cta.back") || "Back"}
            </Link>
            <h1 className="page-title">
              {t("regulations.title") || "Regulations & Compliance Guide"}
            </h1>
            <p className="text-sm text-slate-300  max-w-3xl leading-relaxed">
              {t("regulations.subtitle") ||
                "Practical regulatory guidance for diaspora investors, exporters, and returnees. Use this as an execution checklist and align final decisions with qualified legal, tax, and sector advisors."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {regulationSections.map((section) => (
              <div id={section.id} key={section.id} className="surface-card p-7 scroll-mt-24">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-zim-gold/10 border border-zim-gold/20">
                    <section.icon className="h-5 w-5 text-zim-gold" />
                  </div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="text-sm text-slate-300  leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
