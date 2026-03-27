import type { Request, Response } from "express";
import { onRequest } from "firebase-functions/v2/https";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../bootstrap";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { ensureUser } from "../services/firestoreService";
import { getLineClient, pushText } from "../services/lineService";

type AlertType = "emergency" | "inactivity" | "emotion" | "medication_missed" | "no_checkin";
type Severity = "low" | "medium" | "high" | "critical";

interface ReminderBody {
  userId?: string;
  medicationName?: string;
  dosage?: string;
  scheduledTime?: string;
}

interface AlertBody {
  userId?: string;
  type?: AlertType;
  severity?: Severity;
  title?: string;
  detail?: string;
}

interface LinkBody {
  userId?: string;
  caregiverLineUserId?: string;
  caregiverDisplayName?: string;
  relationship?: string;
}

function getJsonBody<T>(req: Request): T {
  return (req.body || {}) as T;
}

export function assertPost(req: Request, res: Response): boolean {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Use POST" });
    return false;
  }
  return true;
}

export function authorizeLocalTest(req: Request, res: Response): boolean {
  const configuredKey = process.env.LOCAL_TEST_KEY;
  if (!configuredKey) {
    res.status(503).json({
      ok: false,
      error: "LOCAL_TEST_KEY is not configured. Set it before using test endpoints."
    });
    return false;
  }

  const candidate =
    req.header("x-test-key") ||
    (typeof req.query.key === "string" ? req.query.key : undefined) ||
    (typeof req.body?.key === "string" ? req.body.key : undefined);

  if (!candidate || candidate !== configuredKey) {
    res.status(401).json({ ok: false, error: "Unauthorized test key" });
    return false;
  }
  return true;
}

function getUserLineId(userData: FirebaseFirestore.DocumentData, userId: string): string {
  const lineUserId = userData.lineUserId;
  if (typeof lineUserId === "string" && lineUserId.trim().length > 0) {
    return lineUserId;
  }
  return userId;
}

export const healthCheck = onRequest(
  { region: "asia-southeast1", memory: "128MiB" },
  async (_req: Request, res: Response) => {
    res.status(200).json({
      ok: true,
      service: "namo-care-functions",
      time: new Date().toISOString(),
      env: {
        hasLineChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
        hasLineAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
        hasLocalTestKey: Boolean(process.env.LOCAL_TEST_KEY)
      }
    });
  }
);

export const seedCaregiverLink = onRequest(
  { region: "asia-southeast1", memory: "128MiB" },
  async (req: Request, res: Response) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res)) return;

    const body = getJsonBody<LinkBody>(req);
    const userId = body.userId?.trim();
    const caregiverLineUserId = body.caregiverLineUserId?.trim();

    if (!userId || !caregiverLineUserId) {
      res.status(400).json({
        ok: false,
        error: "Missing required fields: userId, caregiverLineUserId"
      });
      return;
    }

    await ensureUser(db, { userId });
    const caregiverId = caregiverLineUserId;

    await db.collection("caregivers").doc(caregiverId).set(
      {
        lineUserId: caregiverLineUserId,
        displayName: body.caregiverDisplayName || "Caregiver",
        relationship: body.relationship || "family",
        linkedUserIds: FieldValue.arrayUnion(userId),
        alertPreferences: {
          emergency: true,
          medication: true,
          inactivity: true,
          emotion: true,
          dailySummary: true,
          summaryTime: "21:00"
        },
        registeredAt: Timestamp.now()
      },
      { merge: true }
    );

    await db.collection("users").doc(userId).set(
      {
        caregiverIds: FieldValue.arrayUnion(caregiverId),
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );

    res.status(200).json({
      ok: true,
      userId,
      caregiverId
    });
  }
);

export const testMedicationReminder = onRequest(
  { region: "asia-southeast1", memory: "256MiB" },
  async (req: Request, res: Response) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res)) return;

    const body = getJsonBody<ReminderBody>(req);
    const userId = body.userId?.trim();
    if (!userId) {
      res.status(400).json({ ok: false, error: "Missing required field: userId" });
      return;
    }

    const medicationName = body.medicationName || "ยาประจำวัน";
    const dosage = body.dosage || "1 เม็ด";
    const scheduledTime = body.scheduledTime || "08:00";

    await ensureUser(db, { userId });
    const userSnapshot = await db.collection("users").doc(userId).get();
    const userData = userSnapshot.data() || {};
    const lineUserId = getUserLineId(userData, userId);
    const lineClient = getLineClient();

    const message =
      `🔔 ถึงเวลากินยาแล้วนะคะ\n` +
      `ยา: ${medicationName} ${dosage}\n` +
      `เวลา: ${scheduledTime}\n` +
      `ตอบว่า "กินยาแล้ว" ได้เลยค่ะ`;

    await pushText(lineClient, lineUserId, message);

    const logRef = db.collection("remindersLog").doc();
    await logRef.set({
      userId,
      scheduleId: null,
      type: "medication",
      scheduledAt: Timestamp.now(),
      sentAt: Timestamp.now(),
      status: "pending",
      confirmedAt: null,
      followUpCount: 0,
      alertedCaregiver: false,
      updatedAt: Timestamp.now(),
      metadata: {
        medicationName,
        dosage,
        scheduledTime,
        trigger: "manual_test_endpoint"
      }
    });

    res.status(200).json({
      ok: true,
      userId,
      lineUserId,
      remindersLogId: logRef.id
    });
  }
);

export const testCaregiverAlert = onRequest(
  { region: "asia-southeast1", memory: "256MiB" },
  async (req: Request, res: Response) => {
    if (!assertPost(req, res) || !authorizeLocalTest(req, res)) return;

    const body = getJsonBody<AlertBody>(req);
    const userId = body.userId?.trim();
    if (!userId) {
      res.status(400).json({ ok: false, error: "Missing required field: userId" });
      return;
    }

    const lineClient = getLineClient();
    const alertId = await dispatchCaregiverAlert(
      { db, lineClient },
      {
        userId,
        type: body.type || "emotion",
        severity: body.severity || "medium",
        title: body.title || "Manual test alert",
        detail: body.detail || "This is a local-test alert from NaMo Care Companion."
      }
    );

    res.status(200).json({
      ok: true,
      userId,
      alertId
    });
  }
);
