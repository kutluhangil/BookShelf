import React, { useMemo, useState, useRef, useEffect } from 'react';
import { haptic } from '../services/haptics';
import { Book } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { LanguageSwitch } from './LanguageSwitch';

type TimeBucket = 'night' | 'morning' | 'afternoon' | 'evening';

interface NavigationHeaderProps {
  currentView: string;
  books?: Book[];
  onBack?: () => void;
  onOpenProfile?: () => void;
  onOpenRecommendations?: () => void;
  onOpenSpikeDashboard?: () => void;
  onOpenOnboarding?: () => void;
  discardMode?: boolean;
  isAuthenticated?: boolean;
  isCloudAvailable?: boolean;
  userName?: string;
  userPhotoUrl?: string;
  onLogin?: () => void;
  onLogout?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  hasUnsyncedChanges?: boolean;
  lastSyncedAt?: string | null;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  books = [],
  onBack,
  onOpenProfile,
  onOpenRecommendations,
  onOpenSpikeDashboard,
  onOpenOnboarding,
  discardMode = false,
  isAuthenticated = false,
  isCloudAvailable = true,
  userName,
  userPhotoUrl,
  onLogin,
  onLogout,
  onSync,
  isSyncing = false,
  hasUnsyncedChanges = false,
  lastSyncedAt = null,
}) => {
  const { t, locale } = useI18n();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  const readerStats = useMemo(() => {
    if (books.length === 0) return null;

    const readCount = books.filter(b => b.status === 'read').length;
    
    let totalDuration = 0;
    let sessionCount = 0;
    
    // Buckets are keyed, not labelled: the label is resolved at render time so
    // it follows the active locale.
    const timeBuckets: Record<TimeBucket, number> = {
      night: 0,
      morning: 0,
      afternoon: 0,
      evening: 0,
    };

    books.forEach(b => {
      if (b.readingSessions) {
        b.readingSessions.forEach(session => {
          totalDuration += session.durationSeconds;
          sessionCount++;
          
          const hour = new Date(session.date).getHours();
          if (hour >= 5 && hour < 12) timeBuckets.morning++;
          else if (hour >= 12 && hour < 17) timeBuckets.afternoon++;
          else if (hour >= 17 && hour < 21) timeBuckets.evening++;
          else timeBuckets.night++;
        });
      }
    });

    const avgDurationSeconds = sessionCount > 0 ? totalDuration / sessionCount : 0;
    const avgMinutes = Math.round(avgDurationSeconds / 60);

    let mostActiveBucket: TimeBucket | null = null;
    let maxCount = -1;
    (Object.keys(timeBuckets) as TimeBucket[]).forEach((bucket) => {
      const count = timeBuckets[bucket];
      if (count > maxCount && count > 0) {
        maxCount = count;
        mostActiveBucket = bucket;
      }
    });

    return {
      readCount,
      avgMinutes,
      mostActiveBucket,
    };
  }, [books]);

  const mostActiveTimeLabel = readerStats?.mostActiveBucket
    ? t.header.timeBuckets[readerStats.mostActiveBucket]
    : t.common.notAvailable;

  return (
    <header className="sticky top-0 z-40 bg-[#12100E]/95 backdrop-blur-md border-b border-[#3A332A] h-16 w-full transition-all">
      <div className="max-w-[1200px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {discardMode ? (
          <button
            onClick={() => {
              haptic.lightImpact();
              if (onBack) onBack();
            }}
            className="flex items-center gap-2 text-[#C9963F] hover:opacity-80 transition-opacity font-mono-ibm text-[11px] font-semibold tracking-widest uppercase"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
            <span>{t.header.discardScan}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptic.lightImpact();
                if (onOpenOnboarding) onOpenOnboarding();
              }}
              className="text-[#A79C8C] hover:text-[#C9963F] hover:bg-[#1C1916] p-2 rounded-full transition-colors flex items-center justify-center"
              title={t.header.guideTooltip}
             aria-label={t.header.guideTooltip}>
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">menu_book</span>
            </button>

            <button
              onClick={() => {
                haptic.lightImpact();
                if (onOpenSpikeDashboard) onOpenSpikeDashboard();
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1916] hairline-border text-[#A79C8C] hover:text-[#C9963F] text-[11px] font-mono-ibm"
              title={t.header.spikeTooltip}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6E8F6A] animate-pulse" />
              <span>{t.header.spikeButton}</span>
            </button>
          </div>
        )}

        {/* Center Serif Title & Reader Stats */}
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-6">
            {/* Title */}
            <div className="flex items-center gap-2">
              <h1 className="font-serif-literata text-[24px] sm:text-[28px] text-[#C9963F] font-bold tracking-tight">
                {t.app.title}
              </h1>
              <span className="hidden md:inline-block font-mono-ibm text-[9px] text-[#A79C8C] border border-[#3A332A] px-1.5 py-0.5 rounded tracking-widest">
                {t.app.versionBadge}
              </span>
            </div>

            {/* Reader Profile Stats */}
            {!discardMode && readerStats && (
              <div className="hidden lg:flex items-center gap-4 border-l border-[#3A332A] pl-6 py-1">
                <div className="flex flex-col">
                  <span className="font-mono-ibm text-[9px] text-[#A79C8C] uppercase tracking-wider">{t.header.booksRead}</span>
                  <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{readerStats.readCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono-ibm text-[9px] text-[#A79C8C] uppercase tracking-wider">{t.header.avgSession}</span>
                  <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{t.common.minutesShort(readerStats.avgMinutes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono-ibm text-[9px] text-[#A79C8C] uppercase tracking-wider">{t.header.activeTime}</span>
                  <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{mostActiveTimeLabel}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {!discardMode && (
            isAuthenticated ? (
              <button
                onClick={() => {
                  haptic.lightImpact();
                  if (onSync) onSync();
                }}
                disabled={isSyncing}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors font-mono-ibm text-[11px] disabled:opacity-60 ${
                  hasUnsyncedChanges
                    ? 'bg-[#3A2412] border-[#C9963F] text-[#F5BD62]'
                    : 'bg-[#1C1916] border-[#3A332A] text-[#C9963F] hover:bg-[#2C251D]'
                }`}
                title={
                  isSyncing
                    ? t.header.syncingTooltip
                    : hasUnsyncedChanges
                      ? t.header.unsyncedTooltip
                      : lastSyncedAt
                        ? t.header.lastSyncedTooltip(new Date(lastSyncedAt).toLocaleTimeString(locale))
                        : t.header.syncTooltip
                }
              >
                <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true">
                  {isSyncing ? 'sync' : hasUnsyncedChanges ? 'cloud_upload' : 'cloud_done'}
                </span>
                <span className="hidden sm:inline">
                  {isSyncing ? t.header.syncing : hasUnsyncedChanges ? t.header.unsynced : t.header.synced}
                </span>
                {hasUnsyncedChanges && !isSyncing && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#C9963F] shadow-[0_0_6px_#C9963F]" />
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  haptic.lightImpact();
                  if (onLogin) onLogin();
                }}
                disabled={!isCloudAvailable}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1916] border border-[#3A332A] text-[#A79C8C] hover:text-[#C9963F] transition-colors font-mono-ibm text-[11px] disabled:opacity-50 disabled:hover:text-[#A79C8C]"
                title={isCloudAvailable ? t.header.loginTooltip : t.header.cloudUnavailableTooltip}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">cloud_off</span>
                <span className="hidden sm:inline">{isCloudAvailable ? t.header.login : t.header.localOnly}</span>
              </button>
            )
          )}

          <button
            onClick={() => {
              haptic.lightImpact();
              if (onOpenSpikeDashboard) onOpenSpikeDashboard();
            }}
            className="sm:hidden text-[#A79C8C] hover:text-[#C9963F] p-2 rounded-full transition-colors"
            title={t.header.spikeTooltipShort}
           aria-label={t.header.spikeTooltipShort}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">analytics</span>
          </button>

          {onOpenRecommendations && (
            <button
              onClick={() => {
                haptic.lightImpact();
                onOpenRecommendations();
              }}
              className="text-[#C9963F] hover:text-[#F4EFE6] hover:bg-[#1C1916] p-2 rounded-full transition-colors flex items-center justify-center"
              title={t.header.recommendationsTooltip}
             aria-label={t.header.recommendationsTooltip}>
              <span className="material-symbols-outlined text-[24px]" aria-hidden="true">auto_awesome</span>
            </button>
          )}

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => {
                haptic.lightImpact();
                setIsProfileMenuOpen((open) => !open);
              }}
              className="text-[#A79C8C] hover:text-[#C9963F] hover:bg-[#1C1916] p-1.5 rounded-full transition-colors flex items-center justify-center"
              title={t.header.profileTooltip}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
            >
              {userPhotoUrl ? (
                <img src={userPhotoUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-[#3A332A]" />
              ) : (
                <span className="material-symbols-outlined text-[24px]" aria-hidden="true">account_circle</span>
              )}
            </button>

            {isProfileMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-60 bg-[#1C1916] border border-[#3A332A] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#3A332A]">
                  <p className="font-sans-inter text-[13px] text-[#F4EFE6] truncate">
                    {userName ?? t.header.localReader}
                  </p>
                  <p className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider mt-0.5">
                    {isAuthenticated ? t.header.signedIn : isCloudAvailable ? t.header.notSignedIn : t.header.cloudSyncDisabled}
                  </p>
                </div>

                {readerStats && (
                  <div className="px-4 py-3 space-y-2 border-b border-[#3A332A]">
                    <div className="flex justify-between items-center">
                      <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">{t.header.booksRead}</span>
                      <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{readerStats.readCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">{t.header.avgSession}</span>
                      <span className="font-sans-inter text-[13px] text-[#F4EFE6] font-semibold">{t.common.minutesShort(readerStats.avgMinutes)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">{t.header.activeTime}</span>
                      <span className="font-sans-inter text-[12px] text-[#F4EFE6] font-semibold text-right leading-tight">
                        {mostActiveTimeLabel}
                      </span>
                    </div>
                  </div>
                )}

                <div className="px-4 py-3 border-b border-[#3A332A] flex items-center justify-between gap-3">
                  <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider">
                    {t.app.languageSwitchLabel}
                  </span>
                  <LanguageSwitch />
                </div>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#D4CDA8] hover:bg-[#262119] flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#C9963F]" aria-hidden="true">share</span>
                  {t.header.shareAndExport}
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onOpenOnboarding) onOpenOnboarding();
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#D4CDA8] hover:bg-[#262119] flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#C9963F]" aria-hidden="true">menu_book</span>
                  {t.header.guideAndOnboarding}
                </button>

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-[#FF6B6B] hover:bg-[#2A1A1A] flex items-center gap-2 transition-colors border-t border-[#3A332A]"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
                    {t.header.signOut}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (onLogin) onLogin();
                    }}
                    disabled={!isCloudAvailable}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-[#C9963F] hover:bg-[#262119] flex items-center gap-2 transition-colors border-t border-[#3A332A] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">login</span>
                    {isCloudAvailable ? t.header.signInWithGoogle : t.header.cloudSyncNotConfigured}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
