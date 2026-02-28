import { HeartHandshake, Globe2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function WhyItMatters() {
  const { t } = useTranslation();
  const points = [
    {
      icon: HeartHandshake,
      emoji: "💛",
      title: t("care.why.cards.0.title", { defaultValue: "Dignity for Families" }),
      description: t("care.why.cards.0.description", {
        defaultValue: "Funeral cover reduces sudden financial pressure and supports dignified send-offs.",
      }),
    },
    {
      icon: Globe2,
      emoji: "🌍",
      title: t("care.why.cards.1.title", { defaultValue: "Built for Diaspora Families" }),
      description: t("care.why.cards.1.description", {
        defaultValue: "Manage policy support remotely while staying connected to home responsibilities.",
      }),
    },
    {
      icon: Users,
      emoji: "🤝",
      title: t("care.why.cards.2.title", { defaultValue: "Trusted Local Execution" }),
      description: t("care.why.cards.2.description", {
        defaultValue: "Nyaradzo provides established local service delivery and family-facing care.",
      }),
    },
  ];

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-center">
        <h2 className="!text-xl font-black tracking-tight text-white">
          {t("care.why.title", { defaultValue: "Why It Matters 💡" })}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-white/65">
          {t("care.why.subtitle", {
            defaultValue:
              "Family care is a core diaspora priority. This integration makes cover access easier and more transparent.",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {points.map(({ icon: Icon, emoji, title, description }) => (
          <article
            key={title}
            className="group rounded-3xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-500 hover:bg-slate-950/60"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-zim-gold">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-2xl leading-none">{emoji}</span>
            </div>
            <h3 className="text-base font-black text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
            <div className="mt-4 h-1 w-12 rounded-full bg-zim-gold/50 transition-all duration-500 group-hover:w-20" />
          </article>
        ))}
      </div>
    </section>
  );
}
