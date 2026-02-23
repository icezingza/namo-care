import { analyzeMessage } from "../ai/emotionAnalyzer";
import type { AppContext, CombinedAnalysis, Severity } from "../types";
import {
  appendUserRiskScore,
  createBehaviorSignal,
  markLatestMedicationTaken,
  saveConversationLog,
  updateDailyCheckinResponse
} from "../services/firestoreService";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { replyText } from "../services/lineService";

function getSessionId(userId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `sess_${date}_${userId.slice(0, 8)}`;
}

function buildAssistantReply(analysis: CombinedAnalysis, medicationTaken: boolean): string {
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

function toSeverity(score: number): Severity {
  if (score >= 85) return "high";
  if (score >= 70) return "medium";
  return "low";
}

export async function handleUserMessage(
  ctx: AppContext,
  userId: string,
  replyToken: string,
  text: string
): Promise<void> {
  const analysis = analyzeMessage(text);
  const sessionId = getSessionId(userId);

  const userLogId = await saveConversationLog(ctx.db, {
    userId,
    role: "user",
    message: text,
    messageType: "text",
    analysis,
    sessionId
  });

  const medicationTaken = analysis.intent === "medication_confirm"
    ? await markLatestMedicationTaken(ctx.db, userId)
    : false;

  if (analysis.intent === "checkin_response" || analysis.intent === "distress_expression") {
    await updateDailyCheckinResponse(ctx.db, userId, text);
  }

  const riskScore = Math.round(analysis.emotionScore * 100);
  if (analysis.emotionLabel === "sad" || analysis.emotionLabel === "distress") {
    const severity = toSeverity(riskScore);
    await createBehaviorSignal(ctx.db, userId, "emotion", riskScore, severity, [userLogId]);
    await appendUserRiskScore(ctx.db, userId, riskScore);

    if (analysis.emotionLabel === "distress" && riskScore >= 80) {
      await dispatchCaregiverAlert(ctx, {
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
  await replyText(ctx.lineClient, replyToken, reply);

  await saveConversationLog(ctx.db, {
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
