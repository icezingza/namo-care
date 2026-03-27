import { analyzeMessage } from "../ai/emotionAnalyzer";
import type { AppContext, CombinedAnalysis, Severity } from "../types";
import {
  createBehaviorSignal,
  markLatestMedicationTaken,
  saveConversationLog,
  updateDailyCheckinResponse
} from "../services/firestoreService";
import { computeAndSaveRiskScore } from "../services/riskScoreService";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { replyText } from "../services/lineService";

function getSessionId(userId: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `sess_${date}_${userId.slice(0, 8)}`;
}

function buildAssistantReply(analysis: CombinedAnalysis, medicationTaken: boolean): string {
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

  if (analysis.emergencyFlag) {
    const emergSeverity = analysis.emergencySeverity ?? "critical";
    await createBehaviorSignal(ctx.db, userId, "emotion", 100, emergSeverity, [userLogId]);
    await dispatchCaregiverAlert(ctx, {
      userId,
      type: "emergency",
      severity: emergSeverity,
      title: "ผู้สูงอายุส่งสัญญาณขอความช่วยเหลือ",
      detail: "พบคำขอความช่วยเหลือฉุกเฉินในข้อความ กรุณาติดต่อกลับทันที",
      sourceMessage: text
    });
  } else if (analysis.emotionLabel === "sad" || analysis.emotionLabel === "distress") {
    const severity = toSeverity(riskScore);
    await createBehaviorSignal(ctx.db, userId, "emotion", riskScore, severity, [userLogId]);

    if (analysis.emotionLabel === "distress" && riskScore >= 70) {
      await dispatchCaregiverAlert(ctx, {
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
  computeAndSaveRiskScore(ctx.db, userId).catch(() => undefined);

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
