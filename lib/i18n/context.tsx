"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  LanguageMeta,
  SupportedLocale,
  SUPPORTED_LANGUAGES,
  TranslationKey,
} from "./types";
import { TRANSLATIONS_REGISTRY, EN_TRANSLATIONS } from "./translations";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
  languages: LanguageMeta[];
  currentLanguage: LanguageMeta;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LS_LOCALE_KEY = "sam_locale";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_LOCALE_KEY) as SupportedLocale;
      if (saved && TRANSLATIONS_REGISTRY[saved]) {
        setLocaleState(saved);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LS_LOCALE_KEY, newLocale);
      const meta = SUPPORTED_LANGUAGES.find((l) => l.code === newLocale);
      if (typeof document !== "undefined") {
        document.documentElement.lang = newLocale;
        document.documentElement.dir = meta?.direction || "ltr";
      }
    } catch {
      // Ignore
    }
  };

  const currentLanguage = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === locale) || SUPPORTED_LANGUAGES[0];
  }, [locale]);

  const dir = currentLanguage.direction;

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS_REGISTRY[locale] || EN_TRANSLATIONS;
    let str = dict[key] || EN_TRANSLATIONS[key] || key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
      }
    }
    return str;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        dir,
        languages: SUPPORTED_LANGUAGES,
        currentLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Graceful fallback outside provider
    return {
      locale: "en" as SupportedLocale,
      setLocale: () => {},
      t: (k: TranslationKey) => EN_TRANSLATIONS[k] || k,
      dir: "ltr" as const,
      languages: SUPPORTED_LANGUAGES,
      currentLanguage: SUPPORTED_LANGUAGES[0],
    };
  }
  return ctx;
}
