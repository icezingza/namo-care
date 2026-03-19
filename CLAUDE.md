# CLAUDE.md — NaMo Care

## Project Overview

NaMo Care เป็น digital health platform สำหรับดูแลผู้สูงอายุในประเทศไทย ผ่าน 2 ช่องทางหลัก: React web dashboard สำหรับญาติ/ผู้ดูแล และ LINE Bot สำหรับผู้สูงอายุที่ใช้ LINE อยู่แล้ว ทั้งสองระบบใช้ Firestore ร่วมกัน

Optimize เพื่อ:
- UX ที่เรียบง่ายและปลอดภัยสำหรับผู้สูงอายุ (ตัวใหญ่, emoji, ภาษาไทย, navigation น้อย)
- ความน่าเชื่อถือของ alerts — ไม่มี false negative ในสถานการณ์ฉุกเฉิน
- Offline resilience — frontend ต้องทำงานได้แม้ Firestore ไม่พร้อม

ปรัชญา: ออกแบบด้วยหลักพรหมวิหาร 4 (เมตตา กรุณา มุทิตา อุเบกขา) — ความเมตตาฝังอยู่ในทุก UX decision และ AI response

## Tech Stack

**Frontend:**
- React 19 + Vite 7
- Tailwind CSS 4 (via `@tailwindcss/vite` — ไม่ใช่ PostCSS plugin เดิม)
- Lucide React (icons)
- Recharts (charts)
- Firebase SDK 12 (Firestore)
- react-router-dom 7

**Backend (Firebase Cloud Functions):**
- Node.js 20, TypeScript 5.9 (strict mode)
- LINE Bot SDK 9.7
- Firebase Admin 13 + Firebase Functions 6

**ห้าม introduce** โดยไม่มี explicit request:
- Redux, Zustand, MobX, หรือ state management library อื่น
- CSS-in-JS (styled-components, Emotion)
- Component libraries (MUI, Ant Design, Chakra)
- Testing framework ใหม่ (Jest, Vitest ยังไม่ได้ configure)

## Architecture

```
namo-care/
├── src/                      # React frontend
│   ├── components/           # Feature components (1 file = 1 tab/screen)
│   ├── hooks/                # Custom hooks (useLocalStorage)
│   ├── data/                 # Static data, mock data, Dharma quotes
│   ├── App.jsx               # Root: tab navigation
│   ├── firebase.js           # Firestore gateway (+ localStorage fallback)
│   └── index.css             # Tailwind base + design tokens (CSS vars)
├── functions/src/            # Cloud Functions backend
│   ├── webhook/              # LINE webhook entry + event router
│   ├── handlers/             # Message handler, emergency handler
│   ├── schedulers/           # Scheduled jobs (medication, checkin, inactivity)
│   ├── services/             # firestoreService.ts, lineService.ts (ทุก I/O ผ่านที่นี่)
│   ├── ai/                   # emotionAnalyzer.ts
│   ├── notifications/        # alertDispatcher.ts
│   ├── utils/                # emergencyKeywords.ts
│   ├── debug/                # localTestEndpoints.ts (dev only)
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── config.ts             # requireEnv() / optionalEnv()
│   └── index.ts              # Function exports (Firebase convention)
├── firestore.rules           # Security rules
├── firestore.indexes.json    # Composite indexes
└── firestore.schema.md       # Data model reference
```

Rules:
- Frontend API calls ผ่าน `firebase.js` เท่านั้น
- Backend Firestore access ผ่าน `firestoreService.ts` เท่านั้น
- Backend LINE API calls ผ่าน `lineService.ts` เท่านั้น
- Feature ใหม่ใน frontend → component ใหม่ใน `components/`, register ใน `App.jsx`
- Scheduled job ใหม่ → สร้างใน `schedulers/`, export ผ่าน `index.ts`

## Coding Conventions

**Backend (TypeScript):**
- Strict mode — ห้ามใช้ `any`
- `async/await` เท่านั้น — ไม่ใช้ `.then()` chain
- ใช้ `requireEnv()` สำหรับ mandatory env vars, `optionalEnv()` สำหรับ optional — ห้าม `process.env.X` โดยตรง
- Named exports ทุกอย่าง ยกเว้น Firebase function exports ใน `index.ts`
- Component/function file ไม่เกิน 200 บรรทัด ถ้าเกินให้ split

**Frontend (JavaScript/JSX):**
- Functional components + hooks เท่านั้น — ไม่มี class components
- ชื่อ component: PascalCase (`MoodTracker`, `Dashboard`)
- State: `useState` / `useEffect` / `useLocalStorage` custom hook
- ห้ามใส่ side effects ใน presentational components
- Comment เฉพาะตรงที่ intent ไม่ชัดเจน — ไม่ comment สิ่งที่อ่านรู้อยู่แล้ว

**Shared:**
- Date keys: `YYYY-MM-DD` (ISO 8601)
- Intent types: `medication_confirm | checkin_response | small_talk | distress_expression | unknown`
- Emotion labels: `happy | neutral | sad | distress`
- Severity: `low | medium | high | critical`

## UI & Design System

- **ภาษา:** UI strings ทั้งหมดเป็นภาษาไทย — ห้ามมี English ที่ user เห็น
- **Design theme:** "Saffron & Serenity" — primary `#E67E22`, cream `#FDFBF7`, ink `#2C3E50`
- **Layout:** Mobile-first, container max-width `512px`
- **Icons:** ใช้ `lucide-react` เท่านั้น — ห้าม import icon library อื่น
- **Spacing:** Tailwind utility classes — ห้ามเขียน custom CSS ในไฟล์ใหม่ (CSS vars ทั้งหมดอยู่ใน `index.css`)
- **ผู้สูงอายุ UX:** ตัวอักษรใหญ่, contrast สูง, emoji ช่วย context, ปุ่มใหญ่, navigation เรียบง่าย
- **Error states:** ห้ามแสดง technical error แก่ผู้ใช้ — ใช้ fallback หรือ friendly message เสมอ
- **Interactive elements:** ทุก element ต้องมี hover + focus state

## Content & Copy

- ภาษาไทยทั้งหมด — อบอุ่น สั้น ชัดเจน ไม่เป็นทางการ
- ข้อความ error: บอกว่าต้องทำอะไร — ไม่ใช่แค่บอกว่าผิด
- SOS/Emergency messages: ชัดเจน กระชับ ไม่ให้ผู้สูงอายุสับสน
- LINE Bot replies: ใช้ภาษาที่ผู้สูงอายุคุ้นเคย, emoji ช่วย tone
- ห้ามใช้: ศัพท์ technical, Jargon, ประโยคยาวเกิน 2 บรรทัด
- Dharma quotes: ใช้จาก `src/data/dharma_quotes.js` — ห้ามเพิ่ม quotes ใหม่โดยพลการ

## Testing & Quality

ก่อนถือว่า task เสร็จ:
- `npm run lint` (root) ผ่าน
- `cd functions && npm run build` compile ได้ไม่มี TypeScript error

Rules:
- ไม่มี test framework — ทดสอบผ่าน Firebase Emulator + debug endpoints
- ฟีเจอร์ใหม่ทุกอย่างต้องทดสอบ manual ผ่าน emulator ก่อน deploy
- ตรวจสอบ 3 states เสมอ: loading, success, error (หรือ offline fallback)
- Emergency/alert flow: ต้อง verify end-to-end ก่อน deploy ทุกครั้ง — ไม่มี false negative ที่ยอมรับได้
- Scheduler changes: ต้อง test ผ่าน `npm run seed:scenario` + เฝ้า logs

## File Placement

| ต้องสร้าง/แก้อะไร | ไปที่ |
|---|---|
| Tab/screen ใหม่ใน frontend | `src/components/` + register ใน `App.jsx` |
| Custom hook | `src/hooks/` |
| Static/mock data | `src/data/` |
| Firestore read/write (frontend) | `src/firebase.js` |
| LINE message handler | `functions/src/handlers/messageHandler.ts` |
| Scheduled job ใหม่ | `functions/src/schedulers/` + export ใน `index.ts` |
| Firestore CRUD (backend) | `functions/src/services/firestoreService.ts` |
| LINE API call | `functions/src/services/lineService.ts` |
| TypeScript interface/type | `functions/src/types.ts` |
| Emergency keyword (Thai) | `functions/src/utils/emergencyKeywords.ts` |
| Debug/test endpoint | `functions/src/debug/localTestEndpoints.ts` |

Rules:
- แก้ component เดิมก่อนสร้างใหม่ที่คล้ายกัน
- ห้าม abstract สิ่งที่ใช้ครั้งเดียว
- ชื่อไฟล์ component ต้องตรงกับ exported name

## Safety Rules

- **ห้ามแก้** Firestore security rules (`firestore.rules`) โดยไม่ flag ก่อน
- **ห้ามแก้** `lineUserId` field — เป็น immutable identity anchor ใน Firestore
- **ห้ามแก้** emergency/SOS flow โดยไม่มี explicit request + test ครบ
- **ห้ามแก้** LINE webhook handler signature — อาจทำให้ LINE ส่ง event ไม่ได้
- **ห้ามเปลี่ยน** Firestore schema (เพิ่ม/ลบ fields หลัก) โดยไม่อัปเดต `firestore.schema.md` พร้อมกัน
- **ห้าม deploy** scheduler ใหม่โดยไม่ระบุ timing และ idempotency ให้ชัดเจน
- Architectural change ใด ๆ → describe ก่อน แล้วรอ approval

## Commands

**Frontend (root directory):**
```bash
npm install          # ติดตั้ง dependencies
npm run dev          # Dev server → http://localhost:5173
npm run build        # Build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint check
```

**Backend (functions/ directory):**
```bash
npm install          # ติดตั้ง dependencies
npm run build        # Compile TypeScript → lib/
npm run clean        # ลบ lib/
npm run lint         # ESLint TypeScript
npm run deploy       # Deploy functions to Firebase
npm run logs         # Tail Firebase function logs
npm run seed:demo    # Seed demo elderly + caregiver
npm run seed:clean   # Clean demo data
npm run seed:scenario # Seed UAT scenario (distress|medication_missed|no_checkin|inactivity|emergency)
```

**Firebase Emulator (root directory):**
```bash
firebase emulators:start --only functions,firestore
# Firestore → localhost:8080
# Functions → localhost:5001
```

**Deploy:**
```bash
firebase deploy                        # Deploy ทุกอย่าง
firebase deploy --only functions       # Functions อย่างเดียว
firebase deploy --only firestore:rules # Rules อย่างเดียว
```

## Security Rules

- **ห้าม commit** `.env`, `.env.local` หรือไฟล์ใด ๆ ที่มี secret — `.env.example` เท่านั้นที่ commit ได้ (ต้องเป็น placeholder)
- **ห้าม hardcode** API keys, tokens, passwords ใน source code
- **ห้าม log** sensitive data:
  - ห้าม `console.log` ที่มี LINE channel secret หรือ access token
  - ห้าม log full message content ของ user ใน production
  - ห้าม log Firestore user records แบบ full object
- **LINE credentials:**
  - `LINE_CHANNEL_SECRET` และ `LINE_CHANNEL_ACCESS_TOKEN` → server-side เท่านั้น (functions/.env)
  - ห้าม import หรือ reference ใน frontend code
- **Firebase config:**
  - `VITE_FIREBASE_*` → frontend ใช้ได้ (ออกแบบมาให้ public)
  - Firebase Admin credentials → ใช้ใน Cloud Functions เท่านั้น ผ่าน Application Default Credentials
- **Firestore RLS:** security rules ใน `firestore.rules` ต้อง enforce เสมอ — ห้าม bypass ด้วย Admin SDK ใน frontend
- **`LOCAL_TEST_KEY`:** ใช้สำหรับ debug endpoints เท่านั้น — ต้องตรวจสอบ key ทุก request ใน `localTestEndpoints.ts`
- Input validation: validate ทุก user input ฝั่ง server ก่อนถึง Firestore เสมอ
