<div align="center">

<img src="docs/media/hero.svg" alt="BookShelf — digitise your physical library and track your reading" width="100%">

<p>
  <img alt="React" src="https://img.shields.io/badge/React-Vite-d99a4e?style=for-the-badge&labelColor=100c09">
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-shelf%20vision-7fb38f?style=for-the-badge&labelColor=100c09">
  <img alt="Open Library" src="https://img.shields.io/badge/catalogue-Open%20Library-e46f5c?style=for-the-badge&labelColor=100c09">
  <img alt="Languages" src="https://img.shields.io/badge/UI-TR%20%2F%20EN-d99a4e?style=for-the-badge&labelColor=100c09">
</p>

<p><em>A React app that bridges your physical bookshelf and your reading habits.<br>
Scan a shelf or a barcode, log your sessions and watch your library and streaks grow.</em></p>

</div>

<img src="docs/media/divider.svg" width="100%" alt="">

## Features

| | |
|---|---|
| **Shelf scanner** | Point the camera at a shelf; a server-side Gemini vision endpoint returns every readable spine. |
| **ISBN / QR scanner** | Live barcode decoding resolved against the Open Library catalogue. |
| **Catalogue search** | Debounced Open Library search for manual entry and low-confidence spines. |
| **Smart pacing** | The exact time left to finish a book, from the seconds you log per percent. |
| **Streaks and milestones** | Consecutive reading days with animated milestone toasts. |
| **Library and shelves** | Unread, Reading and Read, custom shelf strips, filters and sorting. |
| **Recommendations** | New titles suggested from the authors and genres you already own. |
| **Dashboards** | A monthly goal ring, weekly reading lines and library growth. |
| **Ambient reading mode** | A full-screen timer with rain, fireplace and library soundscapes synthesised in Web Audio. |
| **Cloud sync** | Optional Google sign-in with Firestore and a timestamp-based merge. |

<img src="docs/media/divider.svg" width="100%" alt="">

## How it fits together

```mermaid
flowchart LR
  CAM[Camera frame] --> API[server.ts · Express] --> G[Gemini vision<br/>spine list]
  BAR[Barcode Detection · ZXing] --> OL[Open Library]
  G --> OL
  OL --> LIB[Library state]
  LIB <--> LS[(Local storage)]
  LIB <--> FS[(Firestore · optional)]
  LIB --> DASH[Dashboards · Recharts]
```

<img src="docs/media/divider.svg" width="100%" alt="">

## Türkçe özet

**BookShelf**, fiziksel kitaplığını dijitalleştirip okuma alışkanlıklarını takip etmeni sağlayan bir React uygulaması. Kamerayı rafa tutunca Gemini görüş modeli kitap sırtlarını okuyor; barkod okutarak da kitap eklenebiliyor. Okuma süresine göre kitabı bitirmene ne kadar kaldığını hesaplıyor, günlük seri ve aylık hedef grafikleri tutuyor, ortam sesli bir okuma modu sunuyor. Google ile giriş yapıp eşitleme isteğe bağlı; arayüz Türkçe ve İngilizce.

<img src="docs/media/divider.svg" width="100%" alt="">

## Development

```sh
npm install
cp .env.example .env.local   # GEMINI_API_KEY, Firebase config
npm run dev                  # Express + Vite
npm test                     # vitest
npm run build && npm start
```

```
src/components/   scanner, library, shelves, dashboards, reading mode
src/services/     Open Library, Gemini client, sync, storage
src/i18n/         Turkish and English
src/server/       vision endpoint
src/__tests__/    unit and component tests
```

<div align="center">
<br>
<a href="https://github.com/kutluhangil"><img src="docs/media/signature.svg" width="100%" alt="Built by kutluhangil"></a>
<sub>For the books you own and the ones you are still reading.</sub>
</div>
