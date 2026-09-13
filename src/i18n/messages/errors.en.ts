import type { ErrorMessages } from './errors.types';

export const errorsEn: ErrorMessages = {
  'lookup.network': ({ subject }) =>
    `Could not reach Open Library while looking up "${subject}". Check your network connection.`,
  'lookup.timeout': ({ subject, seconds }) =>
    `Open Library did not answer within ${seconds} seconds while looking up "${subject}".`,
  'lookup.http': ({ subject, status }) =>
    `Open Library returned HTTP ${status} for "${subject}". Try again in a moment.`,
  'lookup.invalidIsbn': ({ value }) => `"${value}" is not a valid ISBN-10 or ISBN-13.`,
  'lookup.notFound': ({ isbn }) => `No book found in Open Library for ISBN ${isbn}.`,
  'lookup.qrUnrecognized': () => 'This QR code does not contain a book identifier.',

  'api.healthFailed': ({ status }) => `The AI server did not respond to the health check (HTTP ${status}).`,
  'api.requestFailed': ({ status }) => `The AI server rejected the request (HTTP ${status}).`,
  'api.unauthorized': () => 'Sign in to use this feature.',

  'shelf.signInRequired': () => 'Sign in to use the shelf scanner.',
  'shelf.noSpines': () => 'Shelf recognition returned no spines. Try a sharper, better lit photo.',

  'sharedList.missing': ({ listId }) => `Shared list ${listId} no longer exists.`,
  'sharedList.alreadyMember': ({ person }) => `${person ?? 'That person'} is already a member of this list.`,
  'sharedList.invalidEmail': ({ email }) => `"${email}" is not a valid email address.`,
  'sharedList.alreadyInvited': ({ email }) => `${email} has already been invited.`,
  'sharedList.inviteOnly': () => 'This list is invite-only.',
  'sharedList.full': ({ limit }) =>
    `This list already holds its maximum of ${limit} books. Remove one before adding another.`,

  'storage.schemaMismatch': ({ found, expected, key }) =>
    `The stored library uses schema version ${String(found)}, expected ${expected}. ` +
    `Clear the "${key}" localStorage key to reset.`,

  'storage.quotaExceeded': ({ megabytes, key }) =>
    `The browser refused to save the library: it is about ${megabytes}MB and the storage quota is full. ` +
    'Scanned spine photos are the bulk of it — delete some scanned books, or export the library and ' +
    `clear the "${key}" localStorage key. Changes made from now on are not being saved.`,

  'capture.decodeFailed': () =>
    'The captured shelf photo could not be decoded for cropping. Retake the photo.',

  'device.audioUnavailable': () => 'The Web Audio API is not available in this browser.',
  'device.canvasUnavailable': () => 'The 2D canvas is not available in this browser.',

  'firebase.notConfigured': ({ missing }) =>
    `Firebase is not configured. Missing environment variables: ${missing}. ` +
    'Copy .env.example to .env and fill in your Firebase web app credentials.',
};
