"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchCaregiverAlert = dispatchCaregiverAlert;
const firebase_functions_1 = require("firebase-functions");
const firestoreService_1 = require("../services/firestoreService");
const lineService_1 = require("../services/lineService");
function formatAlertMessage(payload) {
    const severityMap = {
        low: "Info",
        medium: "Watch",
        high: "High",
        critical: "Critical"
    };
    const level = severityMap[payload.severity] || payload.severity;
    return `NaMo Alert (${level})\n${payload.title}\n${payload.detail}`;
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