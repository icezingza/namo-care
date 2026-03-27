import * as line from "@line/bot-sdk";
import { requireEnv } from "../config";

let cachedClient: line.messagingApi.MessagingApiClient | null = null;

export function getLineChannelSecret(): string {
  return requireEnv("LINE_CHANNEL_SECRET");
}

export function getLineClient(): line.messagingApi.MessagingApiClient {
  if (cachedClient) return cachedClient;
  cachedClient = new line.messagingApi.MessagingApiClient({
    channelAccessToken: requireEnv("LINE_CHANNEL_ACCESS_TOKEN")
  });
  return cachedClient;
}

export async function replyText(
  client: line.messagingApi.MessagingApiClient,
  replyToken: string,
  text: string
): Promise<void> {
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }]
  });
}

export async function pushText(
  client: line.messagingApi.MessagingApiClient,
  to: string,
  text: string
): Promise<void> {
  await client.pushMessage({
    to,
    messages: [{ type: "text", text }]
  });
}

export async function pushFlexMessage(
  client: line.messagingApi.MessagingApiClient,
  to: string,
  altText: string,
  // Use unknown to avoid LINE SDK internal type divergence between dist/types and dist/messaging-api
  contents: unknown
): Promise<void> {
  type PushBody = Parameters<typeof client.pushMessage>[0];
  type FlexMsg = Extract<PushBody["messages"][number], { type: "flex" }>;
  const msg: FlexMsg = { type: "flex", altText, contents: contents as FlexMsg["contents"] };
  await client.pushMessage({ to, messages: [msg] });
}

export async function getLineProfile(
  client: line.messagingApi.MessagingApiClient,
  userId: string
): Promise<{ displayName?: string }> {
  try {
    const profile = await client.getProfile(userId);
    return { displayName: profile.displayName };
  } catch {
    return {};
  }
}
