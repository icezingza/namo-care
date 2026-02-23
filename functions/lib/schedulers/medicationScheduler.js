"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMedicationReminders = void 0;
const firebase_functions_1 = require("firebase-functions");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const lineService_1 = require("../services/lineService");
function nextReminderAfter(reference) {
    const next = new Date(reference.toDate().getTime() + 24 * 60 * 60 * 1000);
    return firestore_1.Timestamp.fromDate(next);
}
exports.sendMedicationReminders = (0, scheduler_1.onSchedule)({
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB"
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
        const userSnapshot = await bootstrap_1.db.collection("users").doc(userId).get();
        const userData = userSnapshot.data() || {};
        const lineUserId = userData.lineUserId || userId;
        const name = schedule.name || "ยาประจำวัน";
        const dosage = schedule.dosage || "1 เม็ด";
        const scheduledText = schedule.nextReminderAt instanceof firestore_1.Timestamp
            ? schedule.nextReminderAt.toDate().toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })
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
                updatedAt: now
            });
            const baseTime = schedule.nextReminderAt instanceof firestore_1.Timestamp
                ? schedule.nextReminderAt
                : now;
            await scheduleDoc.ref.update({
                lastSentAt: now,
                nextReminderAt: nextReminderAfter(baseTime),
                updatedAt: now
            });
        }
        catch (error) {
            firebase_functions_1.logger.error("Failed to send medication reminder", {
                scheduleId: scheduleDoc.id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
});
//# sourceMappingURL=medicationScheduler.js.map