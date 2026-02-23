"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEmergencyMessage = handleEmergencyMessage;
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const lineService_1 = require("../services/lineService");
const EMERGENCY_REPLY = "I hear you. I am notifying your caregiver now. If this is urgent, please call 1669 immediately.";
async function handleEmergencyMessage(ctx, userId, replyToken, originalMessage) {
    await (0, alertDispatcher_1.dispatchCaregiverAlert)(ctx, {
        userId,
        type: "emergency",
        severity: "critical",
        title: "Emergency keyword detected",
        detail: `Emergency message: "${originalMessage}"`,
        sourceMessage: originalMessage
    });
    await (0, lineService_1.replyText)(ctx.lineClient, replyToken, EMERGENCY_REPLY);
}
//# sourceMappingURL=emergencyHandler.js.map