import i18n from "i18next";
import Backend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

let initializationPromise: Promise<typeof i18n> | null = null;

export function initializeI18n() {
  if (i18n.isInitialized) {
    return Promise.resolve(i18n);
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      supportedLngs: ["en", "de", "sn", "nd"],
      nonExplicitSupportedLngs: true,
      fallbackLng: "en",
      load: "currentOnly",
      debug: false,
      returnEmptyString: false,
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ["querystring", "localStorage", "navigator", "htmlTag"],
        caches: ["localStorage"],
      },
      backend: {
        loadPath: "/locales/{{lng}}/translation.json",
      },
      react: {
        useSuspense: false,
      },
    })
    .then(() => i18n);

  return initializationPromise;
}

export default i18n;
