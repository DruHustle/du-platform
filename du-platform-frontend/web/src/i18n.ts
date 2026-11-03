import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslation from "../public/locales/en/translation.json";

const DEFAULT_LANGUAGE = "en";
const SUPPORTED_LANGUAGES = ["en", "de", "sn", "nd"] as const;
const LANGUAGE_STORAGE_KEY = "i18nextLng";

type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
const deferredLanguageLoaders: Record<AppLanguage, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => Promise.resolve({ default: enTranslation }),
  de: () => import("../public/locales/de/translation.json"),
  sn: () => import("../public/locales/sn/translation.json"),
  nd: () => import("../public/locales/nd/translation.json"),
};

let hasInitialized = false;
let languageSwitchRequestId = 0;
let preferredLanguageLoadPromise: Promise<typeof i18n> | null = null;
const loadedLanguages = new Set<AppLanguage>([DEFAULT_LANGUAGE]);
const pendingLanguageLoads = new Map<AppLanguage, Promise<void>>();

function normalizeSupportedLanguage(value: unknown): AppLanguage {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return DEFAULT_LANGUAGE;

  const base = raw.split("-")[0];
  if (SUPPORTED_LANGUAGES.includes(base as AppLanguage)) {
    return base as AppLanguage;
  }

  return DEFAULT_LANGUAGE;
}

function applyDocumentLanguage(language: AppLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
}

function cacheUserLanguage(language: AppLanguage) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures.
  }
}

function detectPreferredLanguage(): AppLanguage {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  try {
    const params = new URLSearchParams(window.location.search);
    const queryLanguage = params.get("lng");
    if (queryLanguage) return normalizeSupportedLanguage(queryLanguage);
  } catch {
    // Ignore malformed query strings.
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage) return normalizeSupportedLanguage(storedLanguage);
  } catch {
    // Ignore storage failures.
  }

  const navigatorLanguages = Array.isArray(window.navigator.languages)
    ? window.navigator.languages
    : [window.navigator.language];
  for (const language of navigatorLanguages) {
    const normalized = normalizeSupportedLanguage(language);
    if (normalized !== DEFAULT_LANGUAGE || String(language ?? "").toLowerCase().startsWith(DEFAULT_LANGUAGE)) {
      return normalized;
    }
  }

  const htmlLanguage = document.documentElement.lang;
  if (htmlLanguage) return normalizeSupportedLanguage(htmlLanguage);

  return DEFAULT_LANGUAGE;
}

async function ensureLanguageResources(language: AppLanguage) {
  if (loadedLanguages.has(language)) {
    return;
  }

  const existingPromise = pendingLanguageLoads.get(language);
  if (existingPromise) {
    await existingPromise;
    return;
  }

  const loadPromise = deferredLanguageLoaders[language]()
    .then((module) => {
      i18n.addResourceBundle(language, "translation", module.default, true, true);
      loadedLanguages.add(language);
    })
    .finally(() => {
      pendingLanguageLoads.delete(language);
    });

  pendingLanguageLoads.set(language, loadPromise);
  await loadPromise;
}

export async function setAppLanguage(language: string) {
  const nextLanguage = normalizeSupportedLanguage(language);
  const requestId = ++languageSwitchRequestId;

  await ensureLanguageResources(nextLanguage);
  if (requestId !== languageSwitchRequestId) {
    return i18n;
  }

  await i18n.changeLanguage(nextLanguage);
  cacheUserLanguage(nextLanguage);
  applyDocumentLanguage(nextLanguage);

  return i18n;
}

export function loadPreferredAppLanguage() {
  if (preferredLanguageLoadPromise) {
    return preferredLanguageLoadPromise;
  }

  const preferredLanguage = detectPreferredLanguage();
  if (preferredLanguage === DEFAULT_LANGUAGE) {
    preferredLanguageLoadPromise = Promise.resolve(i18n);
    return preferredLanguageLoadPromise;
  }

  preferredLanguageLoadPromise = setAppLanguage(preferredLanguage)
    .catch(async () => {
      await setAppLanguage(DEFAULT_LANGUAGE);
      return i18n;
    })
    .then(() => i18n);

  return preferredLanguageLoadPromise;
}

export function initializeI18n() {
  if (hasInitialized || i18n.isInitialized) {
    return i18n;
  }

  hasInitialized = true;

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: enTranslation },
    },
    lng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    fallbackLng: DEFAULT_LANGUAGE,
    load: "currentOnly",
    debug: false,
    initImmediate: false,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

  applyDocumentLanguage(DEFAULT_LANGUAGE);

  return i18n;
}

export default i18n;
