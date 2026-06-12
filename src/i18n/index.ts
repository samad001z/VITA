import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import hi from "./locales/hi";
import te from "./locales/te";

/**
 * Phase 10 — multi-language. Adding a language = one locale file + one
 * entry here; everything else (pickers, Intl formatting, the AI layer's
 * language hint) follows automatically.
 */
export const LANGUAGES = [
  { code: "en", native: "English", locale: "en-IN" },
  { code: "te", native: "తెలుగు", locale: "te-IN" },
  { code: "hi", native: "हिन्दी", locale: "hi-IN" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

const STORAGE_KEY = "vita.language";

function isLanguageCode(value: string | null): value is LanguageCode {
  return LANGUAGES.some((l) => l.code === value);
}

function deviceLanguage(): LanguageCode {
  for (const locale of getLocales()) {
    if (isLanguageCode(locale.languageCode)) return locale.languageCode;
  }
  return "en";
}

/** Resolve stored preference (falling back to the device) and start i18next. */
export async function initI18n(): Promise<void> {
  if (i18n.isInitialized) return;
  const stored = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  const lng = isLanguageCode(stored) ? stored : deviceLanguage();
  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      te: { translation: te },
      hi: { translation: hi },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

/** Switch language app-wide and persist the choice. */
export async function setAppLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(STORAGE_KEY, code).catch(() => undefined);
}

export function currentLanguage(): LanguageCode {
  const lng = i18n.language;
  return isLanguageCode(lng) ? lng : "en";
}

/** BCP-47 locale for Intl date/number formatting. */
export function currentLocale(): string {
  return LANGUAGES.find((l) => l.code === currentLanguage())?.locale ?? "en-IN";
}

export default i18n;
