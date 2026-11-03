import { useTranslation } from "react-i18next";
import { useId } from "react";
import { isThemePreference, useTheme } from "@/contexts/ThemeContext";

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const id = useId();
  return (
    <div className="theme-switcher flex flex-wrap items-center gap-3 text-xs text-slate-300">
      <label htmlFor={id}>{t("appearance.label")}</label>
      <select
        id={id}
        value={preference}
        onChange={event => {
          if (isThemePreference(event.target.value))
            setPreference(event.target.value);
        }}
        className="min-h-11 max-w-full rounded-lg border border-slate-500 bg-slate-900 px-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
      >
        <option value="system">{t("appearance.system")}</option>
        <option value="light">{t("appearance.light")}</option>
        <option value="dark">{t("appearance.dark")}</option>
      </select>
    </div>
  );
}
