"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMedicationReminders = void 0;
const firebase_functions_1 = require("firebase-functions");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const lineService_1 = require("../services/lineService");
const riskScoreService_1 = require("../services/riskScoreService");
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const MISSED_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours past reminder = missed
function nextReminderAfter(reference) {
    const next = new Date(reference.toDate().getTime() + 24 * 60 * 60 * 1000);
    return firestore_1.Timestamp.fromDate(next);
}
async function handleMissedReminders(userId, scheduleId, lineClient) {
    const cutoff = firestore_1.Timestamp.fromMillis(Date.now() - MISSED_THRESHOLD_MS);
    // Find pending reminders older than the threshold (not yet confirmed)
    const missed = await bootstrap_1.db
        .collection("remindersLog")
        .where("userId", "==", userId)
        .where("scheduleId", "==", scheduleId)
        .where("status", "==", "pending")
        .where("sentAt", "<=", cutoff)
        .limit(5)
        .get();
    if (missed.empty)
        return;
    for (const doc of missed.docs) {
        // Mark as missed
        await doc.ref.update({
            status: "missed",
            updatedAt: firestore_1.Timestamp.now(),
        });
        // Create adherence behavior signal (score 60–80 based on how many missed)
        const signalId = await (async () => {
            const ref = bootstrap_1.db.collection("behaviorSignals").doc();
            await ref.set({
                userId,
                signalType: "adherence",
                score: 65,
                severity: "medium",
                sourceRefs: [doc.id],
                windowStart: doc.data().sentAt,
                windowEnd: firestore_1.Timestamp.now(),
                computedAt: firestore_1.Timestamp.now(),
            });
            return ref.id;
        })();
        firebase_functions_1.logger.info("Adherence signal created for missed medication", { userId, signalId });
        // Check if caregiver should be alerted (only if not already alerted for this log)
        if (!doc.data().alertedCaregiver) {
            try {
                await (0, alertDispatcher_1.dispatchCaregiverAlert)({ db: bootstrap_1.db, lineClient }, {
                    userId,
                    type: "medication_missed",
                    severity: "medium",
                    title: "ลืมทานยา",
                    detail: `ไม่ได้ยืนยันการทานยาภายใน 2 ชั่วโมงหลังได้รับแจ้งเตือนค่ะ`,
                });
                await doc.ref.update({ alertedCaregiver: true });
            }
            catch (err) {
                firebase_functions_1.logger.warn("Failed to dispatch medication_missed alert", {
                    userId,
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
        // Recompute risk score asynchronously
        (0, riskScoreService_1.computeAndSaveRiskScore)(bootstrap_1.db, userId).catch(() => undefined);
    }
}
exports.sendMedicationReminders = (0, scheduler_1.onSchedule)({
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB",
}, async () => {
    const now = firestore_1.Timestamp.now();
    const lineClient = (0, lineService_1.getLineClient)();
    const dueSnapshot = await bootstrap_1.db
        .collection("medicationSchedules")
        .where("isActive", "==", true)
        .where("nextReminderAt", "<=", now)
        .limit(200)
        .get();
    for (const scheduleDoc of dueSnapshot.docs) {
        const schedule = scheduleDoc.data();
        const userId = schedule.userId;
        if (!userId)
            continue;
        // Detect and handle missed reminders before sending a new one
        try {
            await handleMissedReminders(userId, scheduleDoc.id, lineClient);
        }
        catch (err) {
            firebase_functions_1.logger.warn("handleMissedReminders failed", {
                scheduleId: scheduleDoc.id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
        const userSnapshot = await bootstrap_1.db.collection("users").doc(userId).get();
        const userData = userSnapshot.data() || {};
        const lineUserId = userData.lineUserId || userId;
        const name = schedule.name || "ยาประจำวัน";
        const dosage = schedule.dosage || "1 เม็ด";
        const scheduledText = schedule.nextReminderAt instanceof firestore_1.Timestamp
            ? schedule.nextReminderAt
                .toDate()
                .toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })
            : "ตามเวลาที่กำหนด";
        const reminderText = `🔔 ถึงเวลากินยาแล้วนะคะ\n` +
            `ยา: ${name} ${dosage}\n` +
            `เวลา: ${scheduledText}\n` +
            `ตอบว่า "กินยาแล้ว" ได้เลยค่ะ`;
        try {
            await (0, lineService_1.pushText)(lineClient, lineUserId, reminderText);
            await bootstrap_1.db.collection("remindersLog").add({
                userId,
                scheduleId: scheduleDoc.id,
                type: "medication",
                scheduledAt: schedule.nextReminderAt || now,
                sentAt: now,
                status: "pending",
                confirmedAt: null,
                followUpCount: 0,
                alertedCaregiver: false,
                updatedAt: now,
            });
            const baseTime = schedule.nextReminderAt instanceof firestore_1.Timestamp
                ? schedule.nextReminderAt
                : now;
            await scheduleDoc.ref.update({
                lastSentAt: now,
                nextReminderAt: nextReminderAfter(baseTime),
                updatedAt: now,
            });
        }
        catch (error) {
            firebase_functions_1.logger.error("Failed to send medication reminder", {
                scheduleId: scheduleDoc.id,
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
});
//# sourceMappingURL=medicationScheduler.js.map