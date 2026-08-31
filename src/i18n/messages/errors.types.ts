import type { AppErrorCode, ErrorPayloads } from '../../services/appError';

/**
 * One renderer per error code. A new code without a message is a compile error,
 * so a failure can never reach the reader as a blank string.
 */
export type ErrorMessages = {
  [K in AppErrorCode]: (params: ErrorPayloads[K]) => string;
};
