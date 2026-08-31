import { AppError } from '../services/appError';
import type { Messages } from './messages/types';

/**
 * Turns anything thrown into the sentence the reader sees. An AppError renders
 * from the catalog in the active locale and keeps its technical detail in
 * parentheses; anything else falls back to its own message, which is all we
 * know about it.
 */
export function formatError(t: Messages, error: unknown): string {
  if (error instanceof AppError) {
    const render = t.errors[error.code] as (params: unknown) => string;
    const message = render(error.params);
    return error.detail ? `${message} (${error.detail})` : message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
