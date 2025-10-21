/* KEIN "use client" */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import de from '../locales/de.json';

const resources = {
  en: { translation: en },
  de: { translation: de },
} as const;

if (!i18n.isInitialized) {
  // Browser-only Plugin erst nach window-Check
  if (typeof window !== 'undefined') i18n.use(LanguageDetector);

  i18n.use(initReactI18next).init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator', 'htmlTag'],
                 caches: ['localStorage'] },
  });
}

export default i18n;          // hat .changeLanguage usw.
