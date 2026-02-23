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
exports.lineWebhook = void 0;
const line = __importStar(require("@line/bot-sdk"));
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const lineService_1 = require("../services/lineService");
const eventRouter_1 = require("./eventRouter");
const bootstrap_1 = require("../bootstrap");
function getRawBody(req) {
    const rawBody = req.rawBody;
    if (!rawBody)
        return "";
    if (typeof rawBody === "string")
        return rawBody;
    return rawBody.toString("utf8");
}
function hasValidSignature(req, channelSecret) {
    const signature = req.header("x-line-signature") || "";
    const rawBody = getRawBody(req);
    if (!rawBody || !signature)
        return false;
    return line.validateSignature(rawBody, channelSecret, signature);
}
exports.lineWebhook = (0, https_1.onRequest)({
    region: "asia-southeast1",
    timeoutSeconds: 60,
    memory: "256MiB"
}, async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    let channelSecret;
    let lineClient;
    try {
        channelSecret = (0, lineService_1.getLineChannelSecret)();
        lineClient = (0, lineService_1.getLineClient)();
    }
    catch (error) {
        firebase_functions_1.logger.error("LINE env config is missing", {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).send("Server Misconfigured");
        return;
    }
    if (!hasValidSignature(req, channelSecret)) {
        res.status(401).send("Unauthorized");
        return;
    }
    const body = req.body;
    const events = body?.events || [];
    try {
        await Promise.all(events.map((event) => (0, eventRouter_1.routeEvent)({ db: bootstrap_1.db, lineClient }, event)));
        res.status(200).send("OK");
    }
    catch (error) {
        firebase_functions_1.logger.error("Webhook processing failed", {
            error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).send("Webhook Error");
    }
});
//# sourceMappingURL=lineWebhook.js.map