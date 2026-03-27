"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCaregiverAlert = exports.testMedicationReminder = exports.seedCaregiverLink = exports.healthCheck = void 0;
exports.assertPost = assertPost;
exports.authorizeLocalTest = authorizeLocalTest;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const firestoreService_1 = require("../services/firestoreService");
const lineService_1 = require("../services/lineService");
function getJsonBody(req) {
    return (req.body || {});
}
function assertPost(req, res) {
    if (req.method !== "POST") {
        res.status(405).json({ ok: false, error: "Use POST" });
        return false;
    }
    return true;
}
function authorizeLocalTest(req, res) {
    const configuredKey = process.env.LOCAL_TEST_KEY;
    if (!configuredKey) {
        res.status(503).json({
            ok: false,
            error: "LOCAL_TEST_KEY is not configured. Set it before using test endpoints."
        });
        return false;
    }
    const candidate = req.header("x-test-key") ||
        (typeof req.query.key === "string" ? req.query.key : undefined) ||
        (typeof req.body?.key === "string" ? req.body.key : undefined);
    if (!candidate || candidate !== configuredKey) {
        res.status(401).json({ ok: false, error: "Unauthorized test key" });
        return false;
    }
    return true;
}
function getUserLineId(userData, userId) {
    const lineUserId = userData.lineUserId;
    if (typeof lineUserId === "string" && lineUserId.trim().length > 0) {
        return lineUserId;
    }
    return userId;
}
exports.healthCheck = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "128MiB" }, async (_req, res) => {
    res.status(200).json({
        ok: true,
        service: "namo-care-functions",
        time: new Date().toISOString(),
        env: {
            hasLineChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
            hasLineAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
            hasLocalTestKey: Boolean(process.env.LOCAL_TEST_KEY)
        }
    });
});
exports.seedCaregiverLink = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "128MiB" }, async (req, res) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res))
        return;
    const body = getJsonBody(req);
    const userId = body.userId?.trim();
    const caregiverLineUserId = body.caregiverLineUserId?.trim();
    if (!userId || !caregiverLineUserId) {
        res.status(400).json({
            ok: false,
            error: "Missing required fields: userId, caregiverLineUserId"
        });
        return;
    }
    await (0, firestoreService_1.ensureUser)(bootstrap_1.db, { userId });
    const caregiverId = caregiverLineUserId;
    await bootstrap_1.db.collection("caregivers").doc(caregiverId).set({
        lineUserId: caregiverLineUserId,
        displayName: body.caregiverDisplayName || "Caregiver",
        relationship: body.relationship || "family",
        linkedUserIds: firestore_1.FieldValue.arrayUnion(userId),
        alertPreferences: {
            emergency: true,
            medication: true,
            inactivity: true,
            emotion: true,
            dailySummary: true,
            summaryTime: "21:00"
        },
        registeredAt: firestore_1.Timestamp.now()
    }, { merge: true });
    await bootstrap_1.db.collection("users").doc(userId).set({
        caregiverIds: firestore_1.FieldValue.arrayUnion(caregiverId),
        updatedAt: firestore_1.Timestamp.now()
    }, { merge: true });
    res.status(200).json({
        ok: true,
        userId,
        caregiverId
    });
});
exports.testMedicationReminder = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "256MiB" }, async (req, res) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res))
        return;
    const body = getJsonBody(req);
    const userId = body.userId?.trim();
    if (!userId) {
        res.status(400).json({ ok: false, error: "Missing required field: userId" });
        return;
    }
    const medicationName = body.medicationName || "ยาประจำวัน";
    const dosage = body.dosage || "1 เม็ด";
    const scheduledTime = body.scheduledTime || "08:00";
    await (0, firestoreService_1.ensureUser)(bootstrap_1.db, { userId });
    const userSnapshot = await bootstrap_1.db.collection("users").doc(userId).get();
    const userData = userSnapshot.data() || {};
    const lineUserId = getUserLineId(userData, userId);
    const lineClient = (0, lineService_1.getLineClient)();
    const message = `🔔 ถึงเวลากินยาแล้วนะคะ\n` +
        `ยา: ${medicationName} ${dosage}\n` +
        `เวลา: ${scheduledTime}\n` +
        `ตอบว่า "กินยาแล้ว" ได้เลยค่ะ`;
    await (0, lineService_1.pushText)(lineClient, lineUserId, message);
    const logRef = bootstrap_1.db.collection("remindersLog").doc();
    await logRef.set({
        userId,
        scheduleId: null,
        type: "medication",
        scheduledAt: firestore_1.Timestamp.now(),
        sentAt: firestore_1.Timestamp.now(),
        status: "pending",
        confirmedAt: null,
        followUpCount: 0,
        alertedCaregiver: false,
        updatedAt: firestore_1.Timestamp.now(),
        metadata: {
            medicationName,
            dosage,
            scheduledTime,
            trigger: "manual_test_endpoint"
        }
    });
    res.status(200).json({
        ok: true,
        userId,
        lineUserId,
        remindersLogId: logRef.id
    });
});
exports.testCaregiverAlert = (0, https_1.onRequest)({ region: "asia-southeast1", memory: "256MiB" }, async (req, res) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res))
        return;
    const body = getJsonBody(req);
    const userId = body.userId?.trim();
    if (!userId) {
        res.status(400).json({ ok: false, error: "Missing required field: userId" });
        return;
    }
    const lineClient = (0, lineService_1.getLineClient)();
    const alertId = await (0, alertDispatcher_1.dispatchCaregiverAlert)({ db: bootstrap_1.db, lineClient }, {
        userId,
        type: body.type || "emotion",
        severity: body.severity || "medium",
        title: body.title || "Manual test alert",
        detail: body.detail || "This is a local-test alert from NaMo Care Companion."
    });
    res.status(200).json({
        ok: true,
        userId,
        alertId
    });
});
//# sourceMappingURL=localTestEndpoints.js.map