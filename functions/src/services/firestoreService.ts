import type { Firestore } from "firebase-admin/firestore";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { AlertPayload, CombinedAnalysis, Severity } from "../types";

interface EnsureUserInput {
  userId: string;
  displayName?: string;
}

export async function ensureUser(db: Firestore, input: EnsureUserInput): Promise<void> {
  const ref = db.collection("users").doc(input.userId);
  const snapshot = await ref.get();
  const now = Timestamp.now();

  if (!snapshot.exists) {
    await ref.set({
      lineUserId: input.userId,
      displayName: input.displayName || "LINE User",
      timezone: "Asia/Bangkok",
      language: "th",
      caregiverIds: [],
      status: "active",
      registeredAt: now,
      lastActiveAt: now,
      settings: {
        dailyCheckinTime: "20:00",
        inactivityThresholdHours: 6,
        reminderEnabled: true
      },
      consent: {
        elderlyAcceptedAt: now,
        caregiverAcceptedAt: null,
        version: "v1",
        revokedAt: null
      }
    });
    return;
  }

  await ref.set(
    {
      displayName: input.displayName || snapshot.get("displayName") || "LINE User",
      lastActiveAt: now
    },
    { merge: true }
  );
}

export async function touchLastActive(db: Firestore, userId: string): Promise<void> {
  await db.collection("users").doc(userId).set(
    { lastActiveAt: Timestamp.now() },
    { merge: true }
  );
}

interface SaveConversationInput {
  userId: string;
  role: "user" | "assistant";
  message: string;
  messageType: "text" | "voice";
  analysis: CombinedAnalysis;
  sessionId: string;
}

export async function saveConversationLog(db: Firestore, input: SaveConversationInput): Promise<string> {
  const ref = db.collection("conversationLogs").doc();
  await ref.set({
    userId: input.userId,
    role: input.role,
    message: input.message,
    messageType: input.messageType,
    analysis: {
      intent: input.analysis.intent,
      sentiment: input.analysis.sentiment,
      emotionLabel: input.analysis.emotionLabel,
      emotionScore: input.analysis.emotionScore,
      emergencyFlag: input.analysis.emergencyFlag,
      riskKeywords: input.analysis.riskKeywords
    },
    sessionId: input.sessionId,
    createdAt: Timestamp.now()
  });
  return ref.id;
}

export async function createBehaviorSignal(
  db: Firestore,
  userId: string,
  signalType: "emotion" | "silence" | "adherence" | "checkin",
  score: number,
  severity: Severity,
  sourceRefs: string[]
): Promise<void> {
  await db.collection("behaviorSignals").add({
    userId,
    signalType,
    score: Math.max(0, Math.min(100, score)),
    severity,
    sourceRefs,
    windowStart: Timestamp.now(),
    windowEnd: Timestamp.now(),
    computedAt: Timestamp.now()
  });
}

export async function createAlert(db: Firestore, payload: AlertPayload): Promise<string> {
  const caregiverIds = await getCaregiverIds(db, payload.userId);
  const ref = db.collection("alerts").doc();
  await ref.set({
    userId: payload.userId,
    caregiverIds,
    type: payload.type,
    severity: payload.severity,
    title: payload.title,
    detail: payload.detail,
    sourceMessage: payload.sourceMessage || null,
    triggeredAt: Timestamp.now(),
    sentAt: null,
    status: "open",
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedAt: null,
    dedupeKey: `${payload.userId}:${payload.type}:${new Date().toISOString().slice(0, 13)}`
  });
  return ref.id;
}

export async function markAlertSent(db: Firestore, alertId: string): Promise<void> {
  await db.collection("alerts").doc(alertId).set(
    {
      sentAt: Timestamp.now()
    },
    { merge: true }
  );
}

async function getCaregiverIds(db: Firestore, userId: string): Promise<string[]> {
  const user = await db.collection("users").doc(userId).get();
  const caregiverIds = (user.get("caregiverIds") as string[] | undefined) || [];
  if (caregiverIds.length > 0) return caregiverIds;

  const caregiverSnapshot = await db.collection("caregivers").where("linkedUserIds", "array-contains", userId).get();
  return caregiverSnapshot.docs.map((doc) => doc.id);
}

export async function getCaregiverLineIds(db: Firestore, userId: string): Promise<string[]> {
  const caregiverIds = await getCaregiverIds(db, userId);
  if (caregiverIds.length === 0) return [];

  const refs = caregiverIds.map((id) => db.collection("caregivers").doc(id));
  const docs = await db.getAll(...refs);
  const lineUserIds = docs
    .map((doc) => doc.get("lineUserId") as string | undefined)
    .filter((id): id is string => Boolean(id));
  return [...new Set(lineUserIds)];
}

export async function markLatestMedicationTaken(db: Firestore, userId: string): Promise<boolean> {
  const q = await db
    .collection("remindersLog")
    .where("userId", "==", userId)
    .where("type", "==", "medication")
    .where("status", "==", "pending")
    .orderBy("scheduledAt", "desc")
    .limit(1)
    .get();

  if (q.empty) return false;

  const doc = q.docs[0];
  await doc.ref.update({
    status: "taken",
    confirmedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return true;
}

export async function updateDailyCheckinResponse(db: Firestore, userId: string, responseText: string): Promise<void> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const q = await db
    .collection("dailyCheckins")
    .where("userId", "==", userId)
    .where("dateKey", "==", dateKey)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (q.empty) return;
  await q.docs[0].ref.update({
    status: "responded",
    respondedAt: Timestamp.now(),
    response: {
      text: responseText
    },
    updatedAt: Timestamp.now()
  });
}

export async function appendUserRiskScore(db: Firestore, userId: string, scoreDelta: number): Promise<void> {
  await db.collection("users").doc(userId).set(
    {
      riskProfile: {
        updatedAt: Timestamp.now(),
        latestDelta: scoreDelta
      },
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}
