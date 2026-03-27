"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUser = ensureUser;
exports.touchLastActive = touchLastActive;
exports.saveConversationLog = saveConversationLog;
exports.createBehaviorSignal = createBehaviorSignal;
exports.createAlert = createAlert;
exports.findActiveAlertByDedupeKey = findActiveAlertByDedupeKey;
exports.markAlertSent = markAlertSent;
exports.getCaregiverLineIds = getCaregiverLineIds;
exports.markLatestMedicationTaken = markLatestMedicationTaken;
exports.updateDailyCheckinResponse = updateDailyCheckinResponse;
exports.appendUserRiskScore = appendUserRiskScore;
const firestore_1 = require("firebase-admin/firestore");
async function ensureUser(db, input) {
    const ref = db.collection("users").doc(input.userId);
    const snapshot = await ref.get();
    const now = firestore_1.Timestamp.now();
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
    await ref.set({
        displayName: input.displayName || snapshot.get("displayName") || "LINE User",
        lastActiveAt: now
    }, { merge: true });
}
async function touchLastActive(db, userId) {
    await db.collection("users").doc(userId).set({ lastActiveAt: firestore_1.Timestamp.now() }, { merge: true });
}
async function saveConversationLog(db, input) {
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
        createdAt: firestore_1.Timestamp.now()
    });
    return ref.id;
}
async function createBehaviorSignal(db, userId, signalType, score, severity, sourceRefs) {
    await db.collection("behaviorSignals").add({
        userId,
        signalType,
        score: Math.max(0, Math.min(100, score)),
        severity,
        sourceRefs,
        windowStart: firestore_1.Timestamp.now(),
        windowEnd: firestore_1.Timestamp.now(),
        computedAt: firestore_1.Timestamp.now()
    });
}
async function createAlert(db, payload) {
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
        triggeredAt: firestore_1.Timestamp.now(),
        sentAt: null,
        status: "open",
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolvedAt: null,
        dedupeKey: `${payload.userId}:${payload.type}:${new Date().toISOString().slice(0, 13)}`
    });
    return ref.id;
}
async function findActiveAlertByDedupeKey(db, dedupeKey) {
    const snap = await db.collection("alerts")
        .where("dedupeKey", "==", dedupeKey)
        .where("status", "in", ["open", "sent"])
        .limit(1)
        .get();
    return snap.empty ? null : snap.docs[0].id;
}
async function markAlertSent(db, alertId) {
    await db.collection("alerts").doc(alertId).set({
        sentAt: firestore_1.Timestamp.now()
    }, { merge: true });
}
async function getCaregiverIds(db, userId) {
    const user = await db.collection("users").doc(userId).get();
    const caregiverIds = user.get("caregiverIds") || [];
    if (caregiverIds.length > 0)
        return caregiverIds;
    const caregiverSnapshot = await db.collection("caregivers").where("linkedUserIds", "array-contains", userId).get();
    return caregiverSnapshot.docs.map((doc) => doc.id);
}
async function getCaregiverLineIds(db, userId) {
    const caregiverIds = await getCaregiverIds(db, userId);
    if (caregiverIds.length === 0)
        return [];
    const refs = caregiverIds.map((id) => db.collection("caregivers").doc(id));
    const docs = await db.getAll(...refs);
    const lineUserIds = docs
        .map((doc) => doc.get("lineUserId"))
        .filter((id) => Boolean(id));
    return [...new Set(lineUserIds)];
}
async function markLatestMedicationTaken(db, userId) {
    const q = await db
        .collection("remindersLog")
        .where("userId", "==", userId)
        .where("type", "==", "medication")
        .where("status", "==", "pending")
        .orderBy("scheduledAt", "desc")
        .limit(1)
        .get();
    if (q.empty)
        return false;
    const doc = q.docs[0];
    await doc.ref.update({
        status: "taken",
        confirmedAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now()
    });
    return true;
}
async function updateDailyCheckinResponse(db, userId, responseText) {
    const dateKey = new Date().toISOString().slice(0, 10);
    const q = await db
        .collection("dailyCheckins")
        .where("userId", "==", userId)
        .where("dateKey", "==", dateKey)
        .where("status", "==", "pending")
        .limit(1)
        .get();
    if (q.empty)
        return;
    await q.docs[0].ref.update({
        status: "responded",
        respondedAt: firestore_1.Timestamp.now(),
        response: {
            text: responseText
        },
        updatedAt: firestore_1.Timestamp.now()
    });
}
async function appendUserRiskScore(db, userId, scoreDelta) {
    await db.collection("users").doc(userId).set({
        riskProfile: {
            updatedAt: firestore_1.Timestamp.now(),
            latestDelta: scoreDelta
        },
        updatedAt: firestore_1.FieldValue.serverTimestamp()
    }, { merge: true });
}
//# sourceMappingURL=firestoreService.js.map