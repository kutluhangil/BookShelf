import { describe, expect, it } from 'vitest';

// Pinned west of Greenwich: that is where UTC midnight and the reader's own day
// disagree, which is exactly the failure these helpers exist to prevent.
process.env.TZ = 'America/New_York';
import { calendarDateToIso, isoToCalendarDate } from '../utils/calendarDate';

describe('calendar dates', () => {
  it('stores the day the reader picked, in their own timezone', () => {
    const iso = calendarDateToIso('2025-12-25');
    expect(iso).toBeDefined();
    const stored = new Date(iso!);
    expect(stored.getFullYear()).toBe(2025);
    expect(stored.getMonth()).toBe(11);
    expect(stored.getDate()).toBe(25);
  });

  it('round-trips a picked date back into the input', () => {
    expect(isoToCalendarDate(calendarDateToIso('2025-01-05'))).toBe('2025-01-05');
  });

  it('does not hand back the day before, the way UTC midnight parsing did', () => {
    expect(new Date('2025-12-25').getDate()).toBe(24);
    expect(new Date(calendarDateToIso('2025-12-25')!).getDate()).toBe(25);
  });

  it('reads back the local day, not the UTC one', () => {
    // UTC midnight is the previous day west of Greenwich and the same day east
    // of it; either way the local day is what the reader sees on screen.
    const local = new Date(2025, 0, 5, 0, 0, 0);
    expect(isoToCalendarDate(local.toISOString())).toBe('2025-01-05');
  });

  it('refuses anything that is not a calendar date', () => {
    expect(calendarDateToIso('')).toBeUndefined();
    expect(calendarDateToIso('tomorrow')).toBeUndefined();
    expect(isoToCalendarDate(undefined)).toBe('');
    expect(isoToCalendarDate('not-a-date')).toBe('');
  });
});
