import type { AppContext } from "../types";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { replyText } from "../services/lineService";

const EMERGENCY_REPLY =
  "I hear you. I am notifying your caregiver now. If this is urgent, please call 1669 immediately.";

export async function handleEmergencyMessage(
  ctx: AppContext,
  userId: string,
  replyToken: string,
  originalMessage: string
): Promise<void> {
  await dispatchCaregiverAlert(ctx, {
    userId,
    type: "emergency",
    severity: "critical",
    title: "Emergency keyword detected",
    detail: `Emergency message: "${originalMessage}"`,
    sourceMessage: originalMessage
  });

  await replyText(ctx.lineClient, replyToken, EMERGENCY_REPLY);
}
