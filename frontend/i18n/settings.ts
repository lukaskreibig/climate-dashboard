export const languages = ['en', 'de'] as const;
export type Language = typeof languages[number];

export const fallbackLng = 'en';
export const defaultNS   = 'translation';
