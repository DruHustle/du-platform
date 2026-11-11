import { useTranslation } from "react-i18next";
import { publicDownloadUrl } from "@/domain/appDownloads";

const platforms = [
  { id: 'ios', name: 'iOS', icon: 'apple', configured: import.meta.env.VITE_IOS_DOWNLOAD_URL },
  { id: 'android', name: 'Android', icon: 'android', configured: import.meta.env.VITE_ANDROID_DOWNLOAD_URL },
] as const;

export default function AppDownloads() {
  const { t } = useTranslation();
  return (
    <section className="mb-8" aria-labelledby="mobile-apps-title">
      <h2 id="mobile-apps-title" className="mb-2 text-sm font-semibold text-white">{t("footer.mobile_apps.title")}</h2>
      <ul className="flex flex-wrap gap-3">
        {platforms.map(({ id, name, icon, configured }) => {
          const href = publicDownloadUrl(id, configured);
          const label = <>
            <img className="h-5 w-5 brightness-0 invert" src={`/platforms/${icon}.svg`} width="20" height="20" alt="" />
            <span><strong>{name}</strong><small className="block text-xs text-slate-300">{href ? t("footer.mobile_apps.available") : t("footer.mobile_apps.unavailable")}</small></span>
          </>;
          return <li key={id}>{href
            ? <a className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm text-white" href={href}>{label}</a>
            : <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm text-white">{label}</span>}</li>;
        })}
      </ul>
    </section>
  );
}
