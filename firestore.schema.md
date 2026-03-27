# NaMo Care Companion Firestore Schema

This schema is optimized for LINE webhook processing, behavioral monitoring, caregiver alerts, and scheduler-driven reminders.

All timestamps use Firestore `Timestamp` in UTC.

## 1) `users/{userId}`

Purpose: Elder profile, consent, settings, risk state.

Required fields:

- `lineUserId` string
- `displayName` string
- `timezone` string (`Asia/Bangkok`)
- `language` string (`th` or `en`)
- `caregiverIds` string[]
- `status` string (`active` | `paused` | `inactive`)
- `registeredAt` Timestamp
- `lastActiveAt` Timestamp
- `consent` map:
  - `elderlyAcceptedAt` Timestamp | null
  - `caregiverAcceptedAt` Timestamp | null
  - `version` string
  - `revokedAt` Timestamp | null
- `settings` map:
  - `dailyCheckinTime` string (`HH:mm`)
  - `inactivityThresholdHours` number
  - `reminderEnabled` boolean
  - `emotionAlertEnabled` boolean
- `riskProfile` map:
  - `currentScore` number (0-100, weighted aggregate of behaviorSignals)
  - `trend` string (`rising` | `stable` | `falling`)
  - `computedAt` Timestamp
  - `signalCount` number
- `linkedCaregiverId` string | null (set by frontend caregiver linking)
- `caregiverLineId` string | null (LINE User ID of linked caregiver, set by frontend)

## 2) `caregivers/{caregiverId}`

Purpose: Family/caregiver profile and notification preferences.

Required fields:

- `lineUserId` string
- `displayName` string
- `relationship` string
- `linkedUserIds` string[]
- `alertPreferences` map:
  - `emergency` boolean
  - `medication` boolean
  - `inactivity` boolean
  - `emotion` boolean
  - `dailySummary` boolean
  - `summaryTime` string (`HH:mm`)
- `registeredAt` Timestamp

## 3) `medicationSchedules/{scheduleId}`

Purpose: Medication schedule definitions for scheduler jobs.

Required fields:

- `userId` string
- `name` string
- `dosage` string
- `times` string[] (`HH:mm`)
- `daysOfWeek` number[] (`0..6`)
- `confirmationRequired` boolean
- `isActive` boolean
- `nextReminderAt` Timestamp
- `createdAt` Timestamp
- `updatedAt` Timestamp

## 4) `remindersLog/{logId}`

Purpose: Execution log for medication/routine reminders and adherence.

Required fields:

- `userId` string
- `scheduleId` string | null
- `type` string (`medication` | `routine`)
- `scheduledAt` Timestamp
- `sentAt` Timestamp
- `status` string (`pending` | `taken` | `missed` | `snoozed`)
- `confirmedAt` Timestamp | null
- `followUpCount` number
- `alertedCaregiver` boolean
- `updatedAt` Timestamp

## 5) `conversationLogs/{messageId}`

Purpose: Conversation audit and NLP/emotion analysis results.

Required fields:

- `userId` string
- `role` string (`user` | `assistant`)
- `message` string
- `messageType` string (`text` | `voice`)
- `createdAt` Timestamp
- `sessionId` string
- `analysis` map:
  - `intent` string
  - `sentiment` string (`positive` | `neutral` | `negative`)
  - `emotionLabel` string (`happy` | `neutral` | `sad` | `distress`)
  - `emotionScore` number (`0..1`)
  - `emergencyFlag` boolean
  - `riskKeywords` string[]

## 6) `behaviorSignals/{signalId}`

Purpose: Derived behavioral insights used for risk scoring.

Required fields:

- `userId` string
- `signalType` string (`silence` | `emotion` | `adherence` | `checkin`)
- `score` number (`0..100`)
- `severity` string (`low` | `medium` | `high` | `critical`)
- `sourceRefs` string[]
- `windowStart` Timestamp
- `windowEnd` Timestamp
- `computedAt` Timestamp

## 7) `alerts/{alertId}`

Purpose: Risk events sent to caregivers.

Required fields:

- `userId` string
- `caregiverIds` string[]
- `type` string (`emergency` | `inactivity` | `emotion` | `medication_missed` | `no_checkin`)
- `severity` string (`low` | `medium` | `high` | `critical`)
- `title` string
- `detail` string
- `sourceMessage` string | null
- `triggeredAt` Timestamp
- `sentAt` Timestamp | null
- `status` string (`open` | `acknowledged` | `resolved`)
- `acknowledgedBy` string | null
- `acknowledgedAt` Timestamp | null
- `resolvedAt` Timestamp | null
- `dedupeKey` string

## 8) `dailyCheckins/{checkinId}`

Purpose: Daily wellbeing check-in status.

Required fields:

- `userId` string
- `dateKey` string (`YYYY-MM-DD`)
- `scheduledAt` Timestamp
- `sentAt` Timestamp
- `respondedAt` Timestamp | null
- `status` string (`pending` | `responded` | `no_response`)
- `response` map:
  - `text` string | null
  - `wellbeing` string | null
  - `emotionLabel` string | null
  - `emotionScore` number | null
- `alertTriggered` boolean
- `updatedAt` Timestamp

## 9) `users/{userId}/vitalRecords/{recordId}`

Purpose: Vital signs recorded directly from the web app (blood pressure, heart rate, blood sugar).
Written by: Frontend app. Read by: elderly user only.

Required fields:

- `userId` string
- `type` string (`bloodPressure` | `heartRate` | `bloodSugar`)
- `values` map (field names depend on type, e.g. `systolic`, `diastolic`, `value`)
- `evaluation` map (`status`, `text`, `color`)
- `timestamp` string (ISO 8601)
- `dateKey` string (`YYYY-MM-DD`)
- `savedAt` string (ISO 8601, set by frontend)

## 10) `users/{userId}/moodEntries/{entryId}`

Purpose: Mood check-ins recorded from the web app.
Written by: Frontend app. Read by: elderly user only.

Required fields:

- `userId` string
- `mood` string (`happy` | `neutral` | `sad` | `anxious` | `pain`)
- `emoji` string
- `label` string (Thai label)
- `note` string (optional journal text)
- `dharma` string (Dharma quote shown)
- `timestamp` string (ISO 8601)
- `dateKey` string (`YYYY-MM-DD`)
- `time` string (Thai formatted time)
- `savedAt` string (ISO 8601, set by frontend)

## 11) `users/{userId}/medStatus/{dateKey}`

Purpose: Daily medication completion status from web app (keyed by `YYYY-MM-DD`).
Written by: Frontend app. Read by: elderly user only.

Fields:

- `{medId}` boolean (one field per medication ID, true = taken)
- `updatedAt` string (ISO 8601)

## 12) `caregivers/{caregiverId}` — Frontend-Written Linking

Purpose: Caregiver profile created/updated from the web app (ProfileSettings caregiver linking UI).
Note: caregiverId = `cg_{userId}` when written by frontend (deterministic, idempotent).

Required fields (frontend-written):

- `lineUserId` string (caregiver's LINE User ID, entered by elderly user)
- `linkedUserIds` string[] (contains the elderly user's anonymous Firebase UID)
- `registeredAt` string (ISO 8601)

Note: Backend webhook will look up caregivers via `linkedUserIds array-contains userId` — this allows
frontend-linked caregivers to receive LINE Bot alerts automatically.

## 13) `sos_events/{eventId}`

Purpose: Emergency SOS events triggered from the web app's SOS button.
Written by: Frontend app.

Required fields:

- `patient` map: `uid`, `displayName`, `lineId`
- `caregiver` map: `emergencyPhone`
- `vitals` map: latest BP/HR/bloodSugar values
- `location` map: `status`, `latitude`, `longitude`, `accuracyMeters`, `error`
- `lastSync` string
- `triggeredBy` string (`elderly_app`)
- `source` string (`line-liff`)
- `triggeredAt` string (ISO 8601)

## Relationships

- `users.caregiverIds[] -> caregivers`
- `caregivers.linkedUserIds[] -> users`
- `caregivers/{cg_userId}.linkedUserIds -> users` (frontend-written link)
- `medicationSchedules.userId -> users`
- `remindersLog.userId -> users`
- `conversationLogs.userId -> users`
- `behaviorSignals.userId -> users`
- `alerts.userId -> users`
- `alerts.caregiverIds[] -> caregivers`
- `dailyCheckins.userId -> users`

## Write Patterns

- Webhook appends to:
  - `conversationLogs`
  - `behaviorSignals` (when needed)
  - `alerts` (when risk detected)
- Webhook updates:
  - `users.lastActiveAt`
  - `remindersLog.status` on medication confirmation
  - `dailyCheckins.status` on check-in reply
- Scheduler writes:
  - `remindersLog`
  - `dailyCheckins`
  - `behaviorSignals` (medication_missed adherence signal)
  - `alerts` (when medication missed threshold reached)
  - `users.riskProfile` (computeAndSaveRiskScore after each signal)
- Frontend writes:
  - `users/{uid}/vitalRecords/`, `moodEntries/`, `medStatus/`
  - `caregivers/{cg_uid}` (caregiver linking)
  - `medicationSchedules` (add/edit/delete from MedicationManage)
  - `sos_events` (SOS button)
  - `alerts.status = acknowledged` (CaregiverDashboard acknowledge button)

## Offline Sync Queue

Frontend uses `namo_sync_queue` localStorage key to queue failed Firestore writes.
Queue is flushed automatically when `navigator.onLine` transitions from false → true.
Maximum 50 items kept in queue; FIFO eviction when full.
