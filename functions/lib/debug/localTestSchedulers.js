"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testEmotionAnalysis = exports.testDailySummary = exports.testInactivityAlert = exports.testCheckinEscalation = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const emotionAnalyzer_1 = require("../ai/emotionAnalyzer");
const firestoreService_1 = require("../services/firestoreService");
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const lineService_1 = require("../services/lineService");
const riskScoreService_1 = require("../services/riskScoreService");
const dailySummaryScheduler_1 = require("../schedulers/dailySummaryScheduler");
const localTestEndpoints_1 = require("./localTestEndpoints");
function getJsonBody(req) {
    return (req.body || {});
}
// Seeds a pending dailyCheckin (sentAt = 3h ago) and triggers escalation for userId
exports.testCheckinEscalation = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "256MiB" }, async (req, res) => {
    if (!(0, localTestEndpoints_1.assertPost)(req, res) || !(0, localTestEndpoints_1.authorizeLocalTest)(req, res))
        return;
    const { userId } = getJsonBody(req);
    if (!userId?.trim()) {
        res.status(400).json({ ok: false, error: "Missing required field: userId" });
        return;
    }
    const lineClient = (0, lineService_1.getLineClient)();
    const sentAt = firestore_1.Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000);
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const checkinRef = bootstrap_1.db.collection("dailyCheckins").doc();
    await checkinRef.set({
        userId,
        dateKey: today,
        scheduledAt: sentAt,
        sentAt,
        respondedAt: null,
        status: "pending",
        response: { text: null, wellbeing: null, emotionLabel: null, emotionScore: null },
        alertTriggered: false,
        updatedAt: sentAt
    });
    await (0, firestoreService_1.createBehaviorSignal)(bootstrap_1.db, userId, "checkin", 70, "medium", [checkinRef.id]);
    const alertId = await (0, alertDispatcher_1.dispatchCaregiverAlert)({ db: bootstrap_1.db, lineClient }, {
        userId,
        type: "no_checkin",
        severity: "medium",
        title: "ผู้สูงอายุไม่ได้เช็กอินประจำวัน",
        detail: "ไม่มีการตอบรับภายใน 2 ชั่วโมง กรุณาติดต่อเพื่อสอบถามอาการ"
    });
    (0, riskScoreService_1.computeAndSaveRiskScore)(bootstrap_1.db, userId).catch(() => undefined);
    await checkinRef.set({ status: "no_response", alertTriggered: true, updatedAt: firestore_1.Timestamp.now() }, { merge: true });
    res.status(200).json({ ok: true, userId, checkinId: checkinRef.id, alertId });
});
// Sets lastActiveAt to X hours ago and triggers inactivity alert for userId
exports.testInactivityAlert = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "256MiB" }, async (req, res) => {
    if (!(0, localTestEndpoints_1.assertPost)(req, res) || !(0, localTestEndpoints_1.authorizeLocalTest)(req, res))
        return;
    const body = getJsonBody(req);
    const userId = body.userId?.trim();
    if (!userId) {
        res.status(400).json({ ok: false, error: "Missing required field: userId" });
        return;
    }
    const inactiveHours = typeof body.inactiveHours === "number" ? Math.max(1, body.inactiveHours) : 8;
    const lineClient = (0, lineService_1.getLineClient)();
    const lastActiveAt = firestore_1.Timestamp.fromMillis(Date.now() - inactiveHours * 60 * 60 * 1000);
    await bootstrap_1.db
        .collection("users")
        .doc(userId)
        .set({ lastActiveAt, updatedAt: firestore_1.Timestamp.now() }, { merge: true });
    const silenceScore = Math.min(90, 50 + inactiveHours * 5);
    const severity = inactiveHours >= 12 ? "high" : "medium";
    await (0, firestoreService_1.createBehaviorSignal)(bootstrap_1.db, userId, "silence", silenceScore, severity, []);
    const alertId = await (0, alertDispatcher_1.dispatchCaregiverAlert)({ db: bootstrap_1.db, lineClient }, {
        userId,
        type: "inactivity",
        severity,
        title: "ไม่พบความเคลื่อนไหวของผู้สูงอายุ",
        detail: `ไม่มีกิจกรรมในระบบมาแล้วประมาณ ${inactiveHours} ชั่วโมง กรุณาตรวจสอบ`
    });
    (0, riskScoreService_1.computeAndSaveRiskScore)(bootstrap_1.db, userId).catch(() => undefined);
    await bootstrap_1.db
        .collection("users")
        .doc(userId)
        .set({ monitoring: { lastInactivityAlertAt: firestore_1.Timestamp.now() }, updatedAt: firestore_1.Timestamp.now() }, { merge: true });
    res.status(200).json({ ok: true, userId, inactiveHours, silenceScore, severity, alertId });
});
// Sends daily summary Flex Message for a single userId immediately
exports.testDailySummary = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "256MiB" }, async (req, res) => {
    if (!(0, localTestEndpoints_1.assertPost)(req, res) || !(0, localTestEndpoints_1.authorizeLocalTest)(req, res))
        return;
    const body = getJsonBody(req);
    const userId = body.userId?.trim();
    if (!userId) {
        res.status(400).json({ ok: false, error: "Missing required field: userId" });
        return;
    }
    const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dateKey = body.dateKey?.trim() || bangkokNow.toISOString().slice(0, 10);
    const dayStart = firestore_1.Timestamp.fromDate(new Date(`${dateKey}T00:00:00+07:00`));
    const dayEnd = firestore_1.Timestamp.fromDate(new Date(`${dateKey}T23:59:59+07:00`));
    const [userSnap, checkinSnap, medSnap, caregiverLineIds] = await Promise.all([
        bootstrap_1.db.collection("users").doc(userId).get(),
        bootstrap_1.db.collection("dailyCheckins").where("userId", "==", userId).where("dateKey", "==", dateKey).limit(1).get(),
        bootstrap_1.db.collection("remindersLog")
            .where("userId", "==", userId)
            .where("type", "==", "medication")
            .where("scheduledAt", ">=", dayStart)
            .where("scheduledAt", "<=", dayEnd)
            .get(),
        (0, firestoreService_1.getCaregiverLineIds)(bootstrap_1.db, userId)
    ]);
    if (caregiverLineIds.length === 0) {
        res.status(200).json({ ok: true, userId, dateKey, caregiverCount: 0, note: "ไม่พบผู้ดูแลที่เชื่อมต่อ" });
        return;
    }
    const displayName = userSnap.get("displayName") || "คุณ";
    const riskProfile = userSnap.get("riskProfile");
    const checkinStatus = checkinSnap.empty ? undefined : checkinSnap.docs[0].get("status");
    const totalMeds = medSnap.size;
    const takenMeds = medSnap.docs.filter((d) => d.get("status") === "taken").length;
    const lineClient = (0, lineService_1.getLineClient)();
    const flexContents = (0, dailySummaryScheduler_1.buildSummaryFlex)(displayName, dateKey, {
        checkinStatus,
        takenMeds,
        totalMeds,
        riskScore: riskProfile?.currentScore,
        trend: riskProfile?.trend
    });
    await Promise.all(caregiverLineIds.map((lineId) => (0, lineService_1.pushFlexMessage)(lineClient, lineId, `NaMo Care — สรุปสุขภาพ ${displayName}`, flexContents)));
    res.status(200).json({ ok: true, userId, dateKey, caregiverCount: caregiverLineIds.length });
});
// Runs Thai NLP analysis on input text and returns CombinedAnalysis result
exports.testEmotionAnalysis = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "128MiB" }, async (req, res) => {
    if (!(0, localTestEndpoints_1.assertPost)(req, res) || !(0, localTestEndpoints_1.authorizeLocalTest)(req, res))
        return;
    const { text } = getJsonBody(req);
    if (!text?.trim()) {
        res.status(400).json({ ok: false, error: "Missing required field: text" });
        return;
    }
    const result = (0, emotionAnalyzer_1.analyzeMessage)(text.trim());
    res.status(200).json({ ok: true, text: text.trim(), analysis: result });
});
//# sourceMappingURL=localTestSchedulers.js.map