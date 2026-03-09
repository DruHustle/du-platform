import { useTranslation } from "react-i18next";
import InstantImage from "@/components/InstantImage";

export default function CoverageCards() {
  const { t } = useTranslation();
  const coverage = [
    {
      title: t("care.coverage.cards.0.title", { defaultValue: "Essential Family Cover" }),
      summary: t("care.coverage.cards.0.summary", {
        defaultValue: "Affordable entry-level cover for immediate household support.",
      }),
      image: "/images/pages/care/family-gathering-zimbabwe.jpg",
    },
    {
      title: t("care.coverage.cards.1.title", { defaultValue: "Extended Family Plan" }),
      summary: t("care.coverage.cards.1.summary", {
        defaultValue: "Wider beneficiary support for parents and dependants back home.",
      }),
      image: "/images/pages/care/handshake-men.jpg",
    },
    {
      title: t("care.coverage.cards.2.title", { defaultValue: "Premium Assurance" }),
      summary: t("care.coverage.cards.2.summary", {
        defaultValue: "Enhanced benefits and service options for larger family structures.",
      }),
      image: "/images/pages/care/team-meeting.jpg",
    },
  ];

  return (
    <section className="space-y-5">
      <div className="space-y-2 text-center">
        <h2 className="!text-xl font-black tracking-tight text-white">
          {t("care.coverage.title", { defaultValue: "Coverage Options" })}
        </h2>
        <p className="mx-auto max-w-2xl text-sm text-white/70">
          {t("care.coverage.subtitle", {
            defaultValue: "Choose a plan category that matches your family care commitments and budget profile.",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {coverage.map((item) => (
          <article
            key={item.title}
            className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] transition-all duration-500 hover:bg-slate-950/60"
          >
            <div className="relative h-40 overflow-hidden">
              <InstantImage
                src={item.image}
                alt={item.title}
                priority={item === coverage[0]}
                wrapperClassName="h-full w-full bg-slate-900"
                className="h-full w-full object-cover object-center saturate-[0.9] contrast-110 brightness-[0.92] transition-all duration-700 group-hover:scale-105 group-hover:saturate-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-transparent" />
            </div>
            <div className="p-5">
              <h3 className="text-base font-black text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{item.summary}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
