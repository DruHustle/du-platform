import { Lightbulb, HeartHandshake, Globe2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function WhyItMatters() {
  const { t } = useTranslation();
  const points = [
    {
      icon: HeartHandshake,
      title: t("care.why.cards.0.title", { defaultValue: "Dignity for Families" }),
      description: t("care.why.cards.0.description", {
        defaultValue: "Funeral cover reduces sudden financial pressure and supports dignified send-offs.",
      }),
    },
    {
      icon: Globe2,
      title: t("care.why.cards.1.title", { defaultValue: "Built for Diaspora Families" }),
      description: t("care.why.cards.1.description", {
        defaultValue: "Manage policy support remotely while staying connected to home responsibilities.",
      }),
    },
    {
      icon: Users,
      title: t("care.why.cards.2.title", { defaultValue: "Trusted Local Execution" }),
      description: t("care.why.cards.2.description", {
        defaultValue: "Nyaradzo provides established local service delivery and family-facing care.",
      }),
    },
  ];

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center gap-3">
          <Lightbulb className="h-5 w-5 text-zim-gold" />
          <h2 className="!text-xl font-black tracking-tight text-white">
            {t("care.why.title", { defaultValue: "Why It Matters" })}
          </h2>
        </div>
        <p className="mx-auto max-w-2xl text-sm text-white/70">
          {t("care.why.subtitle", {
            defaultValue:
              "Family care is a core diaspora priority. This integration makes cover access easier and more transparent.",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {points.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="group rounded-3xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-500 hover:bg-slate-950/60"
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-zim-gold" />
              <h3 className="text-sm font-black tracking-tight text-white">{title}</h3>
            </div>
            <p className="text-xs leading-relaxed text-white/70">{description}</p>
            <div className="mt-4 h-1 w-12 rounded-full bg-zim-gold/50 transition-all duration-500 group-hover:w-20" />
          </article>
        ))}
      </div>
    </section>
  );
}
