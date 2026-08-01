export const DEFAULT_LOCALE = 'en';

export const SUPPORTED_LOCALES = ['en', 'id', 'ru', 'th', 'vi', 'zh', 'ar'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
