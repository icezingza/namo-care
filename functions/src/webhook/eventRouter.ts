import type { FollowEvent, MessageEvent, WebhookEvent } from "@line/bot-sdk";
import { logger } from "firebase-functions";
import type { AppContext } from "../types";
import { detectEmergencyKeyword } from "../utils/emergencyKeywords";
import { ensureUser, touchLastActive } from "../services/firestoreService";
import { getLineProfile, replyText } from "../services/lineService";
import { handleEmergencyMessage } from "../handlers/emergencyHandler";
import { handleUserMessage } from "../handlers/messageHandler";

async function handleFollowEvent(ctx: AppContext, event: FollowEvent): Promise<void> {
  if (!("userId" in event.source) || !event.source.userId) return;
  const userId = event.source.userId;
  const profile = await getLineProfile(ctx.lineClient, userId);
  await ensureUser(ctx.db, { userId, displayName: profile.displayName });
  await replyText(
    ctx.lineClient,
    event.replyToken,
    "Welcome to NaMo Care Companion. I am here to support daily wellbeing and reminders."
  );
}

async function handleTextMessageEvent(
  ctx: AppContext,
  event: MessageEvent
): Promise<void> {
  if (event.message.type !== "text") return;
  if (!("userId" in event.source) || !event.source.userId) return;

  const userId = event.source.userId;
  const text = event.message.text.trim();
  const profile = await getLineProfile(ctx.lineClient, userId);
  await ensureUser(ctx.db, { userId, displayName: profile.displayName });
  await touchLastActive(ctx.db, userId);

  const emergency = detectEmergencyKeyword(text);
  if (emergency.matched) {
    await handleEmergencyMessage(ctx, userId, event.replyToken, text);
    return;
  }

  await handleUserMessage(ctx, userId, event.replyToken, text);
}

export async function routeEvent(ctx: AppContext, event: WebhookEvent): Promise<void> {
  switch (event.type) {
    case "follow":
      await handleFollowEvent(ctx, event);
      return;
    case "message":
      await handleTextMessageEvent(ctx, event);
      return;
    default:
      logger.debug("Ignoring unsupported LINE event", { type: event.type });
  }
}
