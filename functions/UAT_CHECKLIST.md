# NaMo Care Companion - UAT Checklist

Use this checklist during pilot testing (3-5 elderly users first).

## Test Metadata

- Date:
- Environment: `local-emulator` / `firebase-prod`
- Tester:
- Project ID:
- LINE OA:
- Build/Commit:

## Exit Criteria (Go/No-Go)

- [ ] Webhook receives events reliably
- [ ] AI replies within acceptable time (target < 3s for normal text)
- [ ] Medication reminder can be sent and confirmed
- [ ] Emergency keyword triggers caregiver alert
- [ ] No-checkin escalation works
- [ ] Inactivity alert works
- [ ] Elderly users can complete core flow without assistance

## Core Scenarios

### S01 - Webhook Handshake

- [ ] LINE webhook verify succeeds in LINE Console
- [ ] Message from user reaches webhook logs
- [ ] Response status is `200`

Evidence:

- Webhook URL used:
- Screenshot/log:

### S02 - Basic Conversation Reply

Steps:

1. Elderly user sends: `สวัสดี`
2. Wait for assistant reply

Expected:

- [ ] Assistant replies with friendly text
- [ ] `conversationLogs` has new `user` and `assistant` records
- [ ] `users.lastActiveAt` is updated

Evidence:

- User ID:
- Conversation log IDs:

### S03 - Medication Reminder Send

Steps:

1. Call `testMedicationReminder`
2. Check LINE chat for reminder text

Expected:

- [ ] Reminder message received on elderly LINE
- [ ] `remindersLog` created with `status = pending`

Evidence:

- API response ID:
- `remindersLog` doc ID:

### S04 - Medication Confirmation

Steps:

1. After S03, elderly replies: `กินยาแล้ว`
2. Wait assistant response

Expected:

- [ ] Assistant confirms medication recorded
- [ ] Latest pending `remindersLog` updated to `status = taken`
- [ ] `confirmedAt` is set

Evidence:

- Updated doc ID:
- Before/after status:

### S05 - Emergency Keyword Alert

Steps:

1. Elderly sends: `ช่วยด้วย` (or `ไม่ไหว`, `เวียนหัว`)

Expected:

- [ ] Immediate emergency response to elderly
- [ ] Alert created with `type = emergency`, `severity = critical`
- [ ] Caregiver receives LINE push alert

Evidence:

- Alert doc ID:
- Caregiver line user ID:

### S06 - Manual Caregiver Alert Endpoint

Steps:

1. Call `testCaregiverAlert`

Expected:

- [ ] Alert document created
- [ ] Caregiver receives notification
- [ ] `alerts.sentAt` is populated

Evidence:

- Alert ID:

### S07 - No Check-in Escalation

Steps:

1. Seed/check `dailyCheckins` as `pending`
2. Wait until escalation window (or seed scenario `no_checkin`)

Expected:

- [ ] `dailyCheckins.status` becomes `no_response`
- [ ] Alert created with `type = no_checkin`
- [ ] Caregiver receives alert

Evidence:

- Check-in doc ID:
- Alert doc ID:

### S08 - Inactivity Alert

Steps:

1. Seed scenario `inactivity` (or set old `lastActiveAt`)
2. Wait scheduler window

Expected:

- [ ] Alert created with `type = inactivity`
- [ ] Caregiver notified
- [ ] User monitoring timestamp updated

Evidence:

- User ID:
- Alert ID:

### S09 - Distress Pattern

Steps:

1. Seed scenario `distress` or send distress messages

Expected:

- [ ] `behaviorSignals` includes `signalType = emotion`
- [ ] High distress creates caregiver alert
- [ ] Assistant tone remains supportive (non-medical)

Evidence:

- Behavior signal ID:
- Alert ID:

## Elderly Usability Checks (Field Test)

For each participant:

- [ ] Understands bot messages without explanation
- [ ] Can respond to reminder/check-in independently
- [ ] Can trigger help phrase when needed
- [ ] Feels comfortable with tone (not robotic, not alarming)
- [ ] Willing to continue using daily

Notes:

- Confusing words:
- Interaction friction:
- Tone feedback:

## Daily Summary Acceptance

- [ ] Caregiver summary is clear and actionable
- [ ] Alert volume is not excessive
- [ ] False positive rate is acceptable for pilot

## Final Decision

- [ ] PASS pilot
- [ ] PASS with fixes
- [ ] FAIL (major blockers)

Blockers:

1.
2.
3.
