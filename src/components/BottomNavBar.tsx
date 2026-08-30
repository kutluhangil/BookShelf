import React from 'react';
import { haptic } from '../services/haptics';

interface BottomNavBarProps {
  activeTab: 'library' | 'shelves' | 'eval';
  onTabChange: (tab: 'library' | 'shelves' | 'eval') => void;
  onOpenScanner: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenScanner,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 h-20 bg-[#100E0C] border-t border-[#3A332A] flex justify-around items-center px-4 pb-safe md:hidden">
      {/* Library Tab */}
      <button
        onClick={() => {
          haptic.lightImpact();
          onTabChange('library');
        }}
        className={`flex flex-col items-center justify-center transition-all p-1.5 rounded-xl flex-1 ${
          activeTab === 'library'
            ? 'text-[#C9963F] bg-[#304E2E]/20'
            : 'text-[#A79C8C] opacity-70 hover:opacity-100'
        }`}
      >
        <span
          className={`material-symbols-outlined mb-0.5 text-[22px] ${
            activeTab === 'library' ? 'fill-1' : ''
          }`}
        >
          library_books
        </span>
        <span className="font-mono-ibm text-[10px] font-medium tracking-wider">
          Library
        </span>
      </button>

      {/* Centered Scan FAB */}
      <div className="relative -top-5 flex items-center justify-center px-2">
        <button
          onClick={() => {
            haptic.mediumImpact();
            onOpenScanner();
          }}
          className="w-16 h-16 rounded-full bg-[#C9963F] text-[#12100E] shadow-[0_4px_24px_rgba(201,150,63,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-[#12100E]"
          title="Scan Bookshelf"
        >
          <span className="material-symbols-outlined text-[30px] font-bold">
            photo_camera
          </span>
        </button>
      </div>

      {/* Shelves Tab */}
      <button
        onClick={() => {
          haptic.lightImpact();
          onTabChange('shelves');
        }}
        className={`flex flex-col items-center justify-center transition-all p-1.5 rounded-xl flex-1 ${
          activeTab === 'shelves'
            ? 'text-[#C9963F] bg-[#304E2E]/20'
            : 'text-[#A79C8C] opacity-70 hover:opacity-100'
        }`}
      >
        <span
          className={`material-symbols-outlined mb-0.5 text-[22px] ${
            activeTab === 'shelves' ? 'fill-1' : ''
          }`}
        >
          shelves
        </span>
        <span className="font-mono-ibm text-[10px] font-medium tracking-wider">
          Shelves
        </span>
      </button>

      {/* Accuracy Eval Tab */}
      <button
        onClick={() => {
          haptic.lightImpact();
          onTabChange('eval');
        }}
        className={`flex flex-col items-center justify-center transition-all p-1.5 rounded-xl flex-1 ${
          activeTab === 'eval'
            ? 'text-[#C9963F] bg-[#304E2E]/20'
            : 'text-[#A79C8C] opacity-70 hover:opacity-100'
        }`}
      >
        <span
          className={`material-symbols-outlined mb-0.5 text-[22px] ${
            activeTab === 'eval' ? 'fill-1' : ''
          }`}
        >
          verified
        </span>
        <span className="font-mono-ibm text-[10px] font-medium tracking-wider">
          Phase 0
        </span>
      </button>
    </nav>
  );
};
