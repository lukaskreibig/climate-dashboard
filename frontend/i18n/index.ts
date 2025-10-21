import 'server-only';
import i18next, { i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { defaultNS, fallbackLng, languages } from './settings';

export async function initI18n(lng: string): Promise<I18nInstance> {
  const instance = i18next.createInstance();
  await instance
    .use(Backend)
    .use(initReactI18next)
    .init({
      lng,
      fallbackLng,
      supportedLngs: languages,
      ns: [defaultNS],
      defaultNS,
      backend: { loadPath: path.join(process.cwd(), 'locales/{{lng}}.json') },
      interpolation: { escapeValue: false },
    });
  return instance;
}
