"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserMessage = handleUserMessage;
const emotionAnalyzer_1 = require("../ai/emotionAnalyzer");
const firestoreService_1 = require("../services/firestoreService");
const riskScoreService_1 = require("../services/riskScoreService");
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const lineService_1 = require("../services/lineService");
function getSessionId(userId) {
    const date = new Date().toISOString().slice(0, 10);
    return `sess_${date}_${userId.slice(0, 8)}`;
}
function buildAssistantReply(analysis, medicationTaken) {
    if (analysis.intent === "medication_confirm") {
        return medicationTaken
            ? "✅ บันทึกการทานยาแล้วนะคะ ขอบคุณที่แจ้งให้ทราบค่ะ 🙏"
            : "ขอบคุณที่แจ้งนะคะ 💊 ถ้ายังไม่ได้ทาน อย่าลืมทานให้ครบด้วยนะคะ";
    }
    if (analysis.emergencyFlag || analysis.emotionLabel === "distress") {
        return "หนูได้ยินค่ะ... รู้สึกอย่างนี้มันหนักมากเลยนะ 🙏\nไม่ต้องแบกรับคนเดียวนะคะ กำลังแจ้งผู้ดูแลให้รับทราบแล้วค่ะ";
    }
    if (analysis.emotionLabel === "sad") {
        return "ขอบคุณที่เล่าให้ฟังนะคะ 🤍 หนูอยู่ตรงนี้เสมอนะคะ\nวันนี้เป็นอย่างไรบ้างคะ อยากเล่าให้ฟังอีกไหมคะ?";
    }
    if (analysis.intent === "checkin_response") {
        return "ขอบคุณที่เช็กอินนะคะ 😊 บันทึกสุขภาพวันนี้เรียบร้อยแล้วค่ะ\nดูแลตัวเองด้วยนะคะ 🙏";
    }
    if (analysis.sentiment === "positive") {
        return "ดีใจด้วยนะคะ 😊 ได้ยินแล้วก็รู้สึกดีตามเลยค่ะ 💛";
    }
    return "หนูรับทราบแล้วนะคะ 🙏 มีอะไรให้ช่วยเหลือบอกได้เลยค่ะ";
}
function toSeverity(score) {
    if (score >= 85)
        return "high";
    if (score >= 70)
        return "medium";
    return "low";
}
async function handleUserMessage(ctx, userId, replyToken, text) {
    const analysis = (0, emotionAnalyzer_1.analyzeMessage)(text);
    const sessionId = getSessionId(userId);
    const userLogId = await (0, firestoreService_1.saveConversationLog)(ctx.db, {
        userId,
        role: "user",
        message: text,
        messageType: "text",
        analysis,
        sessionId
    });
    const medicationTaken = analysis.intent === "medication_confirm"
        ? await (0, firestoreService_1.markLatestMedicationTaken)(ctx.db, userId)
        : false;
    if (analysis.intent === "checkin_response" || analysis.intent === "distress_expression") {
        await (0, firestoreService_1.updateDailyCheckinResponse)(ctx.db, userId, text);
    }
    const riskScore = Math.round(analysis.emotionScore * 100);
    if (analysis.emergencyFlag) {
        const emergSeverity = analysis.emergencySeverity ?? "critical";
        await (0, firestoreService_1.createBehaviorSignal)(ctx.db, userId, "emotion", 100, emergSeverity, [userLogId]);
        await (0, alertDispatcher_1.dispatchCaregiverAlert)(ctx, {
            userId,
            type: "emergency",
            severity: emergSeverity,
            title: "ผู้สูงอายุส่งสัญญาณขอความช่วยเหลือ",
            detail: "พบคำขอความช่วยเหลือฉุกเฉินในข้อความ กรุณาติดต่อกลับทันที",
            sourceMessage: text
        });
    }
    else if (analysis.emotionLabel === "sad" || analysis.emotionLabel === "distress") {
        const severity = toSeverity(riskScore);
        await (0, firestoreService_1.createBehaviorSignal)(ctx.db, userId, "emotion", riskScore, severity, [userLogId]);
        if (analysis.emotionLabel === "distress" && riskScore >= 70) {
            await (0, alertDispatcher_1.dispatchCaregiverAlert)(ctx, {
                userId,
                type: "emotion",
                severity: "high",
                title: "พบสัญญาณความทุกข์ใจจากผู้สูงอายุ",
                detail: "ข้อความล่าสุดบ่งบอกถึงความทุกข์ใจระดับสูง ควรติดต่อเพื่อสอบถามอาการ",
                sourceMessage: text
            });
        }
    }
    // Recompute aggregate risk score after each message (fire-and-forget)
    (0, riskScoreService_1.computeAndSaveRiskScore)(ctx.db, userId).catch(() => undefined);
    const reply = buildAssistantReply(analysis, medicationTaken);
    await (0, lineService_1.replyText)(ctx.lineClient, replyToken, reply);
    await (0, firestoreService_1.saveConversationLog)(ctx.db, {
        userId,
        role: "assistant",
        message: reply,
        messageType: "text",
        analysis: {
            ...analysis,
            sentiment: "neutral",
            emotionLabel: "neutral",
            emotionScore: 0.2,
            riskKeywords: []
        },
        sessionId
    });
}
//# sourceMappingURL=messageHandler.js.map