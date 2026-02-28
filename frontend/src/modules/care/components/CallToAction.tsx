import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type CallToActionProps = {
  onboardingUrl: string;
  onCtaClick: () => void;
};

export default function CallToAction({ onboardingUrl, onCtaClick }: CallToActionProps) {
  const { t } = useTranslation();

  return (
    <section className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
        <div className="space-y-3 md:col-span-8">
          <div className="inline-flex items-center rounded-full border border-zim-gold/25 bg-zim-gold/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zim-gold">
            {t("care.cta.badge", { defaultValue: "Next Step 💛" })}
          </div>
          <h2 className="!text-xl font-black tracking-tight text-white">
            {t("care.cta.title", { defaultValue: "Ready to Protect Your Family?" })}
          </h2>
          <p className="text-sm text-white/65">
            {t("care.cta.subtitle", {
              defaultValue: "Continue to Nyaradzo onboarding with tracked diaspora referral metadata.",
            })}
          </p>
        </div>

        <div className="md:col-span-4 md:justify-self-end">
          <Button
            asChild
            className="bg-zim-gold text-zim-black hover:bg-white transition-all px-5 py-2.5 h-auto rounded-full font-black text-[10px] uppercase tracking-[0.2em] gap-0.5 whitespace-nowrap min-h-10"
          >
            <a href={onboardingUrl} target="_blank" rel="noopener noreferrer" onClick={onCtaClick}>
              {t("care.cta.button", { defaultValue: "Continue To Nyaradzo" })}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
