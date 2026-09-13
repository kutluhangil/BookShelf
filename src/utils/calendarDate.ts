/**
 * Conversions between an `<input type="date">` value and an ISO timestamp.
 *
 * `new Date('2025-12-25')` is parsed as UTC midnight, which is the previous day
 * anywhere west of Greenwich: a due date picked as the 25th was stored as an
 * instant that renders as the 24th. Both directions here work in the reader's
 * own timezone, so the date that goes in is the date that comes back out.
 */

/** `2025-12-25` -> the ISO timestamp of local midnight on that day. */
export function calendarDateToIso(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, year, month, day] = match;
  const local = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(local.getTime()) ? undefined : local.toISOString();
}

/** An ISO timestamp -> the `YYYY-MM-DD` of the local day it falls on. */
export function isoToCalendarDate(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
