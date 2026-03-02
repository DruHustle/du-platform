import { useTranslation } from "react-i18next";

export default function HowItWorks() {
  const { t } = useTranslation();
  const steps = [
    {
      title: t("care.how.steps.0.title", { defaultValue: "1. Start Application" }),
      emoji: "📝",
      description: t("care.how.steps.0.description", {
        defaultValue: "Open the Nyaradzo onboarding flow from Diaspora Unlocked and provide your details.",
      }),
    },
    {
      title: t("care.how.steps.1.title", { defaultValue: "2. Select Cover" }),
      emoji: "🛡️",
      description: t("care.how.steps.1.description", {
        defaultValue: "Choose the plan band aligned to your family setup and preferred contribution level.",
      }),
    },
    {
      title: t("care.how.steps.2.title", { defaultValue: "3. Confirm & Activate" }),
      emoji: "✅",
      description: t("care.how.steps.2.description", {
        defaultValue: "Complete verification and payment setup to activate policy coverage.",
      }),
    },
  ];

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-center">
        <h2 className="!text-xl font-black tracking-tight text-white">
          {t("care.how.title", { defaultValue: "How It Works 🚀" })}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-white/70">
          {t("care.how.subtitle", {
            defaultValue: "A simple onboarding path from diaspora account access to active family cover.",
          })}
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.title}
            className="group rounded-3xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-500 hover:bg-slate-950/60"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full border border-zim-gold/25 bg-zim-gold/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-zim-gold">
                {t("care.how.step_label", { defaultValue: "Step" })}
              </span>
              <span className="text-2xl leading-none">{step.emoji}</span>
            </div>
            <h3 className="text-base font-black text-white">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{step.description}</p>
            <div className="mt-4 h-px w-full bg-gradient-to-r from-zim-gold/40 to-transparent" />
          </li>
        ))}
      </ol>
    </section>
  );
}
