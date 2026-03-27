import type { Firestore } from "firebase-admin/firestore";
import type line from "@line/bot-sdk";

export type Severity = "low" | "medium" | "high" | "critical";
export type AlertType = "emergency" | "inactivity" | "emotion" | "medication_missed" | "no_checkin";

export interface EmotionAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  emotionLabel: "happy" | "neutral" | "sad" | "distress";
  emotionScore: number;
  riskKeywords: string[];
}

export interface IntentAnalysis {
  intent: "medication_confirm" | "checkin_response" | "small_talk" | "distress_expression" | "unknown";
}

export interface CombinedAnalysis extends EmotionAnalysis, IntentAnalysis {
  emergencyFlag: boolean;
  emergencySeverity: "critical" | "high" | null;
}

export interface AppContext {
  db: Firestore;
  lineClient: line.messagingApi.MessagingApiClient;
}

export interface AlertPayload {
  userId: string;
  type: AlertType;
  severity: Severity;
  title: string;
  detail: string;
  sourceMessage?: string;
}
