import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { createBehaviorSignal } from "../services/firestoreService";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { getLineClient } from "../services/lineService";
import { computeAndSaveRiskScore } from "../services/riskScoreService";

const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export const watchInactivitySignals = onSchedule(
  {
    schedule: "every 30 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB"
  },
  async () => {
    const nowMs = Date.now();
    const now = Timestamp.now();
    const lineClient = getLineClient();

    const activeUsers = await db
      .collection("users")
      .where("status", "==", "active")
      .limit(500)
      .get();

    for (const userDoc of activeUsers.docs) {
      const data = userDoc.data();
      const userId = userDoc.id;
      const rawThreshold =
        typeof data.settings?.inactivityThresholdHours === "number"
          ? data.settings.inactivityThresholdHours
          : 6;
      const thresholdHours = Math.max(1, rawThreshold);
      const thresholdMs = thresholdHours * 60 * 60 * 1000;

      const lastActiveMs = toMillis(data.lastActiveAt);
      if (lastActiveMs <= 0) continue;

      const inactiveMs = nowMs - lastActiveMs;
      if (inactiveMs < thresholdMs) continue;

      const lastAlertMs = toMillis(data.monitoring?.lastInactivityAlertAt);
      if (lastAlertMs > 0 && nowMs - lastAlertMs < ALERT_COOLDOWN_MS) {
        continue;
      }

      try {
        const inactiveHoursRounded = Math.floor(inactiveMs / (60 * 60 * 1000));
        const silenceScore = Math.min(90, 50 + inactiveHoursRounded * 5);
        const severity = inactiveHoursRounded >= 12 ? "high" : "medium";
        await createBehaviorSignal(db, userId, "silence", silenceScore, severity, []);
        await dispatchCaregiverAlert(
          { db, lineClient },
          {
            userId,
            type: "inactivity",
            severity,
            title: "ไม่พบความเคลื่อนไหวของผู้สูงอายุ",
            detail: `ไม่มีกิจกรรมในระบบมาแล้วประมาณ ${inactiveHoursRounded} ชั่วโมง กรุณาตรวจสอบ`
          }
        );
        computeAndSaveRiskScore(db, userId).catch(() => undefined);

        await userDoc.ref.set(
          {
            monitoring: {
              lastInactivityAlertAt: now
            },
            updatedAt: now
          },
          { merge: true }
        );
      } catch (error) {
        logger.error("Failed to dispatch inactivity alert", {
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
);
