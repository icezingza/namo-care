"use strict";

/**
 * Seed test scenarios for UAT.
 *
 * Usage:
 *   node scripts/seed-scenario.js distress
 *   node scripts/seed-scenario.js medication_missed
 *   node scripts/seed-scenario.js no_checkin
 *   node scripts/seed-scenario.js inactivity
 *   node scripts/seed-scenario.js emergency
 *   node scripts/seed-scenario.js all
 *
 * Optional env:
 *   DEMO_ELDERLY_LINE_USER_ID=Uxxxxxxxx
 *   DEMO_CAREGIVER_LINE_USER_ID=Uyyyyyyyy
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { Timestamp } = admin.firestore;

function getEnv(name, fallback) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
}

function minutesAgo(mins) {
  return Timestamp.fromMillis(Date.now() - mins * 60 * 1000);
}

async function ensureBaseDocs(elderlyId, caregiverId) {
  const now = Timestamp.now();

  await db.collection("users").doc(elderlyId).set(
    {
      lineUserId: elderlyId,
      displayName: "คุณยายสมศรี",
      timezone: "Asia/Bangkok",
      language: "th",
      caregiverIds: [caregiverId],
      status: "active",
      lastActiveAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  await db.collection("caregivers").doc(caregiverId).set(
    {
      lineUserId: caregiverId,
      displayName: "ลูกสาวสมใจ",
      relationship: "daughter",
      linkedUserIds: [elderlyId],
      alertPreferences: {
        emergency: true,
        medication: true,
        inactivity: true,
        emotion: true,
        dailySummary: true,
        summaryTime: "21:00"
      },
      updatedAt: now
    },
    { merge: true }
  );
}

async function addAlert({ elderlyId, caregiverId, type, severity, title, detail, sourceMessage = null }) {
  await db.collection("alerts").add({
    userId: elderlyId,
    caregiverIds: [caregiverId],
    type,
    severity,
    title,
    detail,
    sourceMessage,
    triggeredAt: Timestamp.now(),
    sentAt: Timestamp.now(),
    status: "open",
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedAt: null,
    dedupeKey: `${elderlyId}:${type}:${Date.now()}`
  });
}

async function scenarioDistress(elderlyId, caregiverId) {
  const now = Timestamp.now();
  const message = "วันนี้ผมรู้สึกไม่ไหวและเหงามาก";

  await db.collection("conversationLogs").add({
    userId: elderlyId,
    role: "user",
    message,
    messageType: "text",
    sessionId: `sess_${new Date().toISOString().slice(0, 10)}_${elderlyId.slice(0, 8)}`,
    createdAt: now,
    analysis: {
      intent: "distress_expression",
      sentiment: "negative",
      emotionLabel: "distress",
      emotionScore: 0.9,
      emergencyFlag: false,
      riskKeywords: ["ไม่ไหว", "เหงา"]
    }
  });

  await db.collection("behaviorSignals").add({
    userId: elderlyId,
    signalType: "emotion",
    score: 90,
    severity: "high",
    sourceRefs: [],
    windowStart: now,
    windowEnd: now,
    computedAt: now
  });

  await addAlert({
    elderlyId,
    caregiverId,
    type: "emotion",
    severity: "high",
    title: "Distress signal detected",
    detail: "Detected high emotional distress pattern from recent message."
  });
}

async function scenarioMedicationMissed(elderlyId, caregiverId) {
  const now = Timestamp.now();
  await db.collection("remindersLog").add({
    userId: elderlyId,
    scheduleId: `med_${elderlyId}_bp`,
    type: "medication",
    scheduledAt: minutesAgo(90),
    sentAt: minutesAgo(90),
    status: "missed",
    confirmedAt: null,
    followUpCount: 2,
    alertedCaregiver: true,
    updatedAt: now,
    metadata: {
      medicationName: "ยาความดัน",
      dosage: "1 เม็ด"
    }
  });

  await addAlert({
    elderlyId,
    caregiverId,
    type: "medication_missed",
    severity: "medium",
    title: "Medication not confirmed",
    detail: "No medication confirmation for the scheduled reminder window."
  });
}

async function scenarioNoCheckin(elderlyId, caregiverId) {
  const now = Timestamp.now();
  const dateKey = new Date().toISOString().slice(0, 10);
  await db.collection("dailyCheckins").doc(`${elderlyId}_${dateKey}`).set(
    {
      userId: elderlyId,
      dateKey,
      scheduledAt: minutesAgo(200),
      sentAt: minutesAgo(180),
      respondedAt: null,
      status: "no_response",
      response: {
        text: null,
        wellbeing: null,
        emotionLabel: null,
        emotionScore: null
      },
      alertTriggered: true,
      updatedAt: now
    },
    { merge: true }
  );

  await addAlert({
    elderlyId,
    caregiverId,
    type: "no_checkin",
    severity: "medium",
    title: "No daily check-in response",
    detail: "No response to daily check-in for more than 2 hours."
  });
}

async function scenarioInactivity(elderlyId, caregiverId) {
  const now = Timestamp.now();
  await db.collection("users").doc(elderlyId).set(
    {
      lastActiveAt: minutesAgo(9 * 60),
      monitoring: {
        lastInactivityAlertAt: null
      },
      updatedAt: now
    },
    { merge: true }
  );

  await db.collection("behaviorSignals").add({
    userId: elderlyId,
    signalType: "silence",
    score: 82,
    severity: "medium",
    sourceRefs: [],
    windowStart: minutesAgo(9 * 60),
    windowEnd: now,
    computedAt: now
  });

  await addAlert({
    elderlyId,
    caregiverId,
    type: "inactivity",
    severity: "medium",
    title: "Silence or inactivity detected",
    detail: "No activity from user for approximately 9 hours."
  });
}

async function scenarioEmergency(elderlyId, caregiverId) {
  const now = Timestamp.now();
  const emergencyMessage = "ช่วยด้วย เวียนหัวมาก";

  await db.collection("conversationLogs").add({
    userId: elderlyId,
    role: "user",
    message: emergencyMessage,
    messageType: "text",
    sessionId: `sess_${new Date().toISOString().slice(0, 10)}_${elderlyId.slice(0, 8)}`,
    createdAt: now,
    analysis: {
      intent: "distress_expression",
      sentiment: "negative",
      emotionLabel: "distress",
      emotionScore: 0.95,
      emergencyFlag: true,
      riskKeywords: ["ช่วยด้วย", "เวียนหัว"]
    }
  });

  await addAlert({
    elderlyId,
    caregiverId,
    type: "emergency",
    severity: "critical",
    title: "Emergency keyword detected",
    detail: "Emergency phrase received from elderly user.",
    sourceMessage: emergencyMessage
  });
}

async function run() {
  const scenario = (process.argv[2] || "distress").trim();
  const elderlyId = getEnv("DEMO_ELDERLY_LINE_USER_ID", "U_DEMO_ELDERLY_001");
  const caregiverId = getEnv("DEMO_CAREGIVER_LINE_USER_ID", "U_DEMO_CAREGIVER_001");

  await ensureBaseDocs(elderlyId, caregiverId);

  const tasks = {
    distress: () => scenarioDistress(elderlyId, caregiverId),
    medication_missed: () => scenarioMedicationMissed(elderlyId, caregiverId),
    no_checkin: () => scenarioNoCheckin(elderlyId, caregiverId),
    inactivity: () => scenarioInactivity(elderlyId, caregiverId),
    emergency: () => scenarioEmergency(elderlyId, caregiverId)
  };

  if (scenario === "all") {
    for (const name of Object.keys(tasks)) {
      await tasks[name]();
    }
    console.log("Seeded all scenarios.");
    console.log({ elderlyId, caregiverId, scenarios: Object.keys(tasks) });
    return;
  }

  if (!tasks[scenario]) {
    console.error(
      `Unknown scenario "${scenario}". Use one of: ${Object.keys(tasks).join(", ")}, all`
    );
    process.exit(1);
    return;
  }

  await tasks[scenario]();
  console.log("Seeded scenario.");
  console.log({ elderlyId, caregiverId, scenario });
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed scenario failed:", error);
    process.exit(1);
  });
