"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchInactivitySignals = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const lineService_1 = require("../services/lineService");
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
function toMillis(value) {
    if (value instanceof firestore_1.Timestamp)
        return value.toMillis();
    return 0;
}
exports.watchInactivitySignals = (0, scheduler_1.onSchedule)({
    schedule: "every 30 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB"
}, async () => {
    const nowMs = Date.now();
    const now = firestore_1.Timestamp.now();
    const lineClient = (0, lineService_1.getLineClient)();
    const activeUsers = await bootstrap_1.db
        .collection("users")
        .where("status", "==", "active")
        .limit(500)
        .get();
    for (const userDoc of activeUsers.docs) {
        const data = userDoc.data();
        const userId = userDoc.id;
        const thresholdHours = typeof data.settings?.inactivityThresholdHours === "number"
            ? data.settings.inactivityThresholdHours
            : 6;
        const thresholdMs = thresholdHours * 60 * 60 * 1000;
        const lastActiveMs = toMillis(data.lastActiveAt);
        if (lastActiveMs <= 0)
            continue;
        const inactiveMs = nowMs - lastActiveMs;
        if (inactiveMs < thresholdMs)
            continue;
        const lastAlertMs = toMillis(data.monitoring?.lastInactivityAlertAt);
        if (lastAlertMs > 0 && nowMs - lastAlertMs < ALERT_COOLDOWN_MS) {
            continue;
        }
        try {
            const inactiveHoursRounded = Math.floor(inactiveMs / (60 * 60 * 1000));
            await (0, alertDispatcher_1.dispatchCaregiverAlert)({ db: bootstrap_1.db, lineClient }, {
                userId,
                type: "inactivity",
                severity: "medium",
                title: "Silence / inactivity detected",
                detail: `No user activity for about ${inactiveHoursRounded} hour(s).`
            });
            await userDoc.ref.set({
                monitoring: {
                    lastInactivityAlertAt: now
                },
                updatedAt: now
            }, { merge: true });
        }
        catch (error) {
            firebase_functions_1.logger.error("Failed to dispatch inactivity alert", {
                userId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
});
//# sourceMappingURL=inactivityWatcher.js.map