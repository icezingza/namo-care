"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailyCheckins = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const lineService_1 = require("../services/lineService");
function getBangkokDateParts(date) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    const year = parts.year || "0000";
    const month = parts.month || "01";
    const day = parts.day || "01";
    const hour = parts.hour || "00";
    const minute = parts.minute || "00";
    const dateKey = `${year}-${month}-${day}`;
    const hhmm = `${hour}:${minute}`;
    const minutesOfDay = Number(hour) * 60 + Number(minute);
    return { dateKey, hhmm, minutesOfDay };
}
function parseHHMM(value) {
    const [hh, mm] = value.split(":").map((v) => Number(v));
    if (Number.isNaN(hh) || Number.isNaN(mm))
        return 20 * 60;
    return hh * 60 + mm;
}
exports.sendDailyCheckins = (0, scheduler_1.onSchedule)({
    schedule: "every 15 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB"
}, async () => {
    const now = new Date();
    const nowTs = firestore_1.Timestamp.now();
    const lineClient = (0, lineService_1.getLineClient)();
    const nowBangkok = getBangkokDateParts(now);
    const activeUsers = await bootstrap_1.db.collection("users").where("status", "==", "active").limit(500).get();
    for (const userDoc of activeUsers.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;
        const target = typeof user.settings?.dailyCheckinTime === "string" ? user.settings.dailyCheckinTime : "20:00";
        const targetMinutes = parseHHMM(target);
        const delta = Math.abs(nowBangkok.minutesOfDay - targetMinutes);
        if (delta > 14)
            continue;
        const checkinId = `${userId}_${nowBangkok.dateKey}`;
        const checkinRef = bootstrap_1.db.collection("dailyCheckins").doc(checkinId);
        const checkinSnap = await checkinRef.get();
        if (checkinSnap.exists)
            continue;
        const lineUserId = user.lineUserId || userId;
        const checkinMessage = "🌙 วันนี้เป็นอย่างไรบ้างคะ\n" +
            "ตอบสั้นๆ ได้เลย เช่น สบายดี / พอไหว / ไม่ค่อยสบาย";
        try {
            await (0, lineService_1.pushText)(lineClient, lineUserId, checkinMessage);
            await checkinRef.set({
                userId,
                dateKey: nowBangkok.dateKey,
                scheduledAt: nowTs,
                sentAt: nowTs,
                respondedAt: null,
                status: "pending",
                response: {
                    text: null,
                    wellbeing: null,
                    emotionLabel: null,
                    emotionScore: null
                },
                alertTriggered: false,
                updatedAt: nowTs
            });
        }
        catch (error) {
            firebase_functions_1.logger.error("Failed to send daily check-in", {
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
});
//# sourceMappingURL=dailyCheckinScheduler.js.map