import { logger } from "firebase-functions";
import type { AlertPayload, AppContext } from "../types";
import { createAlert, findActiveAlertByDedupeKey, getCaregiverLineIds, markAlertSent } from "../services/firestoreService";
import { pushText, pushFlexMessage } from "../services/lineService";

const SEVERITY_LABEL: Record<string, string> = {
  low: "ℹ️ ข้อมูล",
  medium: "🔔 เฝ้าระวัง",
  high: "⚠️ สำคัญ",
  critical: "🚨 วิกฤต",
};

const TYPE_LABEL: Record<string, string> = {
  emergency: "เหตุฉุกเฉิน",
  inactivity: "ไม่มีความเคลื่อนไหว",
  emotion: "สัญญาณอารมณ์",
  medication_missed: "ลืมทานยา",
  no_checkin: "ไม่ได้เช็กอิน",
};

const HEADER_COLOR: Record<string, string> = {
  critical: "#C0392B",
  high: "#E67E22",
};

function buildFlexAlert(payload: AlertPayload): unknown {
  const headerColor = HEADER_COLOR[payload.severity] ?? "#E67E22";
  const level = SEVERITY_LABEL[payload.severity] || payload.severity;
  const type = TYPE_LABEL[payload.type] || payload.type;
  const timeStr = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok"
  });

  const footerButton = payload.severity === "critical"
    ? { type: "button", action: { type: "uri", label: "โทร 1669 (ฉุกเฉิน)", uri: "tel:1669" }, style: "primary", color: "#C0392B", height: "sm" }
    : { type: "button", action: { type: "uri", label: "เปิด NaMo Care", uri: "https://line.me" }, style: "primary", color: "#E67E22", height: "sm" };
  const footer = { type: "box", layout: "vertical", paddingAll: "12px", contents: [footerButton] };

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: headerColor,
      paddingAll: "14px",
      contents: [
        { type: "text", text: `${level}  NaMo Care`, color: "#ffffff", size: "sm", weight: "bold" },
        { type: "text", text: type, color: "#ffdddd", size: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "14px",
      contents: [
        { type: "text", text: payload.title, size: "md", weight: "bold", wrap: true, color: "#2C3E50" },
        { type: "text", text: payload.detail, size: "sm", wrap: true, color: "#666666" },
        { type: "separator", margin: "md" },
        { type: "text", text: `เวลา ${timeStr} น.`, size: "xs", color: "#999999" }
      ]
    },
    footer
  };
}

function formatAlertMessage(payload: AlertPayload): string {
  const level = SEVERITY_LABEL[payload.severity] || payload.severity;
  const type = TYPE_LABEL[payload.type] || payload.type;
  return `NaMo Care แจ้งเตือน\n${level} — ${type}\n\n${payload.title}\n${payload.detail}`;
}

export async function dispatchCaregiverAlert(ctx: AppContext, payload: AlertPayload): Promise<string> {
  const dedupeKey = `${payload.userId}:${payload.type}:${new Date().toISOString().slice(0, 13)}`;
  const existingId = await findActiveAlertByDedupeKey(ctx.db, dedupeKey);
  if (existingId) {
    logger.info("Alert deduplicated, skipping dispatch", { dedupeKey, existingId });
    return existingId;
  }

  const alertId = await createAlert(ctx.db, payload);
  const caregiverLineIds = await getCaregiverLineIds(ctx.db, payload.userId);

  const useFlexMessage = payload.severity === "critical" || payload.severity === "high";
  const flexContents = useFlexMessage ? buildFlexAlert(payload) : null;
  const textMessage = formatAlertMessage(payload);
  const altText = `NaMo Care — ${TYPE_LABEL[payload.type] ?? payload.type}`;

  await Promise.all(
    caregiverLineIds.map(async (lineId) => {
      try {
        if (flexContents) {
          await pushFlexMessage(ctx.lineClient, lineId, altText, flexContents);
        } else {
          await pushText(ctx.lineClient, lineId, textMessage);
        }
      } catch (error) {
        logger.error("Failed to push alert to caregiver", {
          lineId,
          alertId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    })
  );

  await markAlertSent(ctx.db, alertId);
  return alertId;
}
