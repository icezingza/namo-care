import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { createBehaviorSignal } from "../services/firestoreService";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { getLineClient } from "../services/lineService";
import { computeAndSaveRiskScore } from "../services/riskScoreService";

const CHECKIN_RESPONSE_TIMEOUT_MS = 2 * 60 * 60 * 1000;

export const escalateNoResponseCheckins = onSchedule(
  {
    schedule: "every 30 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB"
  },
  async () => {
    const threshold = Timestamp.fromMillis(Date.now() - CHECKIN_RESPONSE_TIMEOUT_MS);
    const lineClient = getLineClient();

    const pending = await db
      .collection("dailyCheckins")
      .where("status", "==", "pending")
      .where("sentAt", "<=", threshold)
      .limit(200)
      .get();

    for (const doc of pending.docs) {
      const data = doc.data();
      const userId = data.userId as string | undefined;
      if (!userId) continue;

      try {
        await createBehaviorSignal(db, userId, "checkin", 70, "medium", [doc.id]);
        await dispatchCaregiverAlert(
          { db, lineClient },
          {
            userId,
            type: "no_checkin",
            severity: "medium",
            title: "ผู้สูงอายุไม่ได้เช็กอินประจำวัน",
            detail: "ไม่มีการตอบรับภายใน 2 ชั่วโมง กรุณาติดต่อเพื่อสอบถามอาการ"
          }
        );
        computeAndSaveRiskScore(db, userId).catch(() => undefined);

        await doc.ref.set(
          {
            status: "no_response",
            alertTriggered: true,
            updatedAt: Timestamp.now()
          },
          { merge: true }
        );
      } catch (error) {
        logger.error("Failed to escalate pending check-in", {
          checkinId: doc.id,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
);
