import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";
export default function ResearchHandoff({
  kind,
  subjectKey,
  initialProfile = null,
}: {
  kind: "ntir" | "project";
  subjectKey: string;
  initialProfile?: any;
}) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(initialProfile);
  useEffect(() => {
    if (kind === "ntir") {
      setProfile(initialProfile);
      return;
    }
    let active = true;
    api
      .get(`/investment/research/${kind}/${encodeURIComponent(subjectKey)}`)
      .then(({ data }) => {
        if (active) setProfile(data.profile);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [kind, subjectKey, initialProfile]);
  return (
    <section className="mt-4 space-y-3 border-t border-white/15 pt-4 text-sm">
      <p>
        {profile
          ? t(`pilot.research.${profile.status}`)
          : t("pilot.research_status")}
      </p>
      {profile?.reviewedAt && (
        <p>
          {t("pilot.last_reviewed")}: {profile.reviewedAt}
        </p>
      )}
      {profile?.sources?.map((href: string, i: number) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-zim-gold underline"
        >
          {t("pilot.primary_source")} {i + 1}
        </a>
      ))}
      {profile?.promoterContact && (
        <a
          href={profile.promoterContact}
          className="block text-zim-gold underline"
        >
          {t("pilot.promoter_contact")}
        </a>
      )}
      <p className="text-white/70">
        {profile?.nextStep || t("pilot.research_next")}
      </p>
    </section>
  );
}
