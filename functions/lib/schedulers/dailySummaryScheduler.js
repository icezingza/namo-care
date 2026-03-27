"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendDailySummary = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-admin/firestore");
const bootstrap_1 = require("../bootstrap");
const lineService_1 = require("../services/lineService");
const firestoreService_1 = require("../services/firestoreService");
// Runs at 08:00 Bangkok time (01:00 UTC) every day
exports.sendDailySummary = (0, scheduler_1.onSchedule)({ schedule: "0 1 * * *", timeZone: "Asia/Bangkok" }, async () => {
    const lineClient = (0, lineService_1.getLineClient)();
    // Compute yesterday's date key in Bangkok time (UTC+7)
    const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    bangkokNow.setUTCDate(bangkokNow.getUTCDate() - 1);
    const dateKey = bangkokNow.toISOString().slice(0, 10);
    const dayStart = firestore_1.Timestamp.fromDate(new Date(`${dateKey}T00:00:00+07:00`));
    const dayEnd = firestore_1.Timestamp.fromDate(new Date(`${dateKey}T23:59:59+07:00`));
    const usersSnap = await bootstrap_1.db.collection("users").where("status", "==", "active").get();
    firebase_functions_1.logger.info("Daily summary: processing users", { count: usersSnap.size, dateKey });
    await Promise.allSettled(usersSnap.docs.map(async (userDoc) => {
        const userId = userDoc.id;
        const displayName = userDoc.get("displayName") || "คุณ";
        const riskProfile = userDoc.get("riskProfile");
        try {
            const [checkinSnap, medSnap, caregiverLineIds] = await Promise.all([
                bootstrap_1.db.collection("dailyCheckins")
                    .where("userId", "==", userId)
                    .where("dateKey", "==", dateKey)
                    .limit(1)
                    .get(),
                bootstrap_1.db.collection("remindersLog")
                    .where("userId", "==", userId)
                    .where("type", "==", "medication")
                    .where("scheduledAt", ">=", dayStart)
                    .where("scheduledAt", "<=", dayEnd)
                    .get(),
                (0, firestoreService_1.getCaregiverLineIds)(bootstrap_1.db, userId)
            ]);
            if (caregiverLineIds.length === 0)
                return;
            const checkinStatus = checkinSnap.empty
                ? undefined
                : checkinSnap.docs[0].get("status");
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
            await Promise.all(caregiverLineIds.map((lineId) => (0, lineService_1.pushFlexMessage)(lineClient, lineId, altText, flexContents).catch((err) => firebase_functions_1.logger.error("Failed to send daily summary", {
                lineId,
                userId,
                err: err instanceof Error ? err.message : String(err)
            }))));
            firebase_functions_1.logger.info("Daily summary sent", { userId, caregiverCount: caregiverLineIds.length });
        }
        catch (err) {
            firebase_functions_1.logger.error("Daily summary failed for user", {
                userId,
                err: err instanceof Error ? err.message : String(err)
            });
        }
    }));
});
const CHECKIN_LABEL = {
    responded: "✅ เช็กอินแล้ว",
    pending: "⏳ ยังรอตอบ",
    no_response: "❌ ไม่ได้เช็กอิน"
};
const TREND_EMOJI = {
    rising: "📈",
    stable: "➡️",
    falling: "📉"
};
const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
function buildSummaryFlex(name, dateKey, data) {
    const [y, m, d] = dateKey.split("-").map(Number);
    const displayDate = `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
    const medText = data.totalMeds === 0
        ? "ไม่มีรายการยา"
        : `ทาน ${data.takenMeds}/${data.totalMeds} มื้อ (${Math.round((data.takenMeds / data.totalMeds) * 100)}%)`;
    const checkinText = CHECKIN_LABEL[data.checkinStatus ?? ""] ?? "ไม่มีข้อมูล";
    const trendEmoji = TREND_EMOJI[data.trend ?? ""] ?? "➡️";
    const riskText = data.riskScore !== undefined ? `${data.riskScore}/100 ${trendEmoji}` : "ยังไม่ได้คำนวณ";
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
function row(label, value) {
    return {
        type: "box",
        layout: "horizontal",
        contents: [
            { type: "text", text: label, size: "sm", color: "#666666", flex: 3 },
            { type: "text", text: value, size: "sm", color: "#2C3E50", flex: 4, wrap: true, align: "end" }
        ]
    };
}
//# sourceMappingURL=dailySummaryScheduler.js.map