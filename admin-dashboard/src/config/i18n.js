import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationEN from './locales/en.json';
import translationHI from './locales/hi.json';
import translationGU from './locales/gu.json';
import translationMR from './locales/mr.json';
import translationTA from './locales/ta.json';

const resources = {
  en: { translation: translationEN },
  hi: { translation: translationHI },
  gu: { translation: translationGU },
  mr: { translation: translationMR },
  ta: { translation: translationTA }
};

const savedLanguage = localStorage.getItem('language') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values to prevent XSS
    }
  });

export default i18n;
