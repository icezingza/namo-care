"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUserMessage = handleUserMessage;
const emotionAnalyzer_1 = require("../ai/emotionAnalyzer");
const firestoreService_1 = require("../services/firestoreService");
const alertDispatcher_1 = require("../notifications/alertDispatcher");
const lineService_1 = require("../services/lineService");
function getSessionId(userId) {
    const date = new Date().toISOString().slice(0, 10);
    return `sess_${date}_${userId.slice(0, 8)}`;
}
function buildAssistantReply(analysis, medicationTaken) {
    if (analysis.intent === "medication_confirm") {
        if (medicationTaken) {
            return "Great. Your medication has been recorded. Thank you for confirming.";
        }
        return "Thank you. I noted your confirmation. If this was for medication, I can keep watching your schedule.";
    }
    if (analysis.emotionLabel === "distress") {
        return "I hear that this feels heavy. You are not alone. I can notify your caregiver if you want immediate support.";
    }
    if (analysis.emotionLabel === "sad") {
        return "Thank you for sharing. I am here with you. Would you like to talk a little more about how you feel?";
    }
    if (analysis.intent === "checkin_response") {
        return "Thank you for checking in. I have updated your daily wellbeing status.";
    }
    return "Thank you for your message. I am here to chat and support you anytime.";
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
    if (analysis.emotionLabel === "sad" || analysis.emotionLabel === "distress") {
        const severity = toSeverity(riskScore);
        await (0, firestoreService_1.createBehaviorSignal)(ctx.db, userId, "emotion", riskScore, severity, [userLogId]);
        await (0, firestoreService_1.appendUserRiskScore)(ctx.db, userId, riskScore);
        if (analysis.emotionLabel === "distress" && riskScore >= 80) {
            await (0, alertDispatcher_1.dispatchCaregiverAlert)(ctx, {
                userId,
                type: "emotion",
                severity: "high",
                title: "Distress signal detected",
                detail: "Recent message indicates high emotional distress. Please check in.",
                sourceMessage: text
            });
        }
    }
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