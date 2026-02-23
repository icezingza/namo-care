import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { getLineClient } from "../services/lineService";

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
        await dispatchCaregiverAlert(
          { db, lineClient },
          {
            userId,
            type: "no_checkin",
            severity: "medium",
            title: "No daily check-in response",
            detail: "No response to daily check-in within 2 hours."
          }
        );

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
