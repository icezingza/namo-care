"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeEvent = routeEvent;
const firebase_functions_1 = require("firebase-functions");
const emergencyKeywords_1 = require("../utils/emergencyKeywords");
const firestoreService_1 = require("../services/firestoreService");
const lineService_1 = require("../services/lineService");
const emergencyHandler_1 = require("../handlers/emergencyHandler");
const messageHandler_1 = require("../handlers/messageHandler");
async function handleFollowEvent(ctx, event) {
    if (!("userId" in event.source) || !event.source.userId)
        return;
    const userId = event.source.userId;
    const profile = await (0, lineService_1.getLineProfile)(ctx.lineClient, userId);
    await (0, firestoreService_1.ensureUser)(ctx.db, { userId, displayName: profile.displayName });
    await (0, lineService_1.replyText)(ctx.lineClient, event.replyToken, "Welcome to NaMo Care Companion. I am here to support daily wellbeing and reminders.");
}
async function handleTextMessageEvent(ctx, event) {
    if (event.message.type !== "text")
        return;
    if (!("userId" in event.source) || !event.source.userId)
        return;
    const userId = event.source.userId;
    const text = event.message.text.trim();
    const profile = await (0, lineService_1.getLineProfile)(ctx.lineClient, userId);
    await (0, firestoreService_1.ensureUser)(ctx.db, { userId, displayName: profile.displayName });
    await (0, firestoreService_1.touchLastActive)(ctx.db, userId);
    const emergency = (0, emergencyKeywords_1.detectEmergencyKeyword)(text);
    if (emergency.matched) {
        await (0, emergencyHandler_1.handleEmergencyMessage)(ctx, userId, event.replyToken, text);
        return;
    }
    await (0, messageHandler_1.handleUserMessage)(ctx, userId, event.replyToken, text);
}
async function routeEvent(ctx, event) {
    switch (event.type) {
        case "follow":
            await handleFollowEvent(ctx, event);
            return;
        case "message":
            await handleTextMessageEvent(ctx, event);
            return;
        default:
            firebase_functions_1.logger.debug("Ignoring unsupported LINE event", { type: event.type });
    }
}
//# sourceMappingURL=eventRouter.js.map