"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLineChannelSecret = getLineChannelSecret;
exports.getLineClient = getLineClient;
exports.replyText = replyText;
exports.pushText = pushText;
exports.pushFlexMessage = pushFlexMessage;
exports.getLineProfile = getLineProfile;
const line = __importStar(require("@line/bot-sdk"));
const config_1 = require("../config");
let cachedClient = null;
function getLineChannelSecret() {
    return (0, config_1.requireEnv)("LINE_CHANNEL_SECRET");
}
function getLineClient() {
    if (cachedClient)
        return cachedClient;
    cachedClient = new line.messagingApi.MessagingApiClient({
        channelAccessToken: (0, config_1.requireEnv)("LINE_CHANNEL_ACCESS_TOKEN")
    });
    return cachedClient;
}
async function replyText(client, replyToken, text) {
    await client.replyMessage({
        replyToken,
        messages: [{ type: "text", text }]
    });
}
async function pushText(client, to, text) {
    await client.pushMessage({
        to,
        messages: [{ type: "text", text }]
    });
}
async function pushFlexMessage(client, to, altText, 
// Use unknown to avoid LINE SDK internal type divergence between dist/types and dist/messaging-api
contents) {
    const msg = { type: "flex", altText, contents: contents };
    await client.pushMessage({ to, messages: [msg] });
}
async function getLineProfile(client, userId) {
    try {
        const profile = await client.getProfile(userId);
        return { displayName: profile.displayName };
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=lineService.js.map