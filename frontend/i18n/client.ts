'use client';

import i18n from './server';                   // dieselbe Instanz!
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

if (!i18n.hasInitializedReactI18next) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({ detection: { order: ['localStorage', 'navigator', 'htmlTag'] } });

  // kleine Flagge, damit wir es nicht doppelt initialisieren
  (i18n as any).hasInitializedReactI18next = true;
}

export default i18n;
