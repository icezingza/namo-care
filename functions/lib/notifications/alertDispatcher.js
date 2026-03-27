"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchCaregiverAlert = dispatchCaregiverAlert;
const firebase_functions_1 = require("firebase-functions");
const firestoreService_1 = require("../services/firestoreService");
const lineService_1 = require("../services/lineService");
const SEVERITY_LABEL = {
    low: "ℹ️ ข้อมูล",
    medium: "🔔 เฝ้าระวัง",
    high: "⚠️ สำคัญ",
    critical: "🚨 วิกฤต",
};
const TYPE_LABEL = {
    emergency: "เหตุฉุกเฉิน",
    inactivity: "ไม่มีความเคลื่อนไหว",
    emotion: "สัญญาณอารมณ์",
    medication_missed: "ลืมทานยา",
    no_checkin: "ไม่ได้เช็กอิน",
};
function formatAlertMessage(payload) {
    const level = SEVERITY_LABEL[payload.severity] || payload.severity;
    const type = TYPE_LABEL[payload.type] || payload.type;
    return `NaMo Care แจ้งเตือน\n${level} — ${type}\n\n${payload.title}\n${payload.detail}`;
}
async function dispatchCaregiverAlert(ctx, payload) {
    const alertId = await (0, firestoreService_1.createAlert)(ctx.db, payload);
    const caregiverLineIds = await (0, firestoreService_1.getCaregiverLineIds)(ctx.db, payload.userId);
    const message = formatAlertMessage(payload);
    await Promise.all(caregiverLineIds.map(async (lineId) => {
        try {
            await (0, lineService_1.pushText)(ctx.lineClient, lineId, message);
        }
        catch (error) {
            firebase_functions_1.logger.error("Failed to push alert to caregiver", {
                lineId,
                alertId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }));
    await (0, firestoreService_1.markAlertSent)(ctx.db, alertId);
    return alertId;
}
//# sourceMappingURL=alertDispatcher.js.map