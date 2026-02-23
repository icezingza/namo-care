import { logger } from "firebase-functions";
import type { AlertPayload, AppContext } from "../types";
import { createAlert, getCaregiverLineIds, markAlertSent } from "../services/firestoreService";
import { pushText } from "../services/lineService";

function formatAlertMessage(payload: AlertPayload): string {
  const severityMap: Record<string, string> = {
    low: "Info",
    medium: "Watch",
    high: "High",
    critical: "Critical"
  };
  const level = severityMap[payload.severity] || payload.severity;
  return `NaMo Alert (${level})\n${payload.title}\n${payload.detail}`;
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
