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
| 📸 **Shelf Scanner** | Bulk-imports physical books by analyzing an image of your bookshelf. Detects spines, extracts titles via OCR simulation, and groups them. |
| 🏷️ **ISBN Scanner** | Single-book rapid entry. Centers a barcode viewfinder and bypasses bulk review for immediate reading. |
| ⏱️ **Smart Pacing (ETR)** | Calculates exact hours/minutes left to finish a book based on the total seconds logged per percentage point in your Reading Sessions. |
| 🔥 **Watch Streak & Milestones** | Calculates consecutive reading days. Fires beautifully animated Toast notifications at 7-day intervals and 5-book completion milestones. |
| 📚 **Library & Shelves** | 3 statuses (Unread, Reading, Read) · Custom visual shelf strips · Filtering by status and sorting (Author, Title, Recent, Physical Order). |
| 🔮 **Recommendations** | Analyzes your current library to suggest new titles based on matched authors and genres, instantly addable to your backlog. |
| 📊 **Dashboards** | Includes a Monthly Goal radial chart, Weekly Reading line charts, Library Growth stats, and a Spike Accuracy dashboard for the scanning engine. |
| 👆 **Haptic Feedback** | Integrated simulated haptics for a tactile, app-like feel on every button press, scan, and milestone achievement. |

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
│   ├── data/                   # Initial mock data and recommendation catalogs
│   ├── services/               # Core business logic (Clustering, Haptics)
│   ├── utils/                  # Helper functions (e.g., streak calculation)
│   ├── App.tsx                 # Main application state and router
│   ├── index.css               # Tailwind & global styles
│   └── types.ts                # TypeScript interfaces (Book, Shelf, ReadingSession)
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🚀 Setup

### Requirements
- Node.js `>= 18`
- `npm` or `pnpm`

```bash
# Clone the repository
git clone https://github.com/yourusername/bookshelf.git
cd bookshelf

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Command card

| Command | What it does |
|---|---|
| `npm run dev` | Starts Vite development server (`localhost:3000` or `5173`) |
| `npm run build` | Builds the app for production into `dist/` |
| `npm run preview` | Previews the production build locally |

---

## 📈 Status

| Area | State |
|---|:-:|
| Core Library (CRUD, Sorting, Shelves) | ✅ |
| Scanning Pipeline (Shelf + ISBN modes) | ✅ |
| Reading Analytics (Sessions, Pace, ETR) | ✅ |
| Dashboards (Goals, Calendars, Growth) | ✅ |
| Gamification (Streaks, Milestone Toasts) | ✅ |
| Local Recommendation Engine | ✅ |
| Cloud Persistence (Supabase/Firebase) | ⬜ Planned |
| Mobile Native Port (React Native) | ⬜ Planned |

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
