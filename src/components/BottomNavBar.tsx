import React from 'react';
import { haptic } from '../services/haptics';
import { useT } from '../i18n/I18nProvider';

type Tab = 'library' | 'shelves' | 'eval' | 'shared';

interface BottomNavBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenScanner: () => void;
}

interface TabButtonProps {
  tab: Tab;
  icon: string;
  label: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/**
 * The four tabs were four copies of the same markup. `aria-current="page"` is
 * what tells a screen reader which one is active; the gold colour alone says
 * nothing to anyone who cannot see it.
 */
const TabButton: React.FC<TabButtonProps> = ({ tab, icon, label, activeTab, onTabChange }) => {
  const isActive = activeTab === tab;

  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      onClick={() => {
        haptic.lightImpact();
        onTabChange(tab);
      }}
      className={`flex flex-col items-center justify-center transition-all p-1.5 rounded-xl flex-1 ${
        isActive ? 'text-[#C9963F] bg-[#304E2E]/20' : 'text-[#A79C8C] opacity-70 hover:opacity-100'
      }`}
    >
      <span className={`material-symbols-outlined mb-0.5 text-[22px] ${isActive ? 'fill-1' : ''}`} aria-hidden="true">
        {icon}
      </span>
      <span className="font-mono-ibm text-[10px] font-medium tracking-wider">{label}</span>
    </button>
  );
};

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabChange, onOpenScanner }) => {
  const t = useT();

  return (
    <nav
      aria-label={t.nav.primary}
      className="fixed bottom-0 left-0 w-full z-50 h-20 bg-[#100E0C] border-t border-[#3A332A] flex justify-around items-center px-4 pb-safe md:hidden"
    >
      <TabButton tab="library" icon="library_books" label={t.nav.library} activeTab={activeTab} onTabChange={onTabChange} />

      {/* Centered Scan FAB */}
      <div className="relative -top-5 flex items-center justify-center px-2">
        <button
          type="button"
          aria-label={t.nav.scanShelf}
          onClick={() => {
            haptic.mediumImpact();
            onOpenScanner();
          }}
          className="w-16 h-16 rounded-full bg-[#C9963F] text-[#12100E] shadow-[0_4px_24px_rgba(201,150,63,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-[#12100E]"
          title={t.nav.scanShelf}
        >
          <span className="material-symbols-outlined text-[30px] font-bold" aria-hidden="true">
            photo_camera
          </span>
        </button>
      </div>

      <TabButton tab="shelves" icon="shelves" label={t.nav.shelves} activeTab={activeTab} onTabChange={onTabChange} />
      <TabButton tab="shared" icon="group" label={t.nav.shared} activeTab={activeTab} onTabChange={onTabChange} />
      <TabButton tab="eval" icon="verified" label={t.nav.eval} activeTab={activeTab} onTabChange={onTabChange} />
    </nav>
  );
};
