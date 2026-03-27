import { logger } from "firebase-functions";
import type { AlertPayload, AppContext } from "../types";
import { createAlert, getCaregiverLineIds, markAlertSent } from "../services/firestoreService";
import { pushText } from "../services/lineService";

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

function formatAlertMessage(payload: AlertPayload): string {
  const level = SEVERITY_LABEL[payload.severity] || payload.severity;
  const type = TYPE_LABEL[payload.type] || payload.type;
  return `NaMo Care แจ้งเตือน\n${level} — ${type}\n\n${payload.title}\n${payload.detail}`;
}

export async function dispatchCaregiverAlert(ctx: AppContext, payload: AlertPayload): Promise<string> {
  const alertId = await createAlert(ctx.db, payload);
  const caregiverLineIds = await getCaregiverLineIds(ctx.db, payload.userId);
  const message = formatAlertMessage(payload);

  await Promise.all(
    caregiverLineIds.map(async (lineId) => {
      try {
        await pushText(ctx.lineClient, lineId, message);
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
