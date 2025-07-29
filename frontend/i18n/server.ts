import i18next from 'i18next';
import en from '../locales/en.json';
import de from '../locales/de.json';

const resources = { en: { translation: en }, de: { translation: de } };

if (!i18next.isInitialized) {
  await i18next.init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    interpolation: { escapeValue: false },
  });
}

export default i18next;              // hat .changeLanguage, .t, … (ohne React!)
