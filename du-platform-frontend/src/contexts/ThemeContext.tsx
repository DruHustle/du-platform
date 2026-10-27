import { safeLocalStorage } from "@/lib/browserStorage";
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
function readPreference(fallback: ThemePreference): ThemePreference {
  const stored = safeLocalStorage.getItem("theme");
  return isThemePreference(stored) ? stored : fallback;
}
function systemTheme(): Theme {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (theme: ThemePreference) => void;
}
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
}) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readPreference(defaultTheme)
  );
  const [system, setSystem] = useState<Theme>(systemTheme);
  const theme = preference === "system" ? system : preference;

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const update = () => setSystem(media?.matches ? "dark" : "light");
    update();
    media?.addEventListener("change", update);
    const sync = (event: StorageEvent) => {
      if (event.key === "theme" || event.key === null) {
        try {
          if (event.storageArea && event.storageArea !== window.localStorage)
            return;
        } catch {
          return;
        }
        setPreference(
          isThemePreference(event.newValue) ? event.newValue : defaultTheme
        );
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      media?.removeEventListener("change", update);
      window.removeEventListener("storage", sync);
    };
  }, [defaultTheme]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.themePreference = preference;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0f172a" : "#f8fafb");
    safeLocalStorage.setItem("theme", preference);
  }, [preference, theme]);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
