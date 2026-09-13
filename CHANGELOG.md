# Changelog

Newest entries at the top.

## Unreleased

### Fixed — a cleared field came back from the cloud
- Every record was pushed with `set(..., { merge: true })` after its `undefined` keys were stripped, and a merge leaves a key it is not given exactly as it was. A field the reader cleared — a loan that came back, a rating taken away, a completion date dropped when a book was marked unread — is precisely such a key, so the old value stayed in the cloud and the next device to fetch got it back and showed the book as still lent. Those keys are now written as an explicit field deletion; a field that was never set stays out of the write.

### Fixed — scanning a book you already own
- The barcode path built a book, handed it to `addBook`, which dropped it as a duplicate ISBN, and then reported "Book added" and opened a dialog on a record that was never inserted, so the reader was told about a book they could not find. `addBook` now says whether it filed the book and which record it ended up with: a duplicate reports "Already in your library" and opens the copy the library holds.

### Fixed — a bin coordinate off the map
- The bin boxes stored whatever was typed, `min`/`max` being only a hint a keyboard ignores. The coordinate map draws bins inside the grid, so column 9 of a six-column shelf filed the book nowhere at all, with nothing said about where it went. A coordinate is now held inside the shelf's grid.

### Fixed — bulk arrange hid most of the shelf
- "Bulk arrange" packed the books into the grid the shelf already had, so a shelf arranged once and then grown put more books in a row than the row has columns — 40 books in a 6×3 grid landed on 18 bins, and the map draws one book per bin, so 22 of them were no longer on it. `utils/shelfLayout` grows the grid to fit the books and gives every book a bin of its own.

### Fixed — bins outlived their books
- A coordinate stayed on the shelf record after the book it pointed at was deleted or moved to another shelf. Nothing ever removed it, so it was carried locally and pushed to the cloud for good. Deleting or moving a book now releases the bin it held.

### Fixed — deleting the last shelf
- The last shelf could be deleted as long as it was empty, leaving a library with no shelves — and every path that files a book reaches for the first shelf, which then fell back to an id no shelf record carried, so the book was filed out of reach of every shelf filter. A library now keeps at least one shelf.

### Fixed — quote scanner stuck after a scan
- The quote scanner keeps its state between scans, and the spinner was only cleared on failure. A scan that worked left `isScanning` true, so the next time the scanner opened it showed the extracting overlay over a capture button that could no longer be pressed. Opening it now clears the overlay and the last error, and the capture path clears the spinner in a `finally`.
- A browser with no 2D canvas did nothing at all: the whole capture sat inside `if (ctx)`, so the spinner ran forever with no request sent and no message shown. That case now raises `device.canvasUnavailable`, which the scanner renders.
- The camera had the same start/close race the shelf scanner had: the stream was stored only after `getUserMedia` resolved, so closing the scanner first left the camera live for the rest of the session. Starts now carry a session number and a stream that arrives after a close is stopped on arrival.

### Fixed — the due date came back a day early
- A lending due date was stored with `new Date('2025-12-25')`, which is UTC midnight and therefore the 24th anywhere west of Greenwich, and read back with a UTC `slice(0, 10)`. The date the reader picked and the date the book showed could differ by a day in opposite directions. `utils/calendarDate` converts both ways in the reader's own timezone.

### Fixed — clearing the page box marked a book unread
- The current-page input read an empty box as page 0, and a reader has to empty it before typing a new number. For a finished book that meant progress 0, status `unread` and the completion date dropped, between one keystroke and the next. An empty box is now ignored until a number is typed.

### Fixed — deletions resurrected on a second device
- Deleting a book removed its document and nothing else, so a second device — which only ever sees what the cloud holds — could not tell a deleted record from one it had never pushed, kept its own copy, and pushed it straight back up. Every deletion now also writes a tombstone under `users/{uid}/deletions`, the fetch reads them, and the merge drops a local record a tombstone covers. A record edited here *after* the deletion outranks it and survives, so re-adding a book still works. Shelves carry no timestamp and so cannot outrank one. Anything the merge removes is reported as a toast rather than vanishing quietly. Tombstones are swept on read after 180 days; a device offline for longer resurrects its records, which is where every device stood before this change. `firestore.rules` grants the new subcollection to its owner only.

### Fixed — the reader's page moved on its own
- The page number was stored only as a whole percentage and derived back out of it, so the reader's own bookmark moved: page 151 of 300 is 50.33%, kept as 50, read back as page 150. Page and percentage are now derived together in `services/readingProgress`, and a page the reader typed is stored as typed. The status comes from the exact percentage instead of the rounded one, so page 1 of an 800-page book counts as reading rather than unread.

### Fixed — silent level-indicator failure
- `enableOrientation` awaited `DeviceOrientationEvent.requestPermission()` with nothing around it. iOS rejects that call when it does not come from a user gesture, and a rejection from a click handler reaches nobody: the button appeared dead and the console took an unhandled rejection. A refusal and a rejection now each put a message on the scanner, in both locales.

### Fixed — orientation listener leak
- The iOS permission grant attached its own inline `deviceorientation` handler, which nothing removed: the effect's cleanup only knew about the handler the effect itself had created. Every grant added another listener that kept running `setRoll`/`setPitch` behind a closed scanner for the rest of the page's life. The grant now just records that permission is held, and the single effect owns attaching and removing the listener.

### Fixed — import after cancel
- Closing the import sheet while covers were being fetched did not stop the run. The enrichment loop kept requesting covers and, when it reached the end, still called `onImport`, so books the reader had walked away from appeared in the library. Enrichment now carries a session number that closing the sheet (or picking another file) bumps, and a run whose number is stale stops without importing.

### Fixed — hung lookups
- `bookLookup` had no deadline on its Open Library requests, so a request the server accepted and never answered blocked the sequential import loop indefinitely. Requests now abort after 10 seconds and raise a coded `lookup.timeout` error in both locales.

### Fixed — skipped row line numbers
- A skipped row was reported with its index in the parsed result, which is not its line in the file: blank lines are dropped and a quoted field may span several lines, so the number sent the reader to the wrong place in their CSV. `parseCsvRows` now tags every row with the source line it started on, and the skip report uses it.

### Fixed — camera left running
- Closing the scanner before the camera finished starting left the camera on for the rest of the session. `startCamera` assigned `streamRef` only after `getUserMedia` resolved, while the close path ran `stopCamera` on a ref that was still `null`; the stream then arrived with nobody holding it, so its tracks were never stopped — the capture light stayed lit and reopening the scanner leaked another stream on top. A camera start now takes a session number that `stopCamera` bumps, and a stream that belongs to a session that has ended is stopped on arrival instead of being stored.

### Fixed — cross-account leak
- Signing out left the library on the device, and the sign-in merge had no idea whose it was. Signing in with a second account merged the first reader's books into the second's library and, eight seconds later, the auto-sync pushed them into that account's cloud — along with the first account's tombstones, which delete by document id. The persisted record now carries `ownerUid` (schema 3 → 4; an existing record migrates to `null`, meaning unclaimed). A sign-in that does not match the owner no longer merges: it adopts that account's cloud copy, resets the tombstones and the push fingerprints, and says so. A library with no owner yet is still the reader's own offline one and still merges, which is what a first sign-in needs.
  - Trade-off, stated rather than hidden: work the previous account never pushed is not carried across the switch. It is at most the last few seconds of edits, since a push runs eight seconds after any change.

### Fixed — wrong data
- A spine the vision model read confidently but that the local catalog does not hold could be filed as `matched` and saved as an unrelated book. `calculateSimilarity` scored any substring relation at 0.88, so `IT` — which sits inside `city` — matched `The City We Became`; blended with a confident reading that reached 0.892, past the 0.82 match threshold, and the scan results view pre-selects every `matched` candidate. Containment now has to fall on word boundaries and be at least four characters; anything shorter falls through to the trigram comparison, which puts such a spine back in the review list carrying what the model actually read.

### Fixed — data loss
- A scanned library could fill the local storage quota and then stop being saved without a word. Three faults compounded: every scanned book stored its spine crop twice (`spineCropUrl` and `proofOfCaptureUrl` held the same base64 JPEG), a box that failed to crop fell back to the entire shelf photo — a multi-megabyte data URL written once per book — and `saveLibrary` called `setItem` bare, so the `QuotaExceededError` was thrown from a `setTimeout` where no error boundary or caller could see it. The reader kept working on a library that was no longer being persisted.
  - `proofOfCaptureUrl` is gone. One field holds the crop, and a schema 2 → 3 migration strips the duplicate from libraries that already exist, so the space is reclaimed on the next write rather than only for new scans.
  - `cropRegions` returns `string | null` and never the source photo. A box too thin to be a spine, or a tainted canvas, costs that one thumbnail; a photo that will not decode or a browser with no 2D canvas raises a coded error instead of being papered over. The scan result rows, the review sheet and the book detail panel render the framed empty box they already sit in when there is no thumbnail.
  - A full quota now raises `storage.quotaExceeded`, which names the size, the storage key and what to delete. Because the write runs from a timer and from `pagehide`, where a throw reaches nobody, `localStore` exposes `onPersistenceError`; `useLibrary` subscribes and `App` raises a toast. A recurring identical failure is reported once, not once per keystroke.

- A shared list carried whole `Book` records inline, spine crop and all. A Firestore document is capped at 1MB, so a list of a few dozen scanned books crossed it and every write to that list failed from then on — including removing a book, the one action that could have brought it back under the cap. Lists now store a `SharedListBook`: the id, title, author, cover URL and spine colour the list actually renders, which is all the view has ever read. Documents written the old way are projected down on read and rewritten on the first edit, so the oversized copies leave on their own. Adding past `SHARED_LIST_MAX_BOOKS` (500) raises `sharedList.full` instead of quietly writing a document that can never be written again.
- A book deleted while a sync was in flight came back. `syncNow` cleared the whole tombstone list on success, including the ids recorded after the push had already been sent, so those documents stayed in Firestore and the next fetch merged them back into the library. The push now clears exactly the ids it sent and leaves the rest waiting. Shelves had the same hole.
- Edits made during a push were reported as synced. The success handler cleared `hasUnsyncedChanges` unconditionally, so a note typed while the request was open left the auto-sync timer unscheduled and the cloud copy stale until the reader happened to edit something else. A revision counter now tells the two apart. `syncNow` also refuses to start on top of a push that is still running — `isSyncing` is state and lags behind the call.
- A stored library this build cannot read was replaced by the bundled starter library — and then written over it. `readInitialLibrary` falls back to the starter records on any read failure (a record from a newer schema, damaged JSON), and the coalesced save fired 400ms later at the same storage key, so the reader's own library was gone for good and a signed-in reader pushed the demo books to the cloud on top. The unreadable record is now copied to `bookshelf.library.v1.unreadable` before anything can overwrite it, and if even that copy fails, saving stays off for the session rather than trade the library for the sample one. The startup toast says which of the two happened.
- `fetchFromCloud` deletes `proofOfCaptureUrl` from the cloud copies that still carry it, with `deleteField`. Dropping the field on read protected the local library but left the duplicate in Firestore, where it went on consuming the document's 1MB budget and was downloaded again on every sync.

### Documentation
- `MANUAL-STEPS.md`: what has to be done outside the repository — the two Firestore composite indexes the ordered shared-list queries now need, `TRUST_PROXY` in production, deploying the rules, and the browser checks this pass could not run.
- README badges said React 18 and Tailwind 3; the project is on React 19 and Tailwind 4. The layout, command card and environment table are current again.
- Removed `APP_URL` from `.env.example`. Nothing has ever read it.

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
- Integration tests for the HTTP surface. `server.ts` split into an entry point that reads the environment and `src/server/app.ts`, a factory that takes the Gemini client, the auth setup and the environment as arguments — so the routes can be driven without a port or an API key. 30 tests now cover the parts where a mistake is a bill or a breach: that an unauthenticated call never reaches the paid API and never has its body buffered, that one account's burst does not consume another's allowance, that a 9MB image and an oversized recommendation request are refused, that a stack frame does not escape in production, and that production refuses to start with authentication off.
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
