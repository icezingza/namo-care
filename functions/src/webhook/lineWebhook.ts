import type { Request, Response } from "express";
import * as line from "@line/bot-sdk";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { getLineChannelSecret, getLineClient } from "../services/lineService";
import { routeEvent } from "./eventRouter";
import { db } from "../bootstrap";

function getRawBody(req: Request): string {
  const rawBody = (req as Request & { rawBody?: Buffer | string }).rawBody;
  if (!rawBody) return "";
  if (typeof rawBody === "string") return rawBody;
  return rawBody.toString("utf8");
}

function hasValidSignature(req: Request, channelSecret: string): boolean {
  const signature = req.header("x-line-signature") || "";
  const rawBody = getRawBody(req);
  if (!rawBody || !signature) return false;
  return line.validateSignature(rawBody, channelSecret, signature);
}

export const lineWebhook = onRequest(
  {
    region: "asia-southeast1",
    timeoutSeconds: 60,
    memory: "256MiB"
  },
  async (req: Request, res: Response) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    let channelSecret: string;
    let lineClient: line.messagingApi.MessagingApiClient;
    try {
      channelSecret = getLineChannelSecret();
      lineClient = getLineClient();
    } catch (error) {
      logger.error("LINE env config is missing", {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).send("Server Misconfigured");
      return;
    }

    if (!hasValidSignature(req, channelSecret)) {
      res.status(401).send("Unauthorized");
      return;
    }

    const body = req.body as { events?: line.WebhookEvent[] } | undefined;
    const events = body?.events || [];

    try {
      await Promise.all(events.map((event) => routeEvent({ db, lineClient }, event)));
      res.status(200).send("OK");
    } catch (error) {
      logger.error("Webhook processing failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).send("Webhook Error");
    }
  }
);
