import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from '../public/locales/en/translation.json';
import deTranslations from '../public/locales/de/translation.json';
import snTranslations from '../public/locales/sn/translation.json';
import ndTranslations from '../public/locales/nd/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      de: { translation: deTranslations },
      sn: { translation: snTranslations },
      nd: { translation: ndTranslations },
    },
    fallbackLng: 'en',
    debug: false,
    initImmediate: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      // Prevent full-app blanking while translations are loading on slow mobile networks.
      useSuspense: false,
    },
  });

export default i18n;
