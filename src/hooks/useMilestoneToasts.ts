import { useEffect, useRef } from 'react';
import type { Book } from '../types';
import { calculateReadingStreak } from '../utils/streak';
import { haptic } from '../services/haptics';
import { useT } from '../i18n/I18nProvider';
import type { ToastApi } from './useToasts';

/** Books between celebrations, and days between streak celebrations. */
const BOOKS_PER_MILESTONE = 5;
const DAYS_PER_STREAK_MILESTONE = 7;
const IDLE_REMINDER_MS = 48 * 60 * 60 * 1000;

/** The most recent moment the reader recorded any reading activity. */
function lastActivityAt(books: Book[]): number {
  let latest = 0;
  const consider = (value: string | undefined) => {
    if (!value) return;
    const time = new Date(value).getTime();
    if (time > latest) latest = time;
  };

  for (const book of books) {
    book.readingSessions?.forEach((session) => consider(session.date));
    book.readHistory?.forEach(consider);
    consider(book.readAt);
  }
  return latest;
}

/**
 * Celebrates reading milestones and nudges after a quiet stretch.
 *
 * The "already announced" marks are refs, not state: they exist only to stop
 * the same milestone firing twice, and storing them in state made every book
 * change schedule a second render that changed nothing on screen.
 */
export function useMilestoneToasts(books: Book[], isReminderEnabled: boolean, pushToast: ToastApi['pushToast']): void {
  const t = useT();
  const reminderFiredRef = useRef(false);
  const lastCompletedRef = useRef(books.filter((book) => book.status === 'read').length);
  const lastStreakRef = useRef(calculateReadingStreak(books));

  useEffect(() => {
    if (!isReminderEnabled || reminderFiredRef.current) return;

    const latest = lastActivityAt(books);
    if (latest === 0 || Date.now() - latest <= IDLE_REMINDER_MS) return;

    reminderFiredRef.current = true;
    pushToast({ title: t.toasts.readingReminder, description: t.toasts.readingReminderDetail, icon: 'menu_book' });
    haptic.success();
  }, [isReminderEnabled, books, pushToast, t]);

  useEffect(() => {
    const completed = books.filter((book) => book.status === 'read').length;
    if (completed <= lastCompletedRef.current) return;

    const reached = completed % BOOKS_PER_MILESTONE === 0;
    lastCompletedRef.current = completed;
    if (!reached) return;

    pushToast({ title: t.toasts.milestone, description: t.toasts.milestoneDetail(completed), icon: 'emoji_events' });
    haptic.success();
  }, [books, pushToast, t]);

  useEffect(() => {
    const streak = calculateReadingStreak(books);
    if (streak <= lastStreakRef.current) return;

    const reached = streak % DAYS_PER_STREAK_MILESTONE === 0;
    lastStreakRef.current = streak;
    if (!reached) return;

    pushToast({ title: t.toasts.streak, description: t.toasts.streakDetail(streak), icon: 'local_fire_department' });
    haptic.success();
  }, [books, pushToast, t]);
}
