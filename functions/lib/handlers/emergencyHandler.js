"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEmergencyMessage = handleEmergencyMessage;
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const lineService_1 = require("../services/lineService");
const EMERGENCY_REPLY = "หนูได้ยินแล้วนะคะ 🙏 กำลังแจ้งผู้ดูแลให้รับทราบทันทีเลยค่ะ\nถ้าต้องการความช่วยเหลือเร่งด่วน โทร 1669 ได้เลยนะคะ 🚑";
async function handleEmergencyMessage(ctx, userId, replyToken, originalMessage) {
    await (0, alertDispatcher_1.dispatchCaregiverAlert)(ctx, {
        userId,
        type: "emergency",
        severity: "critical",
        title: "พบคำขอความช่วยเหลือฉุกเฉิน",
        detail: `ผู้สูงอายุส่งข้อความฉุกเฉิน กรุณาติดต่อกลับทันที`,
        sourceMessage: originalMessage
    });
    await (0, lineService_1.replyText)(ctx.lineClient, replyToken, EMERGENCY_REPLY);
}
//# sourceMappingURL=emergencyHandler.js.map