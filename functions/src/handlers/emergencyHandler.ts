import type { AppContext } from "../types";
import { dispatchCaregiverAlert } from "../notifications/alertDispatcher";
import { replyText } from "../services/lineService";

const EMERGENCY_REPLY =
  "หนูได้ยินแล้วนะคะ 🙏 กำลังแจ้งผู้ดูแลให้รับทราบทันทีเลยค่ะ\nถ้าต้องการความช่วยเหลือเร่งด่วน โทร 1669 ได้เลยนะคะ 🚑";

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
    title: "พบคำขอความช่วยเหลือฉุกเฉิน",
    detail: `ผู้สูงอายุส่งข้อความฉุกเฉิน กรุณาติดต่อกลับทันที`,
    sourceMessage: originalMessage
  });

  await replyText(ctx.lineClient, replyToken, EMERGENCY_REPLY);
}

