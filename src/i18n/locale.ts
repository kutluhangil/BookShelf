export type Locale = 'tr' | 'en';

export const LOCALES: readonly Locale[] = ['tr', 'en'];

export const LOCALE_STORAGE_KEY = 'bookshelf.locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: 'TR',
  en: 'EN',
};

export function isLocale(value: unknown): value is Locale {
  return value === 'tr' || value === 'en';
}

/**
 * Resolves the startup locale: an explicit stored choice wins, otherwise the
 * browser language decides. Storage access throws in private modes, so a
 * failure here falls through to detection rather than breaking the render.
 */
export function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      return stored;
    }
  } catch {
    // Storage unavailable; fall through to language detection.
  }

  const languages = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  for (const language of languages) {
    if (typeof language === 'string' && language.toLowerCase().startsWith('tr')) {
      return 'tr';
    }
  }
  return 'en';
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // A viewer who blocks storage still gets the switch for this session.
  }
}
