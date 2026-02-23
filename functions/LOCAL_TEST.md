# NaMo Care Companion - Local Test Runbook

This runbook validates these checkpoints first:

- Webhook receives LINE events
- LINE reply works
- Medication reminder can be sent
- Caregiver alert can be sent

UAT docs:

- `functions/UAT_CHECKLIST.md`
- `functions/UAT_FIELD_NOTES_TEMPLATE.md`

## 1) Prerequisites

- Node.js 20+ (project target is Node 20)
- Firebase CLI installed:
  - `npm i -g firebase-tools`
- LINE Official Account + Messaging API channel
- `ngrok` (or Cloudflare tunnel) for public webhook URL

## 2) Configure function env

Create `functions/.env.local`:

```env
LINE_CHANNEL_SECRET=your_line_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_line_access_token
LOCAL_TEST_KEY=your_local_test_key
```

## 3) Start emulators

From repo root:

```bash
cd functions
npm install
npm run build
cd ..
firebase emulators:start --only functions,firestore
```

Default URLs:

- Functions base: `http://127.0.0.1:5001/<project-id>/asia-southeast1`
- Firestore emulator: `127.0.0.1:8080`

In a new terminal, seed demo data:

```bash
cd functions
npm run seed:demo
```

Optional custom seed identities:

```bash
DEMO_ELDERLY_LINE_USER_ID=<elderly_line_user_id> \
DEMO_CAREGIVER_LINE_USER_ID=<caregiver_line_user_id> \
npm run seed:demo
```

Reset demo data:

```bash
cd functions
npm run seed:clean
```

Seed UAT scenarios:

```bash
cd functions
npm run seed:scenario -- distress
npm run seed:scenario -- medication_missed
npm run seed:scenario -- no_checkin
npm run seed:scenario -- inactivity
npm run seed:scenario -- emergency
npm run seed:scenario -- all
```

## 4) Expose webhook for LINE

Example with ngrok:

```bash
ngrok http 5001
```

Webhook URL in LINE console:

```text
https://<your-ngrok-id>.ngrok-free.app/<project-id>/asia-southeast1/lineWebhook
```

Then enable `Use webhook` and click `Verify`.

## 5) Smoke test endpoints

Replace:

- `<BASE>` = `http://127.0.0.1:5001/<project-id>/asia-southeast1`
- `<KEY>` = `LOCAL_TEST_KEY`

Health check:

```bash
curl "<BASE>/healthCheck"
```

Link caregiver to an elderly user (for alert tests):

```bash
curl -X POST "<BASE>/seedCaregiverLink" \
  -H "Content-Type: application/json" \
  -H "x-test-key: <KEY>" \
  -d "{\"userId\":\"<elderly_line_user_id>\",\"caregiverLineUserId\":\"<caregiver_line_user_id>\",\"caregiverDisplayName\":\"ลูกสาว\"}"
```

Send medication reminder now:

```bash
curl -X POST "<BASE>/testMedicationReminder" \
  -H "Content-Type: application/json" \
  -H "x-test-key: <KEY>" \
  -d "{\"userId\":\"<elderly_line_user_id>\",\"medicationName\":\"ยาความดัน\",\"dosage\":\"1 เม็ด\",\"scheduledTime\":\"08:00\"}"
```

Send caregiver alert now:

```bash
curl -X POST "<BASE>/testCaregiverAlert" \
  -H "Content-Type: application/json" \
  -H "x-test-key: <KEY>" \
  -d "{\"userId\":\"<elderly_line_user_id>\",\"type\":\"emotion\",\"severity\":\"medium\",\"title\":\"Test Alert\",\"detail\":\"ทดสอบระบบแจ้งเตือน\"}"
```

## 6) Behavioral checks in LINE

In elderly chat:

- Send normal text -> bot should reply.
- Send `"กินยาแล้ว"` -> bot should confirm and update latest pending medication log to `taken`.
- Send emergency phrase (`"ช่วยด้วย"`, `"ไม่ไหว"`) -> immediate emergency flow and caregiver alert.

## 7) Scheduled functions included

- `sendMedicationReminders` (every 5 min)
- `sendDailyCheckins` (every 15 min)
- `watchInactivitySignals` (every 30 min)
- `escalateNoResponseCheckins` (every 30 min)

For deterministic local testing, prefer manual test endpoints first.
