"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEnv = requireEnv;
exports.optionalEnv = optionalEnv;
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function optionalEnv(name, fallback) {
    return process.env[name] || fallback;
}
//# sourceMappingURL=config.js.map