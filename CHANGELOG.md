# Changelog

Newest entries at the top.

## Unreleased

### Security
- The AI rate limiter is keyed by user id, not by address. The quota belongs to the account that spends it: one account could previously burn it from many addresses, while everyone behind a shared NAT shared a single bucket. The address is now only the fallback for the development mode where authentication is off.
- `trust proxy` is configurable through `TRUST_PROXY`. Express previously read `req.ip` off the socket, so behind a load balancer every request carried the proxy's address and the address-keyed limit collapsed into one bucket for all callers. Production warns when it is unset.
- Security headers via `helmet`, including a Content-Security-Policy for the built app that names the origins it actually uses (Open Library, Google Fonts, Firebase). The opener policy is `same-origin-allow-popups` so Google sign-in still works, and the policy is off in development, where Vite needs inline scripts and `eval`.
- Request bodies are parsed per route instead of globally: only the two image endpoints accept 12MB, everything else 256KB. Parsing runs after authentication and rate limiting, so a rejected caller never has their upload buffered.
- Error responses no longer carry a stack frame outside development.
- The Gemini endpoints now require a Firebase ID token. Enforced by default in production, where `REQUIRE_AUTH=false` refuses to start; development opts out explicitly. The client attaches the token automatically and gates the AI features when the server reports `authRequired`.
- Fixed an unbounded memory leak in the rate limiter: expired per-IP entries are now swept.

### Changed
- `App.tsx` is 1374 lines rather than 1664, and holds 15 pieces of state rather than about 40. The library and its persistence (`useLibrary`), sign-in and cloud sync (`useCloudSync`), the notification queue (`useToasts`), the milestone rules (`useMilestoneToasts`) and the overlay state (`useActiveModal`) are each their own module. What is left in the component is the view state it actually renders from: filters, sort, compare mode and the scan lifecycle.
- Overlays are one discriminated union instead of ten booleans and three "currently active record" fields. Two dialogs open at once is now unrepresentable — and one path really did it: opening the profile share reused the sheet without clearing the shelf a previous share had left behind, so the profile showed someone's bookshelf. The record-bound variants hold an id and look the record up, so the open book detail can no longer drift from the library; `updateBook` used to patch a second copy by hand to keep them together.
- The milestone bookkeeping moved from state into refs. It exists only to stop a milestone firing twice, and holding it in state made every book change schedule a second render that changed nothing on screen.

- The matcher evaluation is no longer part of the entry chunk. `SpikeAccuracyDashboard` and its ground-truth dataset are a developer tool reached from one tab and one menu entry, but both were statically imported and the dataset was pulled in a second time by the scanner's demo strip. They load on demand now, and the eager JavaScript drops from 375KB to 334KB (gzip 100KB to 89KB).

- Cloud sync writes only what changed. Every sync used to `set` every book and every shelf, so one edited note cost a Firestore write per book in the library — and the auto-sync fires eight seconds after any change. `planSync` compares a content fingerprint of each record against the last successful push and sends the difference; the fingerprints are persisted, so the saving survives a reload. Because the comparison is on content, it does not depend on a mutation site remembering to bump `updatedAt`. The sync toast reports documents written rather than library size.
- Local persistence is coalesced. It ran on every state change and serialised the whole library synchronously on the main thread — once per keystroke in a note. Writes are now collapsed over 400ms and flushed on `pagehide` and on the tab being hidden, so a closing tab still loses nothing.
- The stored library has a migration path. A schema bump used to throw, and the caller's fallback is the bundled starter library, so shipping a new field would have silently replaced every existing reader's library. Only a record from a newer schema than this build knows is refused.
- Shelves merge three ways. They carry no timestamp, so the cloud copy was discarded unconditionally and a rename made on another device vanished without a word. The last-synced fingerprint supplies the missing reference point: a shelf this device has not touched accepts the remote edit, a shelf it has edited keeps the local one, and either way the resolution is reported like a book conflict.
- Both shared-list queries are ordered and limited to 50. They read the entire matching set, and every list document carries its books inline. **This needs two composite indexes in Firestore — see `MANUAL-STEPS.md`.**

### Accessibility
- Pinch zoom works again: the viewport tag carried `maximum-scale=1.0, user-scalable=no`, which fails WCAG 1.4.4 and is the difference between usable and unusable for anyone who enlarges text.
- All 137 Material Symbols spans are `aria-hidden`. The icon font renders its ligature name as text content, so a screen reader was reading out "photo_camera" and "library_books" beside — or instead of — the real label.
- Every icon-only button has an accessible name. Twenty borrowed the `title` they already carried; twelve had nothing at all, including the close button of six dialogs.
- The bottom tabs report `aria-current="page"`. Which tab is active was previously conveyed by colour alone. The four copies of the tab markup collapsed into one component.
- Clickable `div`s are reachable by keyboard: the reading queue card, the two scan-result rows (the second as a `checkbox`, which is what it is), a shared-list card and the accuracy sample picker all take focus and respond to Enter and Space. The shelf coordinate grid instead lost a click handler that fired a haptic tick and nothing else while advertising a pointer cursor.
- Toasts are a polite live region, so a milestone or a sync failure is announced and not merely drawn.
- The navigation landmark and the scan button have names; jsx-a11y's markup rules are errors, with the four remaining exemptions each carrying the reason it is one.

### Added
- ESLint, with `typescript-eslint`, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y`. `npm run lint` now runs it and `npm run typecheck` runs the type check they used to share; CI runs both. Stale `eslint-disable` comments are themselves an error — the repository had been carrying three of them with no ESLint installed to honour or reject them.
- Response compression (`compression`).
- Coded service-layer errors: services now raise `AppError` with a code and typed params (`src/services/appError.ts`) instead of an English sentence, and `formatError` renders it from the active locale's catalog (`src/i18n/messages/errors.{en,tr}.ts`). The technical detail (HTTP body, SDK message, URL) is kept on the error and appended in parentheses, so failures are readable in Turkish without losing diagnosability. A mapped type makes a new code without a message a compile error.
- Turkish interface with a TR/EN switch. Every string the app renders itself lives in a typed message catalog (`src/i18n/`); the locale is picked from the browser language on first load, and an explicit choice is remembered in local storage. Turkish is typed against the English catalog, so a missing key fails the build rather than showing a blank label. Dates, weekday names and number formatting follow the active locale.
- Root `ErrorBoundary` with a "reset stored library" escape hatch, so a bad persisted record can no longer permanently brick the app on every reload.
- GitHub Actions CI running type check, unit tests and build on every push and pull request.
- Per-spine crops: each scan candidate gets its own thumbnail cut from the shelf photo, instead of every book showing the whole shelf as its proof of capture.
- CSV import for this app's own export format and Goodreads exports, with per-line skip reporting, duplicate detection and optional Open Library enrichment.
- ZXing fallback for barcode scanning, lazily loaded, so ISBN and QR scanning work on Safari and Firefox (that is, on iPhones).
- Live shared lists via `onSnapshot`, debounced auto-sync, an unsynced-changes indicator and a close-tab warning.
- Visible conflict resolution: merges report what was resolved and how many local edits the cloud superseded.
- `ModalShell`: every dialog now has `role="dialog"`, an accessible name, Escape to close, a focus trap, focus restoration and a body scroll lock.
- `BookCover` with a real fallback tile, wired into all nine places that render a cover.
- PWA support — installable, with an offline shell that runs the whole library with the server stopped.
- Incremental rendering for the book grid, 60 at a time.
- A live benchmark for the catalog matcher, replacing the Phase 0 dashboard's hard-coded figures.
- A smoke test that actually mounts `App`, so a broken composition fails the build rather than the first person to open the page.
- Component tests with jsdom and Testing Library; 120 tests in total.

### Changed
- A user's cloud library moved from the top-level `books` and `shelves` collections into `users/{uid}/books` and `users/{uid}/shelves`. Ownership is now the document path: records no longer carry a `userId` field, reads need no `where` clause (and so no composite index), and the security rules collapse to a single uid comparison.
- Camera frames are downscaled to 1280px before upload, cutting a 1-3MB payload per scan.
- All AI calls go through a single `apiClient` that attaches credentials and surfaces the server's structured error detail.
- Eagerly loaded JavaScript is down from one 1.65MB chunk to 634KB across three (gzip 447KB to 183KB): Firebase, ZXing and Recharts all load on demand.

### Fixed
- `QuoteScannerModal` called `startCamera`/`stopCamera` from an effect declared above both of them, so neither could be a dependency, and `stopCamera` read the `stream` state it was also setting. The stream is never rendered, so it moved into a ref and the effect now declares what it uses.
- The recommendation card built a `Book` behind `as any`, leaving `isbn`, `pageCount`, `confidence` and `score` undefined on every book added that way — fields the detail view and the pacing maths read directly. It now hands over a complete record and `App` drops its matching cast.
- The Open Library responses are typed instead of `Record<string, any>`, which had also hidden that `notes` arrives either as a string or as a `{value}` record; the description was silently dropped in the second case.
- Effects in `AmbientReadingMode` and `SharedListsView` formatted errors through `t` without depending on it, so a failure raised before a language switch kept rendering in the old language.
- The nine copies of "vibrate, swallow whatever the platform throws" in `haptics` collapsed into one helper that explains why the failure is not propagated and logs it at debug level.
- `BookDetailModal` nested the quote scanner inside its own `AnimatePresence`, giving it two unkeyed children; React logged a duplicate-key error on every open.
- `ModalShell` filtered focusable elements with `offsetParent`, which is null for `position: fixed` elements — exactly what these dialogs are — so the focus trap could stop wrapping.
- A lazily loaded chart panel that failed to fetch took the whole app down through the root error boundary; each panel now degrades on its own.
- Added the favicon the app had been requesting on every load.

## 2026-08-30

### Fixed — critical
- Firebase configuration now comes from `VITE_FIREBASE_*` environment variables instead of a gitignored `firebase-applet-config.json`, so the repository builds after a fresh clone.
- Added local persistence (`src/services/localStore.ts`); the library, shelves, goals and deletion tombstones survive a page reload.
- Replaced the non-existent `gemini-3.7-flash` model with a configurable `GEMINI_MODEL` (default `gemini-2.5-flash`); both AI endpoints previously failed with 500.
- Added `@types/react` / `@types/react-dom`, restoring type checking (this surfaced a broken `onSelect` prop on `BookCard` in the shared-lists view).
- Cloud sync now propagates deletions and merges cloud data with local state by timestamp instead of silently overwriting it.

### Added — real implementations replacing stubs
- Real camera capture in the scanner (`getUserMedia`), with hardware torch control and a real gyro level indicator; the simulated angle test bench was removed.
- Live ISBN and QR decoding via the Barcode Detection API, resolved against the Open Library API for genuine metadata instead of hard-coded books.
- Shelf recognition through a new `POST /api/gemini/shelf` endpoint that returns real spines, matched against the local catalog with trigram similarity.
- Open Library-backed catalog search in the manual match sheet and a new "Add by search" flow in the library toolbar.
- Ambient reading soundscapes synthesized with the Web Audio API, replacing dead freesound CDN hotlinks; added a volume control and proper teardown.
- Share modal: "Save image", "Story 9:16" and "Share" now render a real shelf card to canvas and download or share it; CSV export reports what it exported.
- Shared lists: email invitations, invitation claiming on sign-in, public list browsing and joining, list deletion, and book removal.
- Sign out, a real profile menu, page-level reading progress, editable page counts, book ratings (1-5), and lending due dates with overdue reminders.
- Shelf deletion with orphaned books reassigned to another shelf.
- Vitest unit tests (30) covering streaks, spine matching, ISBN normalisation, the search parser, cloud merge and local storage.

### Fixed — logic
- Reading streaks now use local calendar days and count finished books, not only timed sessions.
- The 7-day analytics chart keys on calendar dates; sessions from earlier weeks no longer land in the current week.
- Turkish text normalisation no longer shreds words containing `ı`, `ş` or `ğ`.
- Saved scan results get unique ids, so rescanning a shelf no longer collides in React keys or Firestore.
- Shelf volume counts stay in sync with the actual books; compare mode clears its queue on exit.
- `MonthlyGoalDashboard` is rendered again (it was imported but never mounted, along with its unused `monthlyGoal` state).

### Security
- Rate limiting on the unauthenticated Gemini endpoints, a stricter payload size cap, and actionable error responses.
- Firestore rules for `sharedLists` no longer let a member rewrite `ownerId`, `isPublic` or the member list; joining is restricted to public lists or verified invited emails.

### Housekeeping
- Removed the leftover `fix.cjs` repair script and the duplicated `spike/clustering.ts`.
- The Phase 0 evaluation screen and `spike/report.md` are now labelled as synthetic demo data.
- Bundle split into react / firebase / charts / motion chunks (was a single 1.6MB file).
- Renamed the package from `react-example` to `bookshelf`; added `test` and `test:watch` scripts.
