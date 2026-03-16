import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

const LANG_KEY = 'physiocore_patient_lang';

export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type Locale = (typeof SUPPORTED_LANGUAGES)[number];

export const isRtl = (lng: string) => lng.startsWith('ar');

const getStoredLang = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  return 'ar';
};

export const setLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
  await AsyncStorage.setItem(LANG_KEY, lng);
  const rtl = isRtl(lng);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
    // App needs to be restarted for RTL to apply; we still change language
  }
};

export const initI18n = async () => {
  const lng = await getStoredLang();
  const rtl = isRtl(lng);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
  }
  await i18n.use(initReactI18next).init({
    resources: { ar: { translation: ar }, en: { translation: en } },
    lng,
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
  });
  return i18n;
};

export default i18n;
