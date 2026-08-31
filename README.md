# 🎬 Watch Party (Next.js 15 + React 19 + Supabase)

A modern, cinema-grade **Watch Party web application** built with **Next.js 15**, **React 19**, **Tailwind CSS**, and **Supabase Realtime**. Watch synchronized YouTube videos with friends in real-time, live chat, and send emoji reactions — no login required.

---

## 🌟 Key Features

- 🎥 **Synchronized YouTube Playback** — Sub-second playback synchronization (play, pause, seek) powered by Supabase Realtime broadcasts.
- 🔗 **Direct URL & Shorts Support** — Paste any YouTube video URL, `youtu.be` short link, or `/shorts/` link directly, or search via the YouTube API.
- 👥 **Private & Public Rooms** — Generate 6-digit room codes or share 1-click invite links.
- 💬 **Live Chat & Quick Reactions** — Real-time chat with 1-click emoji reactions (`🍿`, `🔥`, `❤️`, `👏`, `😂`, `🎉`, `😱`, `🥳`).
- 👑 **Host Control & Presence** — View who's online with avatar indicators and host/leader control toggle.
- 🎭 **Theater Mode** — Expand video container to full width for an immersive cinematic experience.
- 🧪 **Comprehensive Test Suite** — Fully covered with Vitest and React Testing Library tests.

---

## ⚙️ Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components & Client Hydration)
- **UI & Styling:** React 19, Tailwind CSS v4, Radix UI, Lucide Icons, Framer Motion
- **Real-Time Backend:** Supabase Realtime (Presence & Broadcast channels)
- **Video Player:** `react-youtube` / YouTube IFrame API
- **Testing:** Vitest, React Testing Library, JSDOM

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/abulhasan-18/Watch-party.git
cd Watch-party
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
```

### 4. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Automated Tests

Run the full Vitest test suite:
```bash
npm run test
```

Run tests in watch mode:
```bash
npm run test:watch
```

---

## 📦 Building for Production

```bash
npm run build
npm run start
```
