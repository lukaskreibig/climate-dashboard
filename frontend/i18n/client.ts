'use client';

import i18n from './server';                   // dieselbe Instanz!
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

type MemoizedI18n = typeof i18n & { __hasReactInit?: boolean };
const clientI18n = i18n as MemoizedI18n;

if (!clientI18n.__hasReactInit) {
  clientI18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({ detection: { order: ['localStorage', 'navigator', 'htmlTag'] } });

  // kleine Flagge, damit wir es nicht doppelt initialisieren
  clientI18n.__hasReactInit = true;
}

export default clientI18n;
