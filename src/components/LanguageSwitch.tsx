import React from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { LOCALES, LOCALE_LABELS } from '../i18n/locale';
import { haptic } from '../services/haptics';

/** Segmented TR/EN control. Persists the choice through the i18n provider. */
export const LanguageSwitch: React.FC = () => {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t.app.languageSwitchLabel}
      className="flex items-center rounded-full border border-[#3A332A] bg-[#12100E] p-0.5"
    >
      {LOCALES.map((option) => {
        const isActive = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => {
              haptic.lightImpact();
              setLocale(option);
            }}
            aria-pressed={isActive}
            title={t.app.languageNames[option]}
            className={`px-2.5 py-1 rounded-full font-mono-ibm text-[10px] font-bold tracking-widest transition-colors ${
              isActive ? 'bg-[#C9963F] text-[#12100E]' : 'text-[#A79C8C] hover:text-[#F4EFE6]'
            }`}
          >
            {LOCALE_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
};
