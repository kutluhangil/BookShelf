# Manual steps

Everything in this file needs a console, a credential, or a browser — it cannot
be done from the repository. Each item says why it matters and what breaks if it
is skipped.

Ordered by urgency. Items 1 and 2 block deployment; the rest is verification.

---

## 1. Two Firestore composite indexes — **required, shared lists are broken without them**

Both shared-list queries used to read every matching document, with each list
carrying its books inline. They are now ordered and capped at 50, which
Firestore cannot serve without a composite index. **Until these exist, the
Shared tab will fail to load with a `failed-precondition` error.**

The fastest route: open the app, go to the Shared tab, and open the browser
console. Firestore logs a `failed-precondition` error containing a direct link
that creates the exact index. Click each of the two links.

To create them by hand instead — Firebase console → Firestore Database →
Indexes → Composite → Add index, on collection `sharedLists`:

| # | Fields (in order) | Query it serves |
|---|---|---|
| 1 | `memberIds` (Array contains), `createdAt` (Descending) | "My lists" |
| 2 | `isPublic` (Ascending), `createdAt` (Descending) | "Public lists" |

Query scope: Collection. Building takes a few minutes on a small collection.

---

## 2. Production environment variables

### `TRUST_PROXY` — set this if anything sits in front of the server

Vercel, Cloud Run, Fly, Render, nginx, a load balancer: all of them make every
request arrive from the same address. Express reads that address as the
client's, so the per-address rate limit becomes one bucket shared by every
anonymous caller — the first twenty scans exhaust it for everyone.

```
TRUST_PROXY=1
```

`1` is right for a single proxy hop, which covers the platforms above. Leave it
empty only when the server is reached directly. The server logs a warning at
startup in production when it is unset.

Do not set it to `true` unless you know every hop is trusted: that tells Express
to believe any `X-Forwarded-For` header a client sends, which lets a caller
forge their own address and bypass the limit.

### `REQUIRE_AUTH` and the Firebase service account

Production already refuses to start with `REQUIRE_AUTH=false`, so this is only a
reminder of what it needs instead:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account", ...}
```

or `GOOGLE_APPLICATION_CREDENTIALS` pointing at the JSON file, with
`FIREBASE_PROJECT_ID` set. The service account JSON is a credential: it belongs
in the host's secret store, never in the repository.

---

## 3. Deploy `firestore.rules`

The rules file in the repository is not the one Firestore enforces until it is
pushed:

```bash
firebase deploy --only firestore:rules
```

---

## 4. Verify in a real browser

The automated gates — lint, type check, 144 tests, build — all pass, and both
servers were started and probed by hand. But nothing in this pass drove the UI
in a real browser, and three of the changes touch things only a browser shows.
Please click through these once:

**Google sign-in.** The new `Cross-Origin-Opener-Policy: same-origin-allow-popups`
header was chosen specifically so `signInWithPopup` keeps working. If the popup
opens and then hangs without signing you in, that header is the first suspect.

**The Content-Security-Policy, in a production build.** It is only active when
`NODE_ENV=production`, so `npm run dev` will not show a problem. Run
`npm run build && npm start`, open the app, and watch the console for
`Refused to load…` or `Refused to connect…`. The policy names the origins the
app uses today — Open Library, Google Fonts, Firebase, Unsplash for the demo
shelves, `lh3.googleusercontent.com` for profile photos. If your Firebase
project reaches an origin I did not list, it will be blocked and the console
will name it; add it to `contentSecurityPolicy.directives` in
`src/server/app.ts`.

**Cloud sync across two devices.** Sync now sends only what changed, and shelves
merge three ways. Worth confirming once with two browsers signed into the same
account: edit a book in one, wait for the auto-sync toast, reload the other.
The toast reports the number of documents written — after the first full sync it
should be small.

**Keyboard and screen reader.** Tab through the reading queue, the scan results
and the shared lists: those cards are reachable and respond to Enter and Space
now. If you have VoiceOver or NVDA handy, the icons should be silent rather than
reading out "photo_camera".

---

## 5. Optional, worth knowing

**A first sync after this update writes the whole library once.** The
fingerprints that make sync incremental start empty for an existing install, so
the first push after upgrading is a full one. Every push after that is a
difference. Nothing to do — just do not be surprised by the number in the toast.

**26 lint warnings remain, deliberately.** They are the React Compiler rules
that ship with `eslint-plugin-react-hooks` v7, mostly `set-state-in-effect` in
components I did not touch (`AmbientReadingMode`, `BookDetailModal`,
`ScanModal`). They describe real debt, but clearing them is a restructuring job
per component rather than a lint fix. `npm run lint` exits 0; the two rules that
catch outright mistakes are errors and pass.

**Firebase is still 905KB.** It is lazily loaded, so a signed-out reader never
downloads it, but for a signed-in one it dominates. Moving to the modular
`firebase/app` + `firebase/auth` + `firebase/firestore/lite` entry points would
cut it substantially. `firestore/lite` drops real-time listeners, which the
shared lists use — so it is a real decision, not a mechanical swap. Left alone.

**No end-to-end tests.** `src/__tests__/appRender.test.tsx` mounts the whole app
in jsdom, which catches a broken composition, but nothing drives the camera, the
scan flow or sign-in. Playwright is installed globally on this machine; its MCP
server failed to connect during this session, so nothing was recorded.
