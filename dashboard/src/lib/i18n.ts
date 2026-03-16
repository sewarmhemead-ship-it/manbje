import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';

export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type Locale = (typeof SUPPORTED_LANGUAGES)[number];

export const isRtl = (lng: string) => lng.startsWith('ar');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { ar: { translation: ar }, en: { translation: en } },
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'physiocore_lang',
    },
  });

export default i18n;
