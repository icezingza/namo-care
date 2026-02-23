import type { CombinedAnalysis, EmotionAnalysis, IntentAnalysis } from "../types";
import { detectEmergencyKeyword } from "../utils/emergencyKeywords";

const POSITIVE_WORDS = ["ดี", "สบายดี", "โอเค", "thanks", "thank you", "great", "good", "happy"];
const NEGATIVE_WORDS = ["เศร้า", "เหงา", "เหนื่อย", "แย่", "ไม่ดี", "sad", "lonely", "tired", "stress"];
const DISTRESS_WORDS = ["ไม่ไหว", "ร้องไห้", "หมดแรง", "panic", "hopeless", "กลัวมาก"];

export function analyzeEmotion(message: string): EmotionAnalysis {
  const text = message.toLowerCase();
  const positiveHits = POSITIVE_WORDS.filter((w) => text.includes(w)).length;
  const negativeHits = NEGATIVE_WORDS.filter((w) => text.includes(w)).length;
  const distressHits = DISTRESS_WORDS.filter((w) => text.includes(w)).length;

  const total = positiveHits + negativeHits + distressHits;
  if (total === 0) {
    return {
      sentiment: "neutral",
      emotionLabel: "neutral",
      emotionScore: 0.3,
      riskKeywords: []
    };
  }

  if (distressHits > 0) {
    return {
      sentiment: "negative",
      emotionLabel: "distress",
      emotionScore: Math.min(0.95, 0.65 + distressHits * 0.1),
      riskKeywords: DISTRESS_WORDS.filter((w) => text.includes(w))
    };
  }

  if (negativeHits > positiveHits) {
    return {
      sentiment: "negative",
      emotionLabel: "sad",
      emotionScore: Math.min(0.9, 0.55 + negativeHits * 0.08),
      riskKeywords: NEGATIVE_WORDS.filter((w) => text.includes(w))
    };
  }

  if (positiveHits > 0) {
    return {
      sentiment: "positive",
      emotionLabel: "happy",
      emotionScore: Math.min(0.85, 0.5 + positiveHits * 0.07),
      riskKeywords: []
    };
  }

  return {
    sentiment: "neutral",
    emotionLabel: "neutral",
    emotionScore: 0.35,
    riskKeywords: []
  };
}

export function detectIntent(message: string): IntentAnalysis {
  const text = message.toLowerCase();

  if (
    text.includes("กินยาแล้ว") ||
    text.includes("ทานยาแล้ว") ||
    text.includes("taken") ||
    text.includes("ok taken")
  ) {
    return { intent: "medication_confirm" };
  }

  if (
    text.includes("สบายดี") ||
    text.includes("โอเค") ||
    text.includes("ไม่ค่อยสบาย") ||
    text.includes("i am fine")
  ) {
    return { intent: "checkin_response" };
  }

  if (text.includes("เหงา") || text.includes("เศร้า") || text.includes("sad")) {
    return { intent: "distress_expression" };
  }

  if (text.length > 0) {
    return { intent: "small_talk" };
  }

  return { intent: "unknown" };
}

export function analyzeMessage(message: string): CombinedAnalysis {
  const emotion = analyzeEmotion(message);
  const intent = detectIntent(message);
  const emergency = detectEmergencyKeyword(message);
  return {
    ...emotion,
    ...intent,
    emergencyFlag: emergency.matched,
    riskKeywords: [...new Set([...emotion.riskKeywords, ...emergency.keywords])]
  };
}
