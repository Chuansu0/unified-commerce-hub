import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import translations, { type Locale, type Translations } from "./locales";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

const STORAGE_KEY = "neovega-locale";

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in translations) return stored as Locale;
  } catch { /* ignore */ }
  return "zh-TW";
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  }, []);

  const t = translations[locale];

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for HMR edge cases — return default locale
    return {
      locale: "zh-TW" as Locale,
      setLocale: () => {},
      t: translations["zh-TW"],
    };
  }
  return ctx;
}
