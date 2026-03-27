import type { CombinedAnalysis, EmotionAnalysis, IntentAnalysis } from "../types";
import { detectEmergencyKeyword } from "../utils/emergencyKeywords";

// Use specific multi-character Thai phrases to avoid substring false positives.
// e.g. "สบายดี" is positive, but "ไม่สบายดี" must not be counted as positive.
const POSITIVE_WORDS = ["สบายดี", "โอเค", "ดีมาก", "มีความสุข", "ดีใจ", "สนุก", "แจ่มมาก", "รู้สึกดี"];
const NEGATIVE_WORDS = ["เศร้า", "เหงา", "เหนื่อย", "แย่", "เครียด", "กังวล", "เบื่อ", "ไม่สบาย", "ป่วย", "ซึมเศร้า"];
const DISTRESS_WORDS = ["ไม่ไหว", "ร้องไห้", "หมดแรง", "ทนไม่ได้", "กลัวมาก", "สิ้นหวัง", "อยากตาย", "เจ็บมาก", "ปวดมาก"];

// "ไม่" in Thai = 3 UTF-16 code units (U+0E44, U+0E21, U+0E48)
const NEGATION = "ไม่";

function isNegated(text: string, word: string): boolean {
  let idx = text.indexOf(word);
  while (idx !== -1) {
    // "ไม่" directly before (no space) or with one space
    const before = text.slice(Math.max(0, idx - NEGATION.length), idx);
    const beforeSpaced = text.slice(Math.max(0, idx - NEGATION.length - 1), idx);
    if (before === NEGATION || beforeSpaced === NEGATION + " ") return true;
    idx = text.indexOf(word, idx + 1);
  }
  return false;
}

function matchWords(text: string, words: string[]): string[] {
  return words.filter((w) => text.includes(w) && !isNegated(text, w));
}

export function analyzeEmotion(message: string): EmotionAnalysis {
  // Thai has no case; .toLowerCase() still needed for any English fallback words
  const text = message.toLowerCase();

  const positiveMatches = matchWords(text, POSITIVE_WORDS);
  const negativeMatches = matchWords(text, NEGATIVE_WORDS);
  const distressMatches = matchWords(text, DISTRESS_WORDS);

  if (distressMatches.length > 0) {
    return {
      sentiment: "negative",
      emotionLabel: "distress",
      emotionScore: Math.min(0.95, 0.65 + distressMatches.length * 0.1),
      riskKeywords: distressMatches
    };
  }

  if (negativeMatches.length > positiveMatches.length) {
    return {
      sentiment: "negative",
      emotionLabel: "sad",
      emotionScore: Math.min(0.9, 0.55 + negativeMatches.length * 0.08),
      riskKeywords: negativeMatches
    };
  }

  if (positiveMatches.length > 0) {
    return {
      sentiment: "positive",
      emotionLabel: "happy",
      emotionScore: Math.min(0.85, 0.5 + positiveMatches.length * 0.07),
      riskKeywords: []
    };
  }

  return {
    sentiment: "neutral",
    emotionLabel: "neutral",
    emotionScore: 0.3,
    riskKeywords: []
  };
}

export function detectIntent(message: string): IntentAnalysis {
  const text = message.toLowerCase();

  const MED_CONFIRM = ["กินยาแล้ว", "ทานยาแล้ว", "รับยาแล้ว", "กินแล้ว", "ทานแล้ว"];
  if (MED_CONFIRM.some((w) => text.includes(w))) {
    return { intent: "medication_confirm" };
  }

  const CHECKIN = ["สบายดี", "โอเค", "ไม่ค่อยสบาย", "พอไหว", "ก็ได้", "เฉยๆ", "ปกติ"];
  if (CHECKIN.some((w) => text.includes(w))) {
    return { intent: "checkin_response" };
  }

  const DISTRESS_INTENT = ["เหงา", "เศร้า", "ไม่ไหว", "เหนื่อย", "หมดแรง", "ร้องไห้", "ทนไม่ได้"];
  if (DISTRESS_INTENT.some((w) => text.includes(w))) {
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
    emergencySeverity: emergency.severity,
    riskKeywords: [...new Set([...emotion.riskKeywords, ...emergency.keywords])]
  };
}
