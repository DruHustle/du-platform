import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          brand: "Diaspora Unlocked",
          tagline: "Zimbabwe Global Diaspora Platform",
          select_lang: "Select Language",
          nav: {
            home: "Home",
            export: "Export Hub",
            tourism: "Tourism",
            investment: "Investment",
            trade: "Trade",
            data: "Economic Data",
            success: "Success Stories"
          }
        }
      },
      sn: {
        translation: {
          brand: "Diaspora Unlocked",
          tagline: "Dandira reZimbabwean riri kunze kwenyika",
          select_lang: "Sarudza Mutauro",
          nav: {
            home: "Kumba",
            export: "Zvekutengesera",
            tourism: "Kushanya",
            investment: "Kudyara Mari",
            trade: "Zvekutengeserana",
            data: "Zveupfumi",
            success: "Nhau dzeKubudirira"
          }
        }
      },
      nd: {
        translation: {
          brand: "Diaspora Unlocked",
          tagline: "Inkundla yamaZimbabwean akwamanye amazwe",
          select_lang: "Khetha ulimi",
          nav: {
            home: "Ekhaya",
            export: "Zokuhweba",
            tourism: "Ezokuvakasha",
            investment: "Ukuchitha Imali",
            trade: "Ukuhweba",
            data: "Idatha yezomnotho",
            success: "Izindaba Zempumelelo"
          }
        }
      },
      de: {
        translation: {
          brand: "Diaspora Unlocked",
          tagline: "Simbabwe Global Diaspora Plattform",
          select_lang: "Sprache wählen",
          nav: {
            home: "Startseite",
            export: "Export-Zentrum",
            tourism: "Tourismus",
            investment: "Investitionen",
            trade: "Handel",
            data: "Wirtschaftsdaten",
            success: "Erfolgsgeschichten"
          }
        }
      }
    },
    fallbackLng: "en", // Default to English
    interpolation: { escapeValue: false }
  });

export default i18n;