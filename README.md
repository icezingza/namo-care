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
