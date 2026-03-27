import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { getLineClient, pushText } from "../services/lineService";
import { computeAndSaveRiskScore } from "../services/riskScoreService";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";

const MISSED_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours past reminder = missed

function nextReminderAfter(reference: Timestamp): Timestamp {
  const next = new Date(reference.toDate().getTime() + 24 * 60 * 60 * 1000);
  return Timestamp.fromDate(next);
}

async function handleMissedReminders(
  userId: string,
  scheduleId: string,
  lineClient: ReturnType<typeof getLineClient>
): Promise<void> {
  const cutoff = Timestamp.fromMillis(Date.now() - MISSED_THRESHOLD_MS);

  // Find pending reminders older than the threshold (not yet confirmed)
  const missed = await db
    .collection("remindersLog")
    .where("userId", "==", userId)
    .where("scheduleId", "==", scheduleId)
    .where("status", "==", "pending")
    .where("sentAt", "<=", cutoff)
    .limit(5)
    .get();

  if (missed.empty) return;

  for (const doc of missed.docs) {
    // Mark as missed
    await doc.ref.update({
      status: "missed",
      updatedAt: Timestamp.now(),
    });

    // Create adherence behavior signal (score 60–80 based on how many missed)
    const signalId = await (async () => {
      const ref = db.collection("behaviorSignals").doc();
      await ref.set({
        userId,
        signalType: "adherence",
        score: 65,
        severity: "medium",
        sourceRefs: [doc.id],
        windowStart: doc.data().sentAt as Timestamp,
        windowEnd: Timestamp.now(),
        computedAt: Timestamp.now(),
      });
      return ref.id;
    })();

    logger.info("Adherence signal created for missed medication", { userId, signalId });

    // Check if caregiver should be alerted (only if not already alerted for this log)
    if (!doc.data().alertedCaregiver) {
      try {
        await dispatchCaregiverAlert(
          { db, lineClient },
          {
            userId,
            type: "medication_missed",
            severity: "medium",
            title: "ลืมทานยา",
            detail: `ไม่ได้ยืนยันการทานยาภายใน 2 ชั่วโมงหลังได้รับแจ้งเตือนค่ะ`,
          }
        );
        await doc.ref.update({ alertedCaregiver: true });
      } catch (err) {
        logger.warn("Failed to dispatch medication_missed alert", {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Recompute risk score asynchronously
    computeAndSaveRiskScore(db, userId).catch(() => undefined);
  }
}

export const sendMedicationReminders = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB",
  },
  async () => {
    const now = Timestamp.now();
    const lineClient = getLineClient();

    const dueSnapshot = await db
      .collection("medicationSchedules")
      .where("isActive", "==", true)
      .where("nextReminderAt", "<=", now)
      .limit(200)
      .get();

    for (const scheduleDoc of dueSnapshot.docs) {
      const schedule = scheduleDoc.data();
      const userId = schedule.userId as string | undefined;
      if (!userId) continue;

      // Detect and handle missed reminders before sending a new one
      try {
        await handleMissedReminders(userId, scheduleDoc.id, lineClient);
      } catch (err) {
        logger.warn("handleMissedReminders failed", {
          scheduleId: scheduleDoc.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      const userSnapshot = await db.collection("users").doc(userId).get();
      const userData = userSnapshot.data() || {};
      const lineUserId = (userData.lineUserId as string | undefined) || userId;

      const name = (schedule.name as string | undefined) || "ยาประจำวัน";
      const dosage = (schedule.dosage as string | undefined) || "1 เม็ด";
      const scheduledText =
        schedule.nextReminderAt instanceof Timestamp
          ? schedule.nextReminderAt
              .toDate()
              .toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })
          : "ตามเวลาที่กำหนด";

      const reminderText =
        `🔔 ถึงเวลากินยาแล้วนะคะ\n` +
        `ยา: ${name} ${dosage}\n` +
        `เวลา: ${scheduledText}\n` +
        `ตอบว่า "กินยาแล้ว" ได้เลยค่ะ`;

      try {
        await pushText(lineClient, lineUserId, reminderText);

        await db.collection("remindersLog").add({
          userId,
          scheduleId: scheduleDoc.id,
          type: "medication",
          scheduledAt: schedule.nextReminderAt || now,
          sentAt: now,
          status: "pending",
          confirmedAt: null,
          followUpCount: 0,
          alertedCaregiver: false,
          updatedAt: now,
        });

        const baseTime =
          schedule.nextReminderAt instanceof Timestamp
            ? schedule.nextReminderAt
            : now;

        await scheduleDoc.ref.update({
          lastSentAt: now,
          nextReminderAt: nextReminderAfter(baseTime),
          updatedAt: now,
        });
      } catch (error) {
        logger.error("Failed to send medication reminder", {
          scheduleId: scheduleDoc.id,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
);
