import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { getLineClient, pushText } from "../services/lineService";

function nextReminderAfter(reference: Timestamp): Timestamp {
  const next = new Date(reference.toDate().getTime() + 24 * 60 * 60 * 1000);
  return Timestamp.fromDate(next);
}

export const sendMedicationReminders = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "asia-southeast1",
    timeZone: "Asia/Bangkok",
    memory: "256MiB"
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

      const userSnapshot = await db.collection("users").doc(userId).get();
      const userData = userSnapshot.data() || {};
      const lineUserId = (userData.lineUserId as string | undefined) || userId;

      const name = (schedule.name as string | undefined) || "ยาประจำวัน";
      const dosage = (schedule.dosage as string | undefined) || "1 เม็ด";
      const scheduledText = schedule.nextReminderAt instanceof Timestamp
        ? schedule.nextReminderAt.toDate().toLocaleString("th-TH", { hour: "2-digit", minute: "2-digit" })
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
          updatedAt: now
        });

        const baseTime =
          schedule.nextReminderAt instanceof Timestamp
            ? schedule.nextReminderAt
            : now;

        await scheduleDoc.ref.update({
          lastSentAt: now,
          nextReminderAt: nextReminderAfter(baseTime),
          updatedAt: now
        });
      } catch (error) {
        logger.error("Failed to send medication reminder", {
          scheduleId: scheduleDoc.id,
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
);
