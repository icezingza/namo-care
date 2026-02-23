"use strict";

/**
 * Clean demo data for NaMo Care Companion.
 *
 * Usage:
 *   node scripts/clean-demo.js
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

function getEnv(name, fallback) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
}

async function deleteByQuery(collection, field, op, value) {
  const snapshot = await db.collection(collection).where(field, op, value).get();
  if (snapshot.empty) return 0;

  let deleted = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchCount += 1;
    deleted += 1;
    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deleted;
}

async function clean() {
  const elderlyId = getEnv("DEMO_ELDERLY_LINE_USER_ID", "U_DEMO_ELDERLY_001");
  const caregiverId = getEnv("DEMO_CAREGIVER_LINE_USER_ID", "U_DEMO_CAREGIVER_001");

  const removed = {};
  removed.remindersLog = await deleteByQuery("remindersLog", "userId", "==", elderlyId);
  removed.conversationLogs = await deleteByQuery("conversationLogs", "userId", "==", elderlyId);
  removed.behaviorSignals = await deleteByQuery("behaviorSignals", "userId", "==", elderlyId);
  removed.alerts = await deleteByQuery("alerts", "userId", "==", elderlyId);
  removed.dailyCheckins = await deleteByQuery("dailyCheckins", "userId", "==", elderlyId);
  removed.medicationSchedules = await deleteByQuery("medicationSchedules", "userId", "==", elderlyId);

  // Remove explicit schedule id used by seed-demo
  const fixedScheduleRef = db.collection("medicationSchedules").doc(`med_${elderlyId}_bp`);
  const fixedScheduleDoc = await fixedScheduleRef.get();
  if (fixedScheduleDoc.exists) {
    await fixedScheduleRef.delete();
    removed.fixedMedicationSchedule = 1;
  } else {
    removed.fixedMedicationSchedule = 0;
  }

  const userRef = db.collection("users").doc(elderlyId);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    await userRef.delete();
    removed.user = 1;
  } else {
    removed.user = 0;
  }

  const caregiverRef = db.collection("caregivers").doc(caregiverId);
  const caregiverDoc = await caregiverRef.get();
  if (caregiverDoc.exists) {
    await caregiverRef.delete();
    removed.caregiver = 1;
  } else {
    removed.caregiver = 0;
  }

  console.log("Clean demo completed.");
  console.log({ elderlyId, caregiverId, removed });
}

clean()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Clean demo failed:", error);
    process.exit(1);
  });
