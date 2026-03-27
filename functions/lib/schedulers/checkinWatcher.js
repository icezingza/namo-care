"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escalateNoResponseCheckins = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const firestoreService_1 = require("../services/firestoreService");
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const lineService_1 = require("../services/lineService");
const riskScoreService_1 = require("../services/riskScoreService");
const CHECKIN_RESPONSE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
exports.escalateNoResponseCheckins = (0, scheduler_1.onSchedule)({
    schedule: "every 30 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB"
}, async () => {
    const threshold = firestore_1.Timestamp.fromMillis(Date.now() - CHECKIN_RESPONSE_TIMEOUT_MS);
    const lineClient = (0, lineService_1.getLineClient)();
    const pending = await bootstrap_1.db
        .collection("dailyCheckins")
        .where("status", "==", "pending")
        .where("sentAt", "<=", threshold)
        .limit(200)
        .get();
    for (const doc of pending.docs) {
        const data = doc.data();
        const userId = data.userId;
        if (!userId)
            continue;
        try {
            await (0, firestoreService_1.createBehaviorSignal)(bootstrap_1.db, userId, "checkin", 70, "medium", [doc.id]);
            await (0, alertDispatcher_1.dispatchCaregiverAlert)({ db: bootstrap_1.db, lineClient }, {
                userId,
                type: "no_checkin",
                severity: "medium",
                title: "ผู้สูงอายุไม่ได้เช็กอินประจำวัน",
                detail: "ไม่มีการตอบรับภายใน 2 ชั่วโมง กรุณาติดต่อเพื่อสอบถามอาการ"
            });
            (0, riskScoreService_1.computeAndSaveRiskScore)(bootstrap_1.db, userId).catch(() => undefined);
            await doc.ref.set({
                status: "no_response",
                alertTriggered: true,
                updatedAt: firestore_1.Timestamp.now()
            }, { merge: true });
        }
        catch (error) {
            firebase_functions_1.logger.error("Failed to escalate pending check-in", {
                checkinId: doc.id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
});
//# sourceMappingURL=checkinWatcher.js.map