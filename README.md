# NaMo Care 🙏 — Digital Health & Soul Guardian

> ดูแลสุขภาพกายและใจ ด้วยความเมตตา 💛  
> A compassionate digital companion for elderly health monitoring with Dharma-based emotional support.

![NaMo Care](https://img.shields.io/badge/NaMo%20Care-v1.0%20Premium-E67E22?style=for-the-badge&logo=heart&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss)

## ✨ Features

### 🏠 Karuna Dashboard
- Time-based AI greeting from "NaMo" companion
- Real-time vital signs (BP, Heart Rate, Blood Sugar)
- 🆘 Emergency SOS with GPS simulation
- 💧 Daily water intake tracker
- 🙏 Daily Dharma wisdom card

### ❤️ Emotional & Dharma Engine
- 5-mood check-in: Happy, Sad, Neutral, Anxious, Pain
- Dharma Whisper cards (Thai/English Buddhist quotes)
- Mudita celebration for happy moods
- 📝 Journal notes with localStorage persistence

### 🧘 Meditation & Mindfulness
- 3 guided programs: Calm Breathing, Loving-Kindness, Sleep Prep
- Animated breathing circle with phase tracking
- Thai Buddhist mantras

### 💊 Medication Tracker
- Daily medication list grouped by time
- Tap-to-toggle with animated checkmarks
- Persistent across sessions (localStorage)

### 📈 Health Analytics (PIN-Protected)
- Blood Pressure trend chart (7 days)
- Mood/Emotional Weather chart (7 days)

### 📋 Vitals Recording
- Manual input for BP, Heart Rate, Blood Sugar
- Real-time evaluation with status badges

### 👤 Profile & Settings
- Editable emergency contact
- Setting toggles (notifications, dark mode, SOS)

## 🎨 Design System: "Saffron & Serenity"

| Token | Color | Meaning |
|-------|-------|---------|
| Primary | `#E67E22` | Warm Saffron (Monk robes/Wisdom) |
| Background | `#FDFBF7` | Cream/Off-White (Peace) |
| Text | `#2C3E50` | Dark Grey (High contrast) |

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open **http://localhost:5173**

## Firebase (SOS Write Pipeline)

For real SOS writes to Firestore, create `.env` from `.env.example` and fill real values:

```bash
cp .env.example .env
```

Required variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`

Current SOS flow:

1. Elder taps `Giant SOS Button`.
2. App collects latest vitals + geolocation (if allowed).
3. App writes an event to Firestore collection `sos_events` via `src/firebase.js`.
4. Cloud Functions can subscribe to this collection and push LINE alerts.

If env is missing, the app falls back to mock mode and logs SOS payload to console.

## LINE Backend (Functions)

LINE webhook + reminder/check-in/alert functions are in `functions/`.

- Local runbook: `functions/LOCAL_TEST.md`
- Main webhook function: `lineWebhook`
- Local test endpoints:
  - `healthCheck`
  - `seedCaregiverLink`
  - `testMedicationReminder`
  - `testCaregiverAlert`
- Demo data seed:
  - `cd functions && npm run seed:demo`
  - `cd functions && npm run seed:clean`
  - `cd functions && npm run seed:scenario -- distress`
- UAT docs:
  - `functions/UAT_CHECKLIST.md`
  - `functions/UAT_FIELD_NOTES_TEMPLATE.md`

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite 7
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Icons:** Lucide React
- **Persistence:** localStorage

## 📁 Project Structure

```
src/
├── App.jsx
├── index.css
├── hooks/useLocalStorage.js
├── data/
│   ├── dharma_quotes.js
│   └── mockData.js
└── components/
    ├── LoginScreen.jsx
    ├── PinLock.jsx
    ├── Dashboard.jsx
    ├── MoodTracker.jsx
    ├── MedicationTracker.jsx
    ├── MeditationTimer.jsx
    ├── RecordVitals.jsx
    ├── HealthAnalytics.jsx
    └── ProfileSettings.jsx
```

## 🙏 Philosophy

Built on the Four Brahmaviharas: Metta, Karuna, Mudita, Upekkha.

---

*Built with ❤️ and Dharma*
