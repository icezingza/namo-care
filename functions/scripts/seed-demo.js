"use strict";

/**
 * Seed demo data for NaMo Care Companion.
 *
 * Usage:
 *   node scripts/seed-demo.js
 *
 * Optional env:
 *   DEMO_ELDERLY_LINE_USER_ID=Uxxxxxxxx
 *   DEMO_CAREGIVER_LINE_USER_ID=Uyyyyyyyy
 *   DEMO_ELDERLY_NAME="คุณยายสมศรี"
 *   DEMO_CAREGIVER_NAME="ลูกสาวสมใจ"
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { Timestamp, FieldValue } = admin.firestore;

function getEnv(name, fallback) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
}

function inMinutes(minutes) {
  return Timestamp.fromMillis(Date.now() + minutes * 60 * 1000);
}

async function seed() {
  const elderlyId = getEnv("DEMO_ELDERLY_LINE_USER_ID", "U_DEMO_ELDERLY_001");
  const caregiverId = getEnv("DEMO_CAREGIVER_LINE_USER_ID", "U_DEMO_CAREGIVER_001");
  const elderlyName = getEnv("DEMO_ELDERLY_NAME", "คุณยายสมศรี");
  const caregiverName = getEnv("DEMO_CAREGIVER_NAME", "ลูกสาวสมใจ");

  const now = Timestamp.now();

  await db.collection("users").doc(elderlyId).set(
    {
      lineUserId: elderlyId,
      displayName: elderlyName,
      timezone: "Asia/Bangkok",
      language: "th",
      caregiverIds: [caregiverId],
      status: "active",
      registeredAt: now,
      lastActiveAt: now,
      consent: {
        elderlyAcceptedAt: now,
        caregiverAcceptedAt: now,
        version: "v1",
        revokedAt: null
      },
      settings: {
        dailyCheckinTime: "20:00",
        inactivityThresholdHours: 6,
        reminderEnabled: true,
        emotionAlertEnabled: true
      },
      riskProfile: {
        currentScore: 30,
        trend: "stable",
        updatedAt: now
      },
      updatedAt: now
    },
    { merge: true }
  );

  await db.collection("caregivers").doc(caregiverId).set(
    {
      lineUserId: caregiverId,
      displayName: caregiverName,
      relationship: "daughter",
      linkedUserIds: FieldValue.arrayUnion(elderlyId),
      alertPreferences: {
        emergency: true,
        medication: true,
        inactivity: true,
        emotion: true,
        dailySummary: true,
        summaryTime: "21:00"
      },
      registeredAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  const medScheduleRef = db.collection("medicationSchedules").doc(`med_${elderlyId}_bp`);
  await medScheduleRef.set(
    {
      userId: elderlyId,
      name: "ยาความดัน",
      dosage: "1 เม็ด",
      times: ["08:00", "20:00"],
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      confirmationRequired: true,
      isActive: true,
      nextReminderAt: inMinutes(2),
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  const checkinDateKey = new Date().toISOString().slice(0, 10);
  await db.collection("dailyCheckins").doc(`${elderlyId}_${checkinDateKey}`).set(
    {
      userId: elderlyId,
      dateKey: checkinDateKey,
      scheduledAt: now,
      sentAt: now,
      respondedAt: null,
      status: "pending",
      response: {
        text: null,
        wellbeing: null,
        emotionLabel: null,
        emotionScore: null
      },
      alertTriggered: false,
      updatedAt: now
    },
    { merge: true }
  );

  await db.collection("remindersLog").add({
    userId: elderlyId,
    scheduleId: medScheduleRef.id,
    type: "medication",
    scheduledAt: inMinutes(-10),
    sentAt: inMinutes(-10),
    status: "pending",
    confirmedAt: null,
    followUpCount: 0,
    alertedCaregiver: false,
    updatedAt: now,
    metadata: {
      seeded: true
    }
  });

  await db.collection("conversationLogs").add({
    userId: elderlyId,
    role: "assistant",
    message: "สวัสดีค่ะ วันนี้เป็นอย่างไรบ้างคะ",
    messageType: "text",
    createdAt: now,
    sessionId: `sess_${checkinDateKey}_${elderlyId.slice(0, 8)}`,
    analysis: {
      intent: "small_talk",
      sentiment: "neutral",
      emotionLabel: "neutral",
      emotionScore: 0.3,
      emergencyFlag: false,
      riskKeywords: []
    }
  });

  console.log("Seed completed.");
  console.log({
    elderlyId,
    caregiverId,
    medicationScheduleId: medScheduleRef.id,
    nextReminderAt: "about +2 minutes from now"
  });
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
