import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { getLineClient, pushFlexMessage } from "../services/lineService";
import { getCaregiverLineIds } from "../services/firestoreService";

// Runs at 08:00 Bangkok time (01:00 UTC) every day
export const sendDailySummary = onSchedule(
  { schedule: "0 1 * * *", timeZone: "Asia/Bangkok" },
  async () => {
    const lineClient = getLineClient();

    // Compute yesterday's date key in Bangkok time (UTC+7)
    const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    bangkokNow.setUTCDate(bangkokNow.getUTCDate() - 1);
    const dateKey = bangkokNow.toISOString().slice(0, 10);
    const dayStart = Timestamp.fromDate(new Date(`${dateKey}T00:00:00+07:00`));
    const dayEnd = Timestamp.fromDate(new Date(`${dateKey}T23:59:59+07:00`));

    const usersSnap = await db.collection("users").where("status", "==", "active").get();
    logger.info("Daily summary: processing users", { count: usersSnap.size, dateKey });

    await Promise.allSettled(
      usersSnap.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const displayName = (userDoc.get("displayName") as string | undefined) || "คุณ";
        const riskProfile = userDoc.get("riskProfile") as
          | { currentScore?: number; trend?: string }
          | undefined;

        try {
          const [checkinSnap, medSnap, caregiverLineIds] = await Promise.all([
            db.collection("dailyCheckins")
              .where("userId", "==", userId)
              .where("dateKey", "==", dateKey)
              .limit(1)
              .get(),
            db.collection("remindersLog")
              .where("userId", "==", userId)
              .where("type", "==", "medication")
              .where("scheduledAt", ">=", dayStart)
              .where("scheduledAt", "<=", dayEnd)
              .get(),
            getCaregiverLineIds(db, userId)
          ]);

          if (caregiverLineIds.length === 0) return;

          const checkinStatus = checkinSnap.empty
            ? undefined
            : (checkinSnap.docs[0].get("status") as string | undefined);
          const totalMeds = medSnap.size;
          const takenMeds = medSnap.docs.filter((d) => d.get("status") === "taken").length;

          const flexContents = buildSummaryFlex(displayName, dateKey, {
            checkinStatus,
            takenMeds,
            totalMeds,
            riskScore: riskProfile?.currentScore,
            trend: riskProfile?.trend
          });
          const altText = `NaMo Care — สรุปสุขภาพ ${displayName} เมื่อวาน`;

          await Promise.all(
            caregiverLineIds.map((lineId) =>
              pushFlexMessage(lineClient, lineId, altText, flexContents).catch((err) =>
                logger.error("Failed to send daily summary", {
                  lineId,
                  userId,
                  err: err instanceof Error ? err.message : String(err)
                })
              )
            )
          );

          logger.info("Daily summary sent", { userId, caregiverCount: caregiverLineIds.length });
        } catch (err) {
          logger.error("Daily summary failed for user", {
            userId,
            err: err instanceof Error ? err.message : String(err)
          });
        }
      })
    );
  }
);

interface SummaryData {
  checkinStatus: string | undefined;
  takenMeds: number;
  totalMeds: number;
  riskScore: number | undefined;
  trend: string | undefined;
}

const CHECKIN_LABEL: Record<string, string> = {
  responded: "✅ เช็กอินแล้ว",
  pending: "⏳ ยังรอตอบ",
  no_response: "❌ ไม่ได้เช็กอิน"
};

const TREND_EMOJI: Record<string, string> = {
  rising: "📈",
  stable: "➡️",
  falling: "📉"
};

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function buildSummaryFlex(name: string, dateKey: string, data: SummaryData): unknown {
  const [y, m, d] = dateKey.split("-").map(Number);
  const displayDate = `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;

  const medText =
    data.totalMeds === 0
      ? "ไม่มีรายการยา"
      : `ทาน ${data.takenMeds}/${data.totalMeds} มื้อ (${Math.round((data.takenMeds / data.totalMeds) * 100)}%)`;

  const checkinText = CHECKIN_LABEL[data.checkinStatus ?? ""] ?? "ไม่มีข้อมูล";
  const trendEmoji = TREND_EMOJI[data.trend ?? ""] ?? "➡️";
  const riskText =
    data.riskScore !== undefined ? `${data.riskScore}/100 ${trendEmoji}` : "ยังไม่ได้คำนวณ";

  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#E67E22",
      paddingAll: "14px",
      contents: [
        { type: "text", text: "📋 NaMo Care — สรุปสุขภาพ", color: "#ffffff", size: "sm", weight: "bold" },
        { type: "text", text: `${name} · ${displayDate}`, color: "#ffe0b2", size: "xs" }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "14px",
      contents: [
        row("💊 การทานยา", medText),
        row("🌙 เช็กอิน", checkinText),
        row("🔬 ความเสี่ยง", riskText),
        { type: "separator", margin: "md" },
        {
          type: "text",
          text: "กรุณาตรวจสอบหากพบค่าผิดปกติ",
          size: "xs",
          color: "#999999",
          wrap: true
        }
      ]
    }
  };
}

function row(label: string, value: string) {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: label, size: "sm", color: "#666666", flex: 3 },
      { type: "text", text: value, size: "sm", color: "#2C3E50", flex: 4, wrap: true, align: "end" }
    ]
  };
}
