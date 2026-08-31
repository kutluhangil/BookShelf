<div align="center">

<br />

<img src="https://img.shields.io/badge/Status-In_development-C9963F?style=for-the-badge&logoColor=white" alt="status" />
<img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="vite" />
<img src="https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="react" />
<img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
<img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="tailwind" />
<img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="license" />

<br /><br />

```
██████╗  ██████╗  ██████╗ ██╗  ██╗
██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝
██████╔╝██║   ██║██║   ██║█████╔╝
██╔══██╗██║   ██║██║   ██║██╔═██╗
██████╔╝╚██████╔╝╚██████╔╝██║  ██╗
╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝
███████╗██╗  ██╗███████╗██╗     ███████╗
██╔════╝██║  ██║██╔════╝██║     ██╔════╝
███████╗███████║█████╗  ██║     █████╗
╚════██║██╔══██║██╔══╝  ██║     ██╔══╝
███████║██║  ██║███████╗███████╗██║
╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝
```

### **Digitize your physical library. Track your reading habits.**

*A beautifully crafted React application bridging the gap between your physical bookshelf and digital reading analytics.*

</div>

---

## ✦ What is Book Shelf?

**Book Shelf** is a modern React web application designed for physical book lovers who want digital tracking without the manual data entry friction. The app solves one primary problem — *how do I easily catalog the hundreds of books sitting on my physical shelf?* — and builds a comprehensive reading ecosystem around it.

It features two advanced computer-vision simulated pipelines:
- **Shelf Scanner** — Point your camera at a physical bookshelf, and the app detects, crops, and extracts text from every individual book spine, clustering them into logical digital shelves.
- **ISBN Scanner** — A rapid, high-confidence single-book scanner that targets the back-cover barcode for immediate library insertion.

Three more layers sit on top of your library:

- **Reading Analytics & Pace** — Log reading sessions (duration + progress). The app calculates your unique reading speed (seconds per percentage) and provides a dynamic **Estimated Time Remaining (ETR)** for your current reads.
- **Gamification & Habits** — A daily reading streak engine, a monthly reading goal dashboard, and a toast notification system that fires off milestone alerts (e.g., "7-day streak!", "15 books read!").
- **Smart Recommendations** — A privacy-first local recommendation engine that analyzes your existing library's authors and genres to suggest new books, complete with "Why this was recommended" reasoning badges.

---

## 🇹🇷 Türkçe özet

**Book Shelf**, fiziksel kitaplığını dijitalleştirmek ve okuma alışkanlıklarını derinlemesine analiz etmek isteyenler için geliştirilmiş modern bir React web uygulamasıdır. Temel amacı, yüzlerce fiziksel kitabı tek tek elle girme zahmetini ortadan kaldırmaktır.

- **Kamera ile Tarama (Spine & ISBN)** — İster "Raf Tarama" moduyla tüm kitaplığınızın fotoğrafını çekip kitap sırtlarını (spines) otomatik analiz ettirin, isterseniz de "ISBN Tarama" moduyla tek bir kitabın arkasındaki barkodu okutarak anında kitaplığınıza ekleyin.
- **Akıllı Okuma Hızı (ETR)** — Uygulama, girdiğiniz okuma oturumlarını (süre ve ilerleme yüzdesi) analiz ederek size özel bir okuma hızı belirler. Bir kitabı bitirmenize "Kaç saat/dakika kaldığını" dinamik olarak hesaplar.
- **Motivasyon & Seriler** — Her gün okuma alışkanlığı kazanmanız için günlük okuma serileri (streaks), aylık okuma hedefleri ve kilometre taşlarına ulaştığınızda (örn: 5 kitap bitirme, 7 günlük seri) ekranda beliren şık bildirimler (toast notifications) bulunur.
- **Dinamik Öneriler** — Kitaplığınızdaki yazar ve tür yoğunluğunu analiz ederek, "Haruki Murakami okuduğun için" gibi gerekçelendirilmiş yeni kitap önerileri sunar ve tek tıkla kütüphanenize eklemenizi sağlar.

**Tasarım felsefesi:** Karmaşadan uzak, loş ve zarif bir "Warm Obsidian" teması üzerine kuruludur.

---

## ⚡ Features

| Feature | What it does |
|---|---|
| 📸 **Shelf Scanner** | Captures a live camera frame and sends it to the server-side Gemini vision endpoint, which returns every readable spine. Recognized text is matched against the local catalog with trigram similarity and grouped into three confidence bands. |
| 🏷️ **ISBN / QR Scanner** | Live barcode decoding via the Barcode Detection API, resolved against the Open Library catalog for real metadata (title, author, publisher, page count, cover). |
| 🔎 **Catalog Search** | Debounced Open Library search for manual entry and for resolving low-confidence spines. |
| ⏱️ **Smart Pacing (ETR)** | Calculates exact hours/minutes left to finish a book based on the total seconds logged per percentage point in your Reading Sessions. |
| 🔥 **Watch Streak & Milestones** | Calculates consecutive reading days. Fires beautifully animated Toast notifications at 7-day intervals and 5-book completion milestones. |
| 📚 **Library & Shelves** | 3 statuses (Unread, Reading, Read) · Custom visual shelf strips · Filtering by status and sorting (Author, Title, Recent, Physical Order). |
| 🔮 **Recommendations** | Analyzes your current library to suggest new titles based on matched authors and genres, instantly addable to your backlog. |
| 📊 **Dashboards** | Includes a Monthly Goal radial chart, Weekly Reading line charts, Library Growth stats, and a Spike Accuracy dashboard for the scanning engine. |
| 👆 **Haptic Feedback** | Web Audio micro-clicks plus the Vibration API for a tactile feel on every button press, scan, and milestone. |
| 🌙 **Ambient Reading Mode** | Full-screen timer with soundscapes synthesized locally with the Web Audio API (rain, fireplace, library, brown noise) — no external audio requests. |
| ☁️ **Cloud Sync** | Optional Google sign-in with Firestore sync, including deletion propagation and a timestamp-based merge instead of a blind overwrite. A library is stored under `users/{uid}/books` and `users/{uid}/shelves`, so ownership is the document path. |
| 🌍 **Turkish & English** | The interface ships in both languages with a TR/EN switch in the profile menu. The first load follows the browser language; an explicit choice is remembered. Service-layer failures are raised as coded `AppError`s and rendered from the catalog, so they are translated too; the raw technical detail (HTTP body, SDK message) is appended in English for diagnosis. |
| 🤝 **Shared Lists** | Public or invite-only collaborative lists with email invitations, joining, and per-book curation. |

---

## 🛠️ Tech

```
Frontend   →  Vite · React 18 · TypeScript
Styling    →  Tailwind CSS 3
Animation  →  Motion (framer-motion)
Icons      →  Google Material Symbols
State      →  React useState / Context (Local State Engine)
```

---

## 🎨 Design system — "Warm Obsidian"

The UI is designed to feel like a premium, dimly lit personal study or library. It relies heavily on high-contrast typography, strict grid alignments, and subtle glowing accents.

| Role | Token / Class | Value |
|---|---|---|
| Ground | `bg-[#12100E]` | Deep, warm off-black. Never pure `#000`. |
| Card / Panel | `bg-[#1C1916]` / `bg-[#262119]` | Slightly elevated warm grays. |
| Text (Primary) | `text-[#F4EFE6]` | Warm off-white, easy on the eyes in dark mode. |
| Text (Muted) | `text-[#A79C8C]` | Soft beige/gray for secondary information. |
| **Accent (Gold)**| `text-[#C9963F]` | Used for interactive elements, highlights, and primary actions. |
| Success / Read | `text-[#85E07D]` | Sage green for completed goals and 100% progress states. |

Typography relies on a clean sans-serif for UI elements, paired with a monospaced font (`font-mono-ibm` / IBM Plex Mono style) for data points, tags, ISBNs, and tracking metrics.

---

## 📐 Project layout

```
Book Shelf/
├── src/
│   ├── components/             # React Components
│   │   ├── BookDetailModal.tsx # Detailed view, reading sessions, ETR calculation
│   │   ├── ScanModal.tsx       # Dual-mode scanner (Shelf & ISBN) HUD
│   │   ├── RecommendedBooks.tsx# Recommendation engine UI
│   │   ├── Toast.tsx           # Milestone notification system
│   │   └── ...                 # Dashboards, Cards, Layouts
│   ├── data/                   # Starter library and recommendation catalog
│   ├── i18n/                   # Locale detection, provider, and the tr/en message catalogs
│   ├── services/               # bookLookup (Open Library), clusteringEngine (spine matching),
│   │                           # cloudSync, localStore, ambientAudio, shelfCard, haptics
│   ├── utils/                  # Helper functions (streak, search parser)
│   ├── __tests__/              # Vitest unit tests
│   ├── App.tsx                 # Main application state and router
│   ├── index.css               # Tailwind & global styles
│   └── types.ts                # TypeScript interfaces (Book, Shelf, ReadingSession)
├── server.ts                   # Express server + Gemini endpoints (shelf, quote, recommend)
├── firestore.rules             # Firestore security rules
├── package.json
└── vite.config.ts
```

---

## 🚀 Setup

### Requirements
- Node.js `>= 18`
- `npm`, `pnpm` or `bun`
- A Gemini API key (for the scanner, OCR and AI recommendations)
- Optional: a Firebase project (for Google sign-in, cloud sync and shared lists)

```bash
# Clone the repository
git clone https://github.com/yourusername/bookshelf.git
cd bookshelf

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Fill in GEMINI_API_KEY, and the VITE_FIREBASE_* values if you want cloud features.

# Start the development server (Express + Vite middleware on :3000)
npm run dev
```

Without `GEMINI_API_KEY` the server refuses to start and names the missing variable.
Without the `VITE_FIREBASE_*` values the app runs fully offline against local storage;
the login button is disabled and says so.

### Command card

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Express + Vite dev server on `localhost:3000` |
| `npm run build` | Builds the client into `dist/` and bundles the server to `dist/server.cjs` |
| `npm start` | Runs the production build |
| `npm test` | Runs the Vitest unit tests |
| `npm run lint` | Type-checks the project with `tsc --noEmit` |

### Environment variables

| Variable | Required | What it does |
|---|:-:|---|
| `GEMINI_API_KEY` | yes | Server-side key for shelf recognition, OCR and recommendations. The server refuses to start without it. |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash`. |
| `REQUIRE_AUTH` | no | Defaults to on in production. `false` is refused in production, because the AI endpoints cost money per call. |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` | when auth is on | Used to verify Firebase ID tokens server-side. |
| `VITE_FIREBASE_*` | no | Client credentials. Without them the app runs fully offline against local storage and says so. |

---

## 📈 Status

| Area | State |
|---|:-:|
| Core Library (CRUD, Sorting, Shelves) | ✅ |
| Local persistence (survives reload) | ✅ |
| Shelf recognition (camera + Gemini vision) | ✅ |
| ISBN / QR scanning (Barcode Detection API + Open Library) | ✅ |
| Reading Analytics (Sessions, Pace, ETR) | ✅ |
| Dashboards (Goals, Calendars, Growth) | ✅ |
| Gamification (Streaks, Milestone Toasts) | ✅ |
| Local Recommendation Engine | ✅ |
| Gemini AI Recommendations | ✅ |
| Cloud Persistence (Firebase) | ✅ Optional |
| Shared Lists (public + invite-only) | ✅ Optional |
| Unit tests (Vitest) | ✅ |
| Offline / installable (PWA) | ✅ |
| CSV & Goodreads import | ✅ |
| API authentication (Firebase ID token) | ✅ |
| CI (type check, tests, build) | ✅ |
| Turkish UI (i18n) | ⬜ Needs a product decision |
| Mobile Native Port (React Native) | ⬜ Planned |

> **Note on the "Phase 0 Eval" screen:** the bundled benchmark dataset is synthetic
> sample data with known ground truth, used to exercise the review UI. It is not a
> measurement of the live recognition pipeline, and the screen says so.

---

## 📄 License and attribution

Code is **MIT** — see [`LICENSE`](LICENSE).

*This project was rapidly prototyped using AI Studio.*

---

<div align="center">

<br />

Built so you never lose track of your reading journey.

<br />

</div>
