# Changelog

Newest entries at the top.

## Unreleased

### Security
- The Gemini endpoints now require a Firebase ID token. Enforced by default in production, where `REQUIRE_AUTH=false` refuses to start; development opts out explicitly. The client attaches the token automatically and gates the AI features when the server reports `authRequired`.
- Fixed an unbounded memory leak in the rate limiter: expired per-IP entries are now swept.

### Added
- Root `ErrorBoundary` with a "reset stored library" escape hatch, so a bad persisted record can no longer permanently brick the app on every reload.
- GitHub Actions CI running type check, unit tests and build on every push and pull request.

### Changed
- Camera frames are downscaled to 1280px before upload, cutting a 1-3MB payload per scan.
- All AI calls go through a single `apiClient` that attaches credentials and surfaces the server's structured error detail.

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
