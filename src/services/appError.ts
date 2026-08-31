/**
 * Code-based errors for the service layer.
 *
 * A service never decides what sentence the reader sees: it raises a code plus
 * the values that sentence needs. The wording lives in the i18n catalog, so a
 * failure surfaces in the reader's language, while `detail` keeps the technical
 * diagnosis (HTTP body, SDK message) in English for the console.
 */

/** Every raisable failure, mapped to the values its message interpolates. */
export interface ErrorPayloads {
  'lookup.network': { subject: string };
  'lookup.http': { subject: string; status: number };
  'lookup.invalidIsbn': { value: string };
  'lookup.notFound': { isbn: string };
  'lookup.qrUnrecognized': Record<string, never>;

  'api.healthFailed': { status: number };
  'api.requestFailed': { status: number };
  'api.unauthorized': Record<string, never>;

  'shelf.signInRequired': Record<string, never>;
  'shelf.noSpines': Record<string, never>;

  'sharedList.missing': { listId: string };
  'sharedList.alreadyMember': { person: string | null };
  'sharedList.invalidEmail': { email: string };
  'sharedList.alreadyInvited': { email: string };
  'sharedList.inviteOnly': Record<string, never>;

  'storage.schemaMismatch': { found: unknown; expected: number; key: string };

  'device.audioUnavailable': Record<string, never>;
  'device.canvasUnavailable': Record<string, never>;

  'firebase.notConfigured': { missing: string };
}

export type AppErrorCode = keyof ErrorPayloads;

export interface AppErrorOptions {
  /** Untranslated technical context: response body, SDK message, URL. */
  detail?: string;
  cause?: unknown;
}

export class AppError<C extends AppErrorCode = AppErrorCode> extends Error {
  readonly code: C;
  readonly params: ErrorPayloads[C];
  readonly detail?: string;

  constructor(code: C, params: ErrorPayloads[C], options: AppErrorOptions = {}) {
    // The Error message is for logs, not for the reader: it carries the code and
    // the raw values so a stack trace alone explains the failure.
    const serialized = Object.keys(params).length > 0 ? ` ${JSON.stringify(params)}` : '';
    super(options.detail ? `${code}${serialized}: ${options.detail}` : `${code}${serialized}`);
    this.name = 'AppError';
    this.code = code;
    this.params = params;
    this.detail = options.detail;
    if (options.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/** Normalizes a caught value into the detail string an AppError carries. */
export function toDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
