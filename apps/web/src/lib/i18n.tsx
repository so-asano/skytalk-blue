"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

type Messages = typeof ja;
type Locale = "ja" | "en";

const messages: Record<Locale, Messages> = { ja, en };

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const keys = key.split(".");
      let value: unknown = messages[locale];
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      if (typeof value !== "string") return key;
      if (params) {
        return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      }
      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
