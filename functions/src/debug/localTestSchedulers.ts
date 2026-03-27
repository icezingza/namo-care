import type { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { analyzeMessage } from "../ai/emotionAnalyzer";
import { createBehaviorSignal, getCaregiverLineIds } from "../services/firestoreService";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { getLineClient, pushFlexMessage } from "../services/lineService";
import { computeAndSaveRiskScore } from "../services/riskScoreService";
import { buildSummaryFlex } from "../schedulers/dailySummaryScheduler";
import { assertPost, authorizeLocalTest } from "./localTestEndpoints";

interface CheckinBody {
  userId?: string;
}

interface InactivityBody {
  userId?: string;
  inactiveHours?: number;
}

interface SummaryBody {
  userId?: string;
  dateKey?: string;
}

interface EmotionBody {
  text?: string;
}

function getJsonBody<T>(req: Request): T {
  return (req.body || {}) as T;
}

// Seeds a pending dailyCheckin (sentAt = 3h ago) and triggers escalation for userId
export const testCheckinEscalation = onRequest(
  { region: "asia-southeast1", memory: "256MiB" },
  async (req: Request, res: Response) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res)) return;

    const { userId } = getJsonBody<CheckinBody>(req);
    if (!userId?.trim()) {
      res.status(400).json({ ok: false, error: "Missing required field: userId" });
      return;
    }

    const lineClient = getLineClient();
    const sentAt = Timestamp.fromMillis(Date.now() - 3 * 60 * 60 * 1000);
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const checkinRef = db.collection("dailyCheckins").doc();
    await checkinRef.set({
      userId,
      dateKey: today,
      scheduledAt: sentAt,
      sentAt,
      respondedAt: null,
      status: "pending",
      response: { text: null, wellbeing: null, emotionLabel: null, emotionScore: null },
      alertTriggered: false,
      updatedAt: sentAt
    });

    await createBehaviorSignal(db, userId, "checkin", 70, "medium", [checkinRef.id]);
    const alertId = await dispatchCaregiverAlert(
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

    await checkinRef.set(
      { status: "no_response", alertTriggered: true, updatedAt: Timestamp.now() },
      { merge: true }
    );

    res.status(200).json({ ok: true, userId, checkinId: checkinRef.id, alertId });
  }
);

// Sets lastActiveAt to X hours ago and triggers inactivity alert for userId
export const testInactivityAlert = onRequest(
  { region: "asia-southeast1", memory: "256MiB" },
  async (req: Request, res: Response) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res)) return;

    const body = getJsonBody<InactivityBody>(req);
    const userId = body.userId?.trim();
    if (!userId) {
      res.status(400).json({ ok: false, error: "Missing required field: userId" });
      return;
    }

    const inactiveHours = typeof body.inactiveHours === "number" ? Math.max(1, body.inactiveHours) : 8;
    const lineClient = getLineClient();
    const lastActiveAt = Timestamp.fromMillis(Date.now() - inactiveHours * 60 * 60 * 1000);

    await db
      .collection("users")
      .doc(userId)
      .set({ lastActiveAt, updatedAt: Timestamp.now() }, { merge: true });

    const silenceScore = Math.min(90, 50 + inactiveHours * 5);
    const severity = inactiveHours >= 12 ? "high" : "medium";

    await createBehaviorSignal(db, userId, "silence", silenceScore, severity, []);
    const alertId = await dispatchCaregiverAlert(
      { db, lineClient },
      {
        userId,
        type: "inactivity",
        severity,
        title: "ไม่พบความเคลื่อนไหวของผู้สูงอายุ",
        detail: `ไม่มีกิจกรรมในระบบมาแล้วประมาณ ${inactiveHours} ชั่วโมง กรุณาตรวจสอบ`
      }
    );
    computeAndSaveRiskScore(db, userId).catch(() => undefined);

    await db
      .collection("users")
      .doc(userId)
      .set(
        { monitoring: { lastInactivityAlertAt: Timestamp.now() }, updatedAt: Timestamp.now() },
        { merge: true }
      );

    res.status(200).json({ ok: true, userId, inactiveHours, silenceScore, severity, alertId });
  }
);

// Sends daily summary Flex Message for a single userId immediately
export const testDailySummary = onRequest(
  { region: "asia-southeast1", memory: "256MiB" },
  async (req: Request, res: Response) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res)) return;

    const body = getJsonBody<SummaryBody>(req);
    const userId = body.userId?.trim();
    if (!userId) {
      res.status(400).json({ ok: false, error: "Missing required field: userId" });
      return;
    }

    const bangkokNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dateKey = body.dateKey?.trim() || bangkokNow.toISOString().slice(0, 10);
    const dayStart = Timestamp.fromDate(new Date(`${dateKey}T00:00:00+07:00`));
    const dayEnd = Timestamp.fromDate(new Date(`${dateKey}T23:59:59+07:00`));

    const [userSnap, checkinSnap, medSnap, caregiverLineIds] = await Promise.all([
      db.collection("users").doc(userId).get(),
      db.collection("dailyCheckins").where("userId", "==", userId).where("dateKey", "==", dateKey).limit(1).get(),
      db.collection("remindersLog")
        .where("userId", "==", userId)
        .where("type", "==", "medication")
        .where("scheduledAt", ">=", dayStart)
        .where("scheduledAt", "<=", dayEnd)
        .get(),
      getCaregiverLineIds(db, userId)
    ]);

    if (caregiverLineIds.length === 0) {
      res.status(200).json({ ok: true, userId, dateKey, caregiverCount: 0, note: "ไม่พบผู้ดูแลที่เชื่อมต่อ" });
      return;
    }

    const displayName = (userSnap.get("displayName") as string | undefined) || "คุณ";
    const riskProfile = userSnap.get("riskProfile") as { currentScore?: number; trend?: string } | undefined;
    const checkinStatus = checkinSnap.empty ? undefined : (checkinSnap.docs[0].get("status") as string | undefined);
    const totalMeds = medSnap.size;
    const takenMeds = medSnap.docs.filter((d) => d.get("status") === "taken").length;

    const lineClient = getLineClient();
    const flexContents = buildSummaryFlex(displayName, dateKey, {
      checkinStatus,
      takenMeds,
      totalMeds,
      riskScore: riskProfile?.currentScore,
      trend: riskProfile?.trend
    });

    await Promise.all(
      caregiverLineIds.map((lineId) =>
        pushFlexMessage(lineClient, lineId, `NaMo Care — สรุปสุขภาพ ${displayName}`, flexContents)
      )
    );

    res.status(200).json({ ok: true, userId, dateKey, caregiverCount: caregiverLineIds.length });
  }
);

// Runs Thai NLP analysis on input text and returns CombinedAnalysis result
export const testEmotionAnalysis = onRequest(
  { region: "asia-southeast1", memory: "128MiB" },
  async (req: Request, res: Response) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res)) return;

    const { text } = getJsonBody<EmotionBody>(req);
    if (!text?.trim()) {
      res.status(400).json({ ok: false, error: "Missing required field: text" });
      return;
    }

    const result = analyzeMessage(text.trim());
    res.status(200).json({ ok: true, text: text.trim(), analysis: result });
  }
);
