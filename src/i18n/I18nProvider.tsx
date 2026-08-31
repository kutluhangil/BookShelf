import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { detectInitialLocale, persistLocale, type Locale } from './locale';
import { en } from './messages/en';
import { tr } from './messages/tr';
import type { Messages } from './messages/types';

const CATALOG: Record<Locale, Messages> = { en, tr };

interface I18nValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  // index.html ships a static lang attribute; keep it in step with the locale
  // that was actually detected, not just with later switches.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo<I18nValue>(() => ({ locale, t: CATALOG[locale], setLocale }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Full i18n handle. Throws when used outside the provider so a missing wrapper
 * fails loudly at the first render instead of silently rendering English.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used inside <I18nProvider>. Wrap the tree in main.tsx.');
  }
  return value;
}

/** Shorthand for components that only read copy. */
export function useT(): Messages {
  return useI18n().t;
}
