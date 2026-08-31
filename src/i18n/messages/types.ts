import type { en } from './en';

/**
 * English is the source of truth for the catalog shape. Every other locale is
 * typed against it, so a missing or misspelled key is a compile error.
 */
export type Messages = typeof en;
